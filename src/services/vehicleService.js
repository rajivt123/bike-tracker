// src/services/vehicleService.js
import { supabase } from '../lib/supabase';

export const vehicleService = {
  async getVehicles(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[vehicleService] Error fetching vehicles:', error);
      throw error;
    }
    return data || [];
  },

  async getActiveVehicle(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[vehicleService] Error fetching active vehicle:', error);
      throw error;
    }
    return data;
  },

  async createVehicle(userId, vehicleData) {
    if (!userId) throw new Error('User ID is required');

    // Check if this is the user's first vehicle; if so, make it active
    const { count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const isFirst = (count || 0) === 0;

    const payload = {
      user_id: userId,
      name: vehicleData.name || 'My Motorcycle',
      registration_number: vehicleData.registration_number || vehicleData.regNumber || '',
      make: vehicleData.make || '',
      model: vehicleData.model || '',
      model_year: vehicleData.model_year ? parseInt(vehicleData.model_year, 10) : null,
      current_odometer_km: parseFloat(vehicleData.current_odometer_km || vehicleData.odometer || 0),
      is_active: vehicleData.is_active !== undefined ? vehicleData.is_active : isFirst,
    };

    const { data, error } = await supabase
      .from('vehicles')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('[vehicleService] Error creating vehicle:', error);
      throw error;
    }

    // Also initialize default vehicle_service_settings (interval 2000 km)
    try {
      await supabase.from('vehicle_service_settings').upsert({
        vehicle_id: data.id,
        user_id: userId,
        interval_km: 2000,
        last_service_odometer_km: data.current_odometer_km || 0,
      });
    } catch (settingErr) {
      console.warn('[vehicleService] Could not initialize service settings:', settingErr);
    }

    return data;
  },

  async updateVehicle(vehicleId, updates) {
    if (!vehicleId) throw new Error('Vehicle ID is required');
    const { data, error } = await supabase
      .from('vehicles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('[vehicleService] Error updating vehicle:', error);
      throw error;
    }
    return data;
  },

  async setActiveVehicle(userId, vehicleId) {
    if (!userId || !vehicleId) throw new Error('User ID and Vehicle ID are required');

    // Set all other vehicles to inactive
    await supabase
      .from('vehicles')
      .update({ is_active: false })
      .eq('user_id', userId);

    // Set target vehicle to active
    const { data, error } = await supabase
      .from('vehicles')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('[vehicleService] Error activating vehicle:', error);
      throw error;
    }
    return data;
  },

  async updateOdometer(vehicleId, newOdometerKm) {
    if (!vehicleId) throw new Error('Vehicle ID is required');
    const km = parseFloat(newOdometerKm);
    if (isNaN(km)) return;

    const { data, error } = await supabase
      .from('vehicles')
      .update({
        current_odometer_km: km,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vehicleId)
      .select()
      .single();

    if (error) {
      console.error('[vehicleService] Error updating vehicle odometer:', error);
      throw error;
    }
    return data;
  },

  async deleteVehicle(vehicleId) {
    if (!vehicleId) throw new Error('Vehicle ID is required');
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (error) {
      console.error('[vehicleService] Error deleting vehicle:', error);
      throw error;
    }
    return true;
  },
};
