// src/services/speedometerService.js
import { calculateDistanceHaversine } from './gpsService';

export class SpeedometerTracker {
  constructor(options = {}) {
    this.alpha = options.smoothingAlpha || 0.65; // Smoothing factor (0 to 1)
    this.reset();
  }

  reset() {
    this.previousPosition = null;
    this.previousTimestamp = null;
    this.currentSpeed = 0;
    this.maxSpeed = 0;
    this.totalDistanceKm = 0;
    this.speedReadingsCount = 0;
    this.totalSpeedSum = 0;
  }

  processPosition(position) {
    const coords = position.coords;
    const timestamp = position.timestamp || Date.now();
    let instantSpeedKmh = 0;

    // 1. If device provides native speed (m/s)
    if (coords.speed !== null && coords.speed !== undefined && coords.speed >= 0) {
      instantSpeedKmh = coords.speed * 3.6; // Convert m/s to km/h
    } else if (this.previousPosition && this.previousTimestamp) {
      // 2. Fallback to Haversine distance / delta time
      const deltaSeconds = (timestamp - this.previousTimestamp) / 1000;
      if (deltaSeconds > 0.5) {
        const deltaKm = calculateDistanceHaversine(
          this.previousPosition.latitude,
          this.previousPosition.longitude,
          coords.latitude,
          coords.longitude
        );
        instantSpeedKmh = (deltaKm / deltaSeconds) * 3600;
      }
    }

    // Sanity check: filter out GPS teleportation anomalies > 250 km/h
    if (instantSpeedKmh > 250) {
      instantSpeedKmh = this.currentSpeed;
    }

    // Zero threshold for standing still
    if (instantSpeedKmh < 1.2) {
      instantSpeedKmh = 0;
    }

    // 3. Exponential smoothing filter for stable gauge needle
    const smoothedSpeed = this.currentSpeed === 0 && instantSpeedKmh > 0
      ? instantSpeedKmh
      : (instantSpeedKmh * this.alpha) + (this.currentSpeed * (1 - this.alpha));

    this.currentSpeed = Math.round(smoothedSpeed * 10) / 10;

    // 4. Update Max Speed
    if (this.currentSpeed > this.maxSpeed) {
      this.maxSpeed = this.currentSpeed;
    }

    // 5. Update Distance Traveled
    if (this.previousPosition) {
      const distanceStep = calculateDistanceHaversine(
        this.previousPosition.latitude,
        this.previousPosition.longitude,
        coords.latitude,
        coords.longitude
      );
      // Ignore tiny jitter if standing still (< 3 meters)
      if (distanceStep > 0.003) {
        this.totalDistanceKm += distanceStep;
      }
    }

    // 6. Running average speed
    if (this.currentSpeed > 0) {
      this.speedReadingsCount += 1;
      this.totalSpeedSum += this.currentSpeed;
    }

    this.previousPosition = {
      latitude: coords.latitude,
      longitude: coords.longitude,
    };
    this.previousTimestamp = timestamp;

    return {
      currentSpeedKmh: this.currentSpeed,
      maxSpeedKmh: this.maxSpeed,
      avgSpeedKmh: this.speedReadingsCount > 0 ? Math.round((this.totalSpeedSum / this.speedReadingsCount) * 10) / 10 : 0,
      totalDistanceKm: Math.round(this.totalDistanceKm * 100) / 100,
      latitude: coords.latitude,
      longitude: coords.longitude,

      accuracy: coords.accuracy,
    };
  }
}

export const speedometerService = {
  createTracker(options) {
    return new SpeedometerTracker(options);
  }
};
