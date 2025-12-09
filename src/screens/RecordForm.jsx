// src/screens/RecordForm.jsx
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, AlertCircle, Calendar, IndianRupee, Gauge, RefreshCw, Save } from 'lucide-react';

const RecordForm = ({ onSave, onCancel, initialData, lastRecord, allRecords, isEditMode = false, onDelete }) => {
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    rate: initialData?.rate || (lastRecord ? lastRecord.rate : ''),
    amount: initialData?.amount || '',
    oldReading: initialData?.oldReading || (lastRecord ? lastRecord.newReading : ''),
    newReading: initialData?.newReading || '',
  });
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [calculations, setCalculations] = useState({
    quantity: 0,
    totalDriven: 0,
    mileage: 0,
    ratePerKm: 0
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  useEffect(() => {
    const amount = parseFloat(formData.amount) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const oldRead = parseFloat(formData.oldReading) || 0;
    const newRead = parseFloat(formData.newReading) || 0;
    
    const quantity = rate > 0 ? (amount / rate) : 0;
    const totalDriven = newRead > oldRead ? (newRead - oldRead) : 0;
    const mileage = quantity > 0 ? (totalDriven / quantity) : 0;
    const ratePerKm = totalDriven > 0 ? (amount / totalDriven) : 0;

    setCalculations({
      quantity: quantity.toFixed(2),
      totalDriven: totalDriven.toFixed(1),
      mileage: mileage.toFixed(2),
      ratePerKm: ratePerKm.toFixed(2)
    });
  }, [formData]);

  const validateRecord = () => {
    const currentNewReading = parseFloat(formData.newReading);
    const currentOldReading = parseFloat(formData.oldReading);
    const currentDate = formData.date;

    const otherRecords = isEditMode
      ? allRecords.filter(r => r.id !== initialData.id)
      : allRecords;

    const sortedRecords = [...otherRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
    const futureRecord = sortedRecords.find(r => r.date > currentDate);
    const pastRecord = [...sortedRecords].reverse().find(r => r.date < currentDate);

    if (futureRecord && currentNewReading >= parseFloat(futureRecord.oldReading)) {
      return `Logic Error: New reading (${currentNewReading}) on ${currentDate} cannot exceed future start reading (${futureRecord.oldReading}) on ${futureRecord.date}.`;
    }
    if (pastRecord && currentOldReading < parseFloat(pastRecord.newReading)) {
      return `Logic Error: Old reading (${currentOldReading}) on ${currentDate} cannot be less than previous end reading (${pastRecord.newReading}) on ${pastRecord.date}.`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.newReading) return;
    
    const validationError = validateRecord();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    onSave({
      id: isEditMode ? initialData.id : Date.now(),
      ...formData,
      ...calculations
    });
  };

  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white border-b border-slate-100 p-4 pt-10 flex items-center justify-between sticky top-0 z-20">
        <button onClick={onCancel} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-bold text-lg text-slate-800">
          {isEditMode ? 'Edit Record' : 'New Fuel Record'}
        </h2>
        {isEditMode ? (
          <button onClick={() => onDelete(initialData.id)} className="p-2 text-red-500 bg-red-50 rounded-full hover:bg-red-100">
            <Trash2 size={20} />
          </button>
        ) : (
          <div className="w-10"></div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
            <div className="relative">
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-800"
              />
              <Calendar size={18} className="absolute left-3 top-3.5 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  name="amount"
                  placeholder="0"
                  value={formData.amount}
                  onChange={handleChange}
                  className="w-full bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 pl-8 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-lg text-slate-800"
                  autoFocus={!isEditMode}
                />
                <IndianRupee size={16} className="absolute left-3 top-4 text-emerald-600 font-bold" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rate / L</label>
              <input
                type="number"
                name="rate"
                placeholder="Rate"
                value={formData.rate}
                onChange={handleChange}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center border border-slate-100">
            <span className="text-sm text-slate-500 font-medium">Quantity (Liters)</span>
            <span className="font-mono font-bold text-slate-800">{calculations.quantity} L</span>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Old Meter Reading</label>
              <div className="relative">
                <input
                  type="number"
                  name="oldReading"
                  value={formData.oldReading}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800"
                />
                <Gauge size={18} className="absolute left-3 top-3.5 text-slate-400" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-600 uppercase tracking-wider">New Meter Reading</label>
              <div className="relative">
                <input
                  type="number"
                  name="newReading"
                  placeholder="Current ODO"
                  value={formData.newReading}
                  onChange={handleChange}
                  className="w-full bg-blue-50/50 border border-blue-100 rounded-xl p-3 pl-10 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-slate-800"
                />
                <Gauge size={18} className="absolute left-3 top-3.5 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-slate-800 text-white rounded-xl p-4 space-y-3 shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">Total Driven</span>
              <span className="font-bold text-xl">{calculations.totalDriven} <span className="text-sm font-normal text-slate-400">km</span></span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-700 pt-2">
              <span className="text-orange-300 text-sm">Mileage</span>
              <span className="font-bold text-xl text-orange-400">{calculations.mileage} <span className="text-sm font-normal text-orange-400/70">km/L</span></span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-700 pt-2">
              <span className="text-purple-300 text-sm">Cost / Km</span>
              <div className="flex items-center gap-1">
                <IndianRupee size={14} className="text-purple-400" />
                <span className="font-bold text-xl text-purple-400">{calculations.ratePerKm}</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSyncing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isSyncing ? (
              <>
                <RefreshCw size={20} className="animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Save size={20} />
                {isEditMode ? 'Update Record' : 'Save Record'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecordForm;