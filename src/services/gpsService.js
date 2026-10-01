// src/services/gpsService.js

/**
 * Calculates Haversine distance between two coordinates in kilometers
 */
export const calculateDistanceHaversine = (lat1, lon1, lat2, lon2) => {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Earth radius in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const gpsService = {
  isSupported() {
    return 'geolocation' in navigator;
  },

  startGpsWatch(onPosition, onError, options = {}) {
    if (!this.isSupported()) {
      onError?.(new Error('Geolocation is not supported by your browser/device.'));
      return null;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000,
      ...options,
    };

    return navigator.geolocation.watchPosition(
      (pos) => {
        // Discard low-accuracy readings (e.g. > 45 meters) to prevent GPS noise
        if (pos.coords.accuracy > 45) {
          return;
        }
        onPosition(pos);
      },
      (err) => {
        console.warn('[gpsService] Geolocation error:', err);
        onError?.(err);
      },
      defaultOptions
    );
  },

  stopGpsWatch(watchId) {
    if (watchId !== null && watchId !== undefined && this.isSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
  },

  getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        return reject(new Error('Geolocation is not supported.'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
        ...options,
      });
    });
  }
};
