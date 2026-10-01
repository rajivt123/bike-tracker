// src/screens/TripsScreen.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { gpsService } from '../services/gpsService';
import { speedometerService } from '../services/speedometerService';
import { tripService } from '../services/tripService';
import { 
  Gauge, 
  Play, 
  Square, 
  Trash2, 
  Compass, 
  Clock, 
  Activity, 
  AlertTriangle, 
  Navigation,
  Flame,
  ChevronLeft,
  XCircle,
  RotateCcw
} from 'lucide-react';

export default function TripsScreen({ onBack }) {
  const { user } = useAuth();
  const { 
    activeVehicle, 
    trips, 
    activeTrip, 
    startTrip, 
    completeTrip, 
    discardTrip, 
    deleteTrip 
  } = useAppData();

  const [isRecording, setIsRecording] = useState(false);
  const [telemetry, setTelemetry] = useState({
    currentSpeedKmh: 0,
    maxSpeedKmh: 0,
    avgSpeedKmh: 0,
    totalDistanceKm: 0,
    heading: null,
    accuracy: null,
  });
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [gpsError, setGpsError] = useState(null);

  // References for live tracking
  const watchIdRef = useRef(null);
  const trackerRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const currentTripRecordRef = useRef(null);
  const bufferedPointsRef = useRef([]);
  const pointSeqRef = useRef(0);
  const isUploadingRef = useRef(false);

  // Helper to stop tracking and clear GPS watch
  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      gpsService.stopGpsWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  /**
   * Safe in-memory point flush with concurrency guard.
   * Only removes points from bufferedPointsRef.current that were successfully persisted to Supabase.
   */
  const flushBufferedPoints = async (tripId, userId) => {
    if (!tripId || !userId) return;
    if (isUploadingRef.current) return;
    if (bufferedPointsRef.current.length === 0) return;

    isUploadingRef.current = true;
    // 1. Take an immutable snapshot of current points to upload
    const pointsToUpload = [...bufferedPointsRef.current];
    const uploadedSeqNos = new Set(pointsToUpload.map((p) => p.sequence_no));

    try {
      await tripService.recordTripPoints(tripId, userId, pointsToUpload);
      // 2. ONLY AFTER SUCCESS: Remove exactly the successfully uploaded points
      bufferedPointsRef.current = bufferedPointsRef.current.filter(
        (p) => !uploadedSeqNos.has(p.sequence_no)
      );
    } catch (err) {
      console.warn('[TripsScreen] Batch point upload failed (points retained in memory for retry):', err);
      throw err;
    } finally {
      isUploadingRef.current = false;
    }
  };

  // Clean up GPS watch and timer when component unmounts
  useEffect(() => {
    return () => {
      stopLiveTracking();
    };
  }, []);

  // Section 10: ACTIVE TRIP SAFETY & RECOVERY
  // Synchronize trip reference when activeTrip changes
  useEffect(() => {
    if (activeTrip && !isRecording) {
      currentTripRecordRef.current = activeTrip;
    }
  }, [activeTrip, isRecording]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${hrs}h ${remMins}m ${secs}s`;
    }
    return `${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTripHandler = async () => {
    if (!activeVehicle?.id || !user) {
      alert('Please configure or select a vehicle first.');
      return;
    }

    setGpsError(null);
    trackerRef.current = speedometerService.createTracker();
    bufferedPointsRef.current = [];
    pointSeqRef.current = 0;

    try {
      // 1. Get initial GPS coordinate
      let startCoords = null;
      try {
        const initPos = await gpsService.getCurrentPosition();
        startCoords = {
          latitude: initPos.coords.latitude,
          longitude: initPos.coords.longitude,
        };
      } catch (posErr) {
        console.warn('[TripsScreen] Initial GPS position query skipped:', posErr);
      }

      // 2. Insert or recover in_progress trip in Supabase (preventing duplicate active trips)
      const trip = await startTrip(startCoords);
      currentTripRecordRef.current = trip;

      // 3. Start timer
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(trip.start_time).getTime()) / 1000));
      setDurationSeconds(elapsed);
      timerIntervalRef.current = setInterval(() => {
        setDurationSeconds((prev) => prev + 1);
      }, 1000);

      // 4. Start GPS watchPosition
      const watchId = gpsService.startGpsWatch(
        (pos) => {
          if (!trackerRef.current) return;
          const stats = trackerRef.current.processPosition(pos);
          setTelemetry(stats);

          // Buffer GPS point
          pointSeqRef.current += 1;
          bufferedPointsRef.current.push({
            sequence_no: pointSeqRef.current,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed_kmh: stats.currentSpeedKmh,
            heading: pos.coords.heading,
            accuracy_meters: pos.coords.accuracy,
            recorded_at: new Date().toISOString(),
          });

          // Flush points in batches of 10
          if (
            bufferedPointsRef.current.length >= 10 &&
            currentTripRecordRef.current?.id &&
            !isUploadingRef.current
          ) {
            flushBufferedPoints(currentTripRecordRef.current.id, user.id).catch((e) => {
              console.warn('[TripsScreen] In-flight batch upload deferred:', e);
            });
          }
        },
        (err) => {
          setGpsError(`GPS signal issue: ${err.message || 'Signal lost'}`);
          // If fatal GPS permission denial, stop watch immediately
          if (err.code === 1) {
            stopLiveTracking();
            setIsRecording(false);
          }
        }
      );

      watchIdRef.current = watchId;
      setIsRecording(true);
    } catch (err) {
      console.error('[TripsScreen] Error starting trip:', err);
      setGpsError(err.message || 'Failed to start trip recording.');
      stopLiveTracking();
    }
  };

  const stopTripHandler = async () => {
    const tripId = currentTripRecordRef.current?.id || activeTrip?.id;
    if (!tripId) return;

    // 1. Stop GPS watcher first so no new points enter buffer
    stopLiveTracking();

    try {
      // 2. Wait for any in-flight batch upload to settle
      while (isUploadingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // 3. Flush all remaining buffered points
      if (bufferedPointsRef.current.length > 0 && user) {
        await flushBufferedPoints(tripId, user.id);
      }

      // 4. Verify no unpersisted points remain
      if (bufferedPointsRef.current.length > 0) {
        throw new Error(
          `${bufferedPointsRef.current.length} point(s) could not be uploaded to cloud due to network failure.`
        );
      }

      // 5. Complete trip in Supabase via AppDataContext
      const finalStats = {
        distance_km: telemetry.totalDistanceKm,
        duration_seconds: durationSeconds,
        avg_speed_kmh: telemetry.avgSpeedKmh,
        max_speed_kmh: telemetry.maxSpeedKmh,
      };

      let endCoords = null;
      if (telemetry.latitude && telemetry.longitude) {
        endCoords = {
          latitude: telemetry.latitude,
          longitude: telemetry.longitude,
        };
      }

      await completeTrip(finalStats, endCoords);
      setIsRecording(false);
      currentTripRecordRef.current = null;
    } catch (err) {
      console.error('[TripsScreen] Error completing trip:', err);
      setGpsError(
        `Trip completion pending: ${err.message}. ${bufferedPointsRef.current.length} point(s) preserved in memory. Tap "Stop & Save Telemetry" again when connection restores.`
      );
      alert(
        `Could not finalize trip in cloud: ${err.message}\n\nYour ${bufferedPointsRef.current.length} trip point(s) are safely preserved in memory. Please ensure your network connection is active and tap "Stop & Save Telemetry" again to retry.`
      );
    }
  };

  const cancelTripHandler = async () => {
    if (window.confirm('Discard active trip? All GPS points for this session will be removed.')) {
      stopLiveTracking();
      setIsRecording(false);
      currentTripRecordRef.current = null;
      bufferedPointsRef.current = [];
      await discardTrip();
      setDurationSeconds(0);
      setTelemetry({
        currentSpeedKmh: 0,
        maxSpeedKmh: 0,
        avgSpeedKmh: 0,
        totalDistanceKm: 0,
        heading: null,
        accuracy: null,
      });
    }
  };

  // Speedometer Gauge Math (Max 140 KM/H on dial)
  const maxDialSpeed = 140;
  const speedPercentage = Math.min(Math.max((telemetry.currentSpeedKmh / maxDialSpeed) * 100, 0), 100);
  const strokeDash = 220;
  const strokeOffset = strokeDash - (strokeDash * (speedPercentage / 100));

  return (
    <div className="flex-1 flex flex-col bg-slate-100 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 overflow-y-auto pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="p-4 md:p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <ChevronLeft size={16} /> Cockpit
          </button>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Activity size={13} /> Live GPS Speedometer
          </div>
        </div>

        {/* GPS Warning if error */}
        {gpsError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{gpsError}</span>
          </div>
        )}

        {/* Active Trip Recovery Notification Card */}
        {activeTrip && !isRecording && (
          <div className="mb-4 p-4 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 rounded-2xl">
                <Clock size={20} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white">Active Trip In Progress</p>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  Started at {new Date(activeTrip.start_time).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startTripHandler}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw size={14} /> Resume Live GPS
              </button>
              <button
                onClick={cancelTripHandler}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <XCircle size={14} /> Discard
              </button>
            </div>
          </div>
        )}

        {/* 1. SPEEDOMETER DIAL & LIVE TELEMETRY DISPLAY */}
        <div className="glass-panel-glow rounded-3xl p-6 md:p-8 text-center relative overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-xl mb-6">
          <div className="relative w-56 h-40 md:w-64 md:h-44 mx-auto flex flex-col items-center justify-end">
            
            {/* SVG Arc Gauge */}
            <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="speedGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="60%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                strokeLinecap="round"
                className="text-slate-200 dark:text-white/10"
              />
              <path
                d="M 20 110 A 80 80 0 0 1 180 110"
                fill="none"
                stroke="url(#speedGaugeGradient)"
                strokeWidth="12"
                strokeDasharray={strokeDash}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
              />
            </svg>

            {/* Center Digital Speed Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
              <span className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {telemetry.currentSpeedKmh.toFixed(0)}
              </span>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400">
                KM / H
              </span>
            </div>
          </div>

          {/* Recording Badge */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {isRecording ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> REC TRIP IN PROGRESS
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-bold">
                STANDBY
              </span>
            )}
          </div>

          {/* Quick Stats Grid Under Speedometer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <div className="glass-card p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <Clock size={13} className="text-cyan-500" /> Duration
              </div>
              <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
                {formatDuration(durationSeconds)}
              </p>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <Navigation size={13} className="text-emerald-500" /> Distance
              </div>
              <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
                {telemetry.totalDistanceKm.toFixed(2)} <span className="text-xs font-normal">KM</span>
              </p>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <Activity size={13} className="text-amber-500" /> Avg Speed
              </div>
              <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
                {telemetry.avgSpeedKmh.toFixed(1)} <span className="text-xs font-normal">km/h</span>
              </p>
            </div>

            <div className="glass-card p-3 rounded-2xl border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                <Flame size={13} className="text-rose-500" /> Top Speed
              </div>
              <p className="text-base font-black text-slate-900 dark:text-white font-mono mt-1">
                {telemetry.maxSpeedKmh.toFixed(0)} <span className="text-xs font-normal">km/h</span>
              </p>
            </div>
          </div>

          {/* Action CTA Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!isRecording ? (
              <button
                onClick={startTripHandler}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play size={18} fill="currentColor" /> Start Trip GPS Recording
              </button>
            ) : (
              <>
                <button
                  onClick={stopTripHandler}
                  className="px-7 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-black text-sm tracking-wide shadow-xl shadow-rose-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Square size={18} fill="currentColor" /> Stop & Save Telemetry
                </button>
                <button
                  onClick={cancelTripHandler}
                  className="px-5 py-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold text-sm tracking-wide active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle size={18} /> Discard Trip
                </button>
              </>
            )}
          </div>
        </div>

        {/* 2. SAVED COMPLETED TRIPS LIST */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Navigation size={14} className="text-emerald-500" /> Recorded Trips Journal ({trips.length})
            </h2>
          </div>

          {trips.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 text-center text-slate-400 border border-slate-200/80 dark:border-white/10">
              <div className="w-12 h-12 bg-slate-200/80 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-400">
                <Compass size={24} />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No recorded trips yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap "Start Trip" to log live distance, duration, and top speeds!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {trips.map((trip) => {
                const dateStr = trip.start_time ? new Date(trip.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date';
                return (
                  <div
                    key={trip.id}
                    className="glass-card p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between hover:border-emerald-500/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                        <Gauge size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {dateStr}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{parseFloat(trip.distance_km || 0).toFixed(2)} KM</span>
                          <span>•</span>
                          <span>{formatDuration(trip.duration_seconds || 0)}</span>
                          <span>•</span>
                          <span>Avg {parseFloat(trip.avg_speed_kmh || 0).toFixed(0)} km/h</span>
                          <span>•</span>
                          <span>Top {parseFloat(trip.max_speed_kmh || 0).toFixed(0)} km/h</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (window.confirm('Delete this trip record?')) {
                          deleteTrip(trip.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Delete trip"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
