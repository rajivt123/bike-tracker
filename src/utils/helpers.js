// src/utils/helpers.js

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(String(dateStr).replace(/-/g, '/'));
};

export const calculateStats = (records) => {
  if (!records || records.length === 0) {
    return {
      totalAmount: 0,
      totalQuantity: 0,
      totalDriven: 0,
      avgMileage: 0,
      avgRatePerKm: 0,
      count: 0
    };
  }

  const totalAmount = records.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const totalQuantity = records.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
  const totalDriven = records.reduce((sum, r) => sum + (parseFloat(r.totalDriven) || 0), 0);
  const count = records.length;

  // Avoid division by zero
  const avgMileage = totalQuantity > 0 ? (totalDriven / totalQuantity) : 0;
  const avgRatePerKm = totalDriven > 0 ? (totalAmount / totalDriven) : 0;
  
  return {
    totalAmount,
    totalQuantity,
    totalDriven,
    avgMileage,
    avgRatePerKm,
    count
  };
};

export const getDateRangeString = (records) => {
  if (!records || records.length === 0) return "No Records";
  const dates = records.map(r => parseLocalDate(r.date).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return `${minDate.toLocaleDateString('en-GB', options)} - ${maxDate.toLocaleDateString('en-GB', options)}`;
};

export const processImage = (file) => {
  return new Promise((resolve) => {
    if (!file) return resolve(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  });
};