// src/services/repairService.js
import { supabase } from '../lib/supabase';

export const repairService = {
  async getRepairs(vehicleId) {
    if (!vehicleId) return [];
    const { data, error } = await supabase
      .from('repair_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('repair_date', { ascending: false });

    if (error) {
      console.error('[repairService] Error fetching repairs:', error);
      throw error;
    }
    return data || [];
  },

  async createRepair(vehicleId, userId, payload) {
    if (!vehicleId || !userId) throw new Error('Vehicle ID and User ID required');

    const odoKm = payload.odometer_km ? parseFloat(payload.odometer_km) : null;
    const amountVal = parseFloat(payload.amount || 0);
    const repairDate = payload.repair_date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('repair_records')
      .insert([{
        vehicle_id: vehicleId,
        user_id: userId,
        odometer_km: odoKm,
        description: payload.description || 'General Repair',
        amount: amountVal,
        repair_date: repairDate,
        notes: payload.notes || '',
      }])
      .select()
      .single();

    if (error) {
      console.error('[repairService] Error creating repair record:', error);
      throw error;
    }
    return data;
  },

  async updateRepair(repairId, updates) {
    if (!repairId) throw new Error('Repair ID required');
    const { data, error } = await supabase
      .from('repair_records')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', repairId)
      .select()
      .single();

    if (error) {
      console.error('[repairService] Error updating repair:', error);
      throw error;
    }
    return data;
  },

  async deleteRepair(repairId) {
    if (!repairId) throw new Error('Repair ID required');
    const { error } = await supabase
      .from('repair_records')
      .delete()
      .eq('id', repairId);

    if (error) {
      console.error('[repairService] Error deleting repair:', error);
      throw error;
    }
    return true;
  }
};
