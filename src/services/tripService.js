// src/services/tripService.js
import { supabase } from '../lib/supabase';

export const tripService = {
  async getTrips(vehicleId) {
    if (!vehicleId) return [];
    const { data, error } = await supabase
      .from('trip_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'completed')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('[tripService] Error fetching trips:', error);
      throw error;
    }
    return data || [];
  },

  async getActiveTrip(vehicleId) {
    if (!vehicleId) return null;
    const { data, error } = await supabase
      .from('trip_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('[tripService] Error checking active trip:', error);
      throw error;
    }
    return data;
  },

  async startTrip(vehicleId, userId, startCoords = null) {
    if (!vehicleId) throw new Error('Vehicle ID required');

    // Safety check: recover existing active trip if one is already in progress
    const existingActive = await this.getActiveTrip(vehicleId);
    if (existingActive) {
      return existingActive;
    }

    const now = new Date().toISOString();
    const payload = {
      vehicle_id: vehicleId,
      started_at: now,
      status: 'active',
      distance_km: 0,
      duration_seconds: 0,
      average_speed_kmh: 0,
      max_speed_kmh: 0,
      start_lat: startCoords?.latitude || null,
      start_lng: startCoords?.longitude || null,
    };

    const { data, error } = await supabase
      .from('trip_records')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[tripService] Error starting trip:', error);
      throw error;
    }
    return data;
  },

  async recordTripPoints(tripId, userId, pointsArray) {
    if (!tripId || !pointsArray || pointsArray.length === 0) return [];

    const rows = pointsArray.map(pt => ({
      trip_id: tripId,
      sequence_no: pt.sequence_no,
      latitude: pt.latitude,
      longitude: pt.longitude,
      speed_kmh: pt.speed_kmh != null ? parseFloat(pt.speed_kmh) : null,
      accuracy_m: pt.accuracy_m != null ? parseFloat(pt.accuracy_m) : null,
      altitude_m: pt.altitude_m != null ? parseFloat(pt.altitude_m) : null,
      recorded_at: pt.recorded_at || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('trip_points')
      .insert(rows)
      .select();

    if (error) {
      console.error('[tripService] Error recording trip points:', error);
      throw error;
    }
    return data;
  },

  async completeTrip(tripId, stats, endCoords = null) {
    if (!tripId) throw new Error('Trip ID required');

    const payload = {
      status: 'completed',
      ended_at: new Date().toISOString(),
      distance_km: parseFloat(stats.distance_km || 0),
      duration_seconds: parseInt(stats.duration_seconds || 0, 10),
      average_speed_kmh: parseFloat(stats.average_speed_kmh || stats.avg_speed_kmh || 0),
      max_speed_kmh: parseFloat(stats.max_speed_kmh || 0),
      end_lat: endCoords?.latitude || null,
      end_lng: endCoords?.longitude || null,
      updated_at: new Date().toISOString(),
    };

    if (stats.route_geojson) {
      payload.route_geojson = stats.route_geojson;
    }

    const { data, error } = await supabase
      .from('trip_records')
      .update(payload)
      .eq('id', tripId)
      .select()
      .single();

    if (error) {
      console.error('[tripService] Error completing trip:', error);
      throw error;
    }
    return data;
  },

  async discardTrip(tripId) {
    if (!tripId) return;
    // Mark discarded instead of deleting records
    const { error } = await supabase
      .from('trip_records')
      .update({ status: 'discarded', updated_at: new Date().toISOString() })
      .eq('id', tripId);
    if (error) {
      console.error('[tripService] Error discarding trip:', error);
      throw error;
    }
    return true;
  },

  async getTripPoints(tripId) {
    if (!tripId) return [];
    const { data, error } = await supabase
      .from('trip_points')
      .select('*')
      .eq('trip_id', tripId)
      .order('sequence_no', { ascending: true });

    if (error) {
      console.error('[tripService] Error fetching trip points:', error);
      throw error;
    }
    return data || [];
  },

  async deleteTrip(tripId) {
    if (!tripId) throw new Error('Trip ID required');
    await supabase.from('trip_points').delete().eq('trip_id', tripId);
    const { error } = await supabase.from('trip_records').delete().eq('id', tripId);
    if (error) {
      console.error('[tripService] Error deleting trip:', error);
      throw error;
    }
    return true;
  }
};
