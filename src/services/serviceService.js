// src/services/serviceService.js
import { supabase } from '../lib/supabase';

export const serviceService = {
  async getServiceSettings(vehicleId) {
    if (!vehicleId) return null;
    const { data, error } = await supabase
      .from('vehicle_service_settings')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .maybeSingle();

    if (error) {
      console.error('[serviceService] Error fetching service settings:', error);
      throw error;
    }
    return data || { interval_km: 2000 };
  },

  async updateServiceSettings(vehicleId, userId, settings) {
    if (!vehicleId) throw new Error('Vehicle ID required');
    const { data, error } = await supabase
      .from('vehicle_service_settings')
      .upsert({
        vehicle_id: vehicleId,
        interval_km: parseInt(settings.interval_km || 2000, 10),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'vehicle_id' })
      .select()
      .single();

    if (error) {
      console.error('[serviceService] Error updating service settings:', error);
      throw error;
    }
    return data;
  },

  async getServiceRecords(vehicleId) {
    if (!vehicleId) return [];
    const { data, error } = await supabase
      .from('service_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('service_date', { ascending: false });

    if (error) {
      console.error('[serviceService] Error fetching service records:', error);
      throw error;
    }
    return data || [];
  },

  async createServiceRecord(vehicleId, userId, record) {
    if (!vehicleId) throw new Error('Vehicle ID required');

    const odoKm = parseFloat(record.odometer_km);
    const amountVal = parseFloat(record.amount || 0);
    const serviceDate = record.service_date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('service_records')
      .insert([{
        vehicle_id: vehicleId,
        odometer_km: odoKm,
        amount: amountVal,
        service_date: serviceDate,
        notes: record.notes || '',
      }])
      .select()
      .single();

    if (error) {
      console.error('[serviceService] Error creating service record:', error);
      throw error;
    }

    return data;
  },

  async deleteServiceRecord(recordId) {
    if (!recordId) throw new Error('Record ID required');
    const { error } = await supabase
      .from('service_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('[serviceService] Error deleting service record:', error);
      throw error;
    }
    return true;
  },

  calculateNextService(currentOdo = 0, serviceRecords = [], interval = 2000) {
    const cur = parseFloat(currentOdo) || 0;
    const intv = parseInt(interval, 10) || 2000;

    if (!Array.isArray(serviceRecords) || serviceRecords.length === 0) {
      return {
        hasPreviousService: false,
        nextTargetKm: null,
        remainingKm: null,
        status: 'add_first',
        intervalKm: intv,
        lastServiceOdometerKm: null,
      };
    }

    // Latest completed service record (ordered by highest odometer_km)
    const sorted = [...serviceRecords].sort(
      (a, b) => (parseFloat(b.odometer_km) || 0) - (parseFloat(a.odometer_km) || 0)
    );
    const latestServiceOdo = parseFloat(sorted[0]?.odometer_km) || 0;

    const nextTarget = latestServiceOdo + intv;
    const remainingKm = nextTarget - cur;

    let status = 'good'; // 'good' | 'due_soon' | 'overdue'
    if (remainingKm <= 0) {
      status = 'overdue';
    } else if (remainingKm <= 200) {
      status = 'due_soon';
    }

    return {
      hasPreviousService: true,
      nextTargetKm: nextTarget,
      remainingKm,
      status,
      intervalKm: intv,
      lastServiceOdometerKm: latestServiceOdo,
    };
  }
};
