// src/services/fuelService.js
import { supabase } from '../lib/supabase';

export const transformDbToUiRecord = (db) => {
  if (!db) return null;
  const dateStr = db.refill_at ? db.refill_at.split('T')[0] : '';
  const startKm = db.previous_reserve_odometer != null ? Number(db.previous_reserve_odometer) : null;
  const endKm = db.current_reserve_odometer != null ? Number(db.current_reserve_odometer) : null;
  const rateVal = db.rate_per_litre != null ? Number(db.rate_per_litre) : 0;
  const amtVal = db.amount != null ? Number(db.amount) : 0;

  const totalDriven = db.distance_km != null ? Number(db.distance_km) : (endKm && startKm ? (endKm - startKm) : 0);
  const qty = db.quantity_litres != null ? Number(db.quantity_litres) : (rateVal > 0 ? (amtVal / rateVal) : 0);
  const mileage = db.mileage_km_per_litre != null ? Number(db.mileage_km_per_litre) : (qty > 0 && totalDriven > 0 ? (totalDriven / qty) : 0);
  const ratePerKm = db.cost_per_km != null ? Number(db.cost_per_km) : (totalDriven > 0 ? (amtVal / totalDriven) : 0);

  return {
    id: db.id,
    dbId: db.id,
    vehicle_id: db.vehicle_id,
    status: db.status || 'completed',
    date: dateStr,
    refill_at: db.refill_at,
    fuel_datetime: db.refill_at, // backward compat alias

    previous_reserve_odometer: startKm,
    current_reserve_odometer: endKm,
    start_odometer_km: startKm, // backward compat alias
    end_odometer_km: endKm, // backward compat alias
    oldReading: startKm != null ? String(startKm) : '',
    newReading: endKm != null ? String(endKm) : '',

    rate_per_litre: rateVal,
    fuel_rate_per_litre: rateVal, // backward compat alias
    cost: rateVal ? String(rateVal) : '',

    amount: amtVal ? String(amtVal) : '',
    total_cost: amtVal, // backward compat alias

    quantity: qty ? parseFloat(Number(qty).toFixed(2)) : 0,
    quantity_litres: qty,
    totalDriven: totalDriven ? parseFloat(Number(totalDriven).toFixed(1)) : 0,
    distance_km: totalDriven,
    mileage: mileage ? parseFloat(Number(mileage).toFixed(2)) : 0,
    mileage_km_per_litre: mileage,
    ratePerKm: ratePerKm ? parseFloat(Number(ratePerKm).toFixed(2)) : 0,
    cost_per_km: ratePerKm,

    notes: db.notes || '',
    deleted_at: db.deleted_at,
  };
};

export const fuelService = {
  async getFuelRecords(vehicleId) {
    if (!vehicleId) return [];
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('deleted_at', null)
      .order('refill_at', { ascending: true });

    if (error) {
      console.error('[fuelService] Error fetching fuel records:', error);
      throw error;
    }
    return (data || []).map(transformDbToUiRecord);
  },

  async getPendingFuelRecord(vehicleId) {
    if (!vehicleId) return null;
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('refill_at', { ascending: false })
      .maybeSingle();

    if (error) {
      console.error('[fuelService] Error fetching pending fuel record:', error);
      throw error;
    }
    return transformDbToUiRecord(data);
  },

  async getDeletedRecords(vehicleId) {
    if (!vehicleId) return [];
    const { data, error } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('[fuelService] Error fetching bin records:', error);
      throw error;
    }
    return (data || []).map(transformDbToUiRecord);
  },

  async createPendingFuelRecord(vehicleId, userId, payload) {
    if (!vehicleId) throw new Error('Vehicle ID is required');

    let startKm = parseFloat(payload.previous_reserve_odometer ?? payload.start_odometer_km ?? payload.oldReading);
    if (isNaN(startKm)) {
      try {
        const { data: veh } = await supabase
          .from('vehicles')
          .select('current_odometer_km')
          .eq('id', vehicleId)
          .single();
        startKm = parseFloat(veh?.current_odometer_km || 0);
      } catch {
        startKm = 0;
      }
    }
    const costPerL = parseFloat(payload.rate_per_litre ?? payload.fuel_rate_per_litre ?? payload.cost);
    const totalCost = parseFloat(payload.amount ?? payload.total_cost);
    const refillDate = payload.refill_at || payload.fuel_datetime || (payload.date ? new Date(payload.date).toISOString() : new Date().toISOString());

    const insertData = {
      vehicle_id: vehicleId,
      status: 'pending',
      previous_reserve_odometer: !isNaN(startKm) ? startKm : 0,
      current_reserve_odometer: null,
      rate_per_litre: !isNaN(costPerL) ? costPerL : 105,
      amount: !isNaN(totalCost) ? totalCost : 0,
      refill_at: refillDate,
      notes: payload.notes || '',
    };

    const { data, error } = await supabase
      .from('fuel_records')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[fuelService] Error creating pending fuel record:', error);
      throw error;
    }

    // Update vehicle's current odometer if newer
    if (!isNaN(startKm) && startKm > 0) {
      await supabase
        .from('vehicles')
        .update({ current_odometer_km: startKm, updated_at: new Date().toISOString() })
        .eq('id', vehicleId);
    }

    return transformDbToUiRecord(data);
  },

  async completePendingFuelRecord(recordId, vehicleId, endOdometerKm, additionalUpdates = {}) {
    if (!recordId) throw new Error('Record ID is required');

    const endKm = parseFloat(endOdometerKm);
    if (isNaN(endKm)) throw new Error('Valid end odometer is required to complete record');

    const updateData = {
      status: 'completed',
      current_reserve_odometer: endKm,
      updated_at: new Date().toISOString(),
      ...additionalUpdates
    };

    const { data, error } = await supabase
      .from('fuel_records')
      .update(updateData)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('[fuelService] Error completing pending fuel record:', error);
      throw error;
    }

    // Update vehicle's current odometer
    if (vehicleId && !isNaN(endKm)) {
      await supabase
        .from('vehicles')
        .update({ current_odometer_km: endKm, updated_at: new Date().toISOString() })
        .eq('id', vehicleId);
    }

    return transformDbToUiRecord(data);
  },

  async createCompletedFuelRecord(vehicleId, userId, payload) {
    if (!vehicleId) throw new Error('Vehicle ID is required');

    const startKm = parseFloat(payload.previous_reserve_odometer ?? payload.start_odometer_km ?? payload.oldReading);
    const endKm = parseFloat(payload.current_reserve_odometer ?? payload.end_odometer_km ?? payload.newReading);
    const costPerL = parseFloat(payload.rate_per_litre ?? payload.fuel_rate_per_litre ?? payload.cost);
    const totalCost = parseFloat(payload.amount ?? payload.total_cost);
    const refillDate = payload.refill_at || payload.fuel_datetime || (payload.date ? new Date(payload.date).toISOString() : new Date().toISOString());

    const insertData = {
      vehicle_id: vehicleId,
      status: 'completed',
      previous_reserve_odometer: !isNaN(startKm) ? startKm : 0,
      current_reserve_odometer: !isNaN(endKm) ? endKm : null,
      rate_per_litre: !isNaN(costPerL) ? costPerL : 105,
      amount: !isNaN(totalCost) ? totalCost : 0,
      refill_at: refillDate,
      notes: payload.notes || '',
    };

    const { data, error } = await supabase
      .from('fuel_records')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[fuelService] Error creating completed fuel record:', error);
      throw error;
    }

    // Update vehicle's current odometer
    const latestKm = !isNaN(endKm) ? endKm : startKm;
    if (!isNaN(latestKm) && latestKm > 0) {
      await supabase
        .from('vehicles')
        .update({ current_odometer_km: latestKm, updated_at: new Date().toISOString() })
        .eq('id', vehicleId);
    }

    return transformDbToUiRecord(data);
  },

  async updateFuelRecord(recordId, vehicleId, updates) {
    if (!recordId) throw new Error('Record ID is required');

    const startKm = updates.previous_reserve_odometer !== undefined ? parseFloat(updates.previous_reserve_odometer) : (updates.start_odometer_km !== undefined ? parseFloat(updates.start_odometer_km) : (updates.oldReading !== undefined ? parseFloat(updates.oldReading) : undefined));
    const endKm = updates.current_reserve_odometer !== undefined ? parseFloat(updates.current_reserve_odometer) : (updates.end_odometer_km !== undefined ? parseFloat(updates.end_odometer_km) : (updates.newReading !== undefined ? parseFloat(updates.newReading) : undefined));
    const costPerL = updates.rate_per_litre !== undefined ? parseFloat(updates.rate_per_litre) : (updates.fuel_rate_per_litre !== undefined ? parseFloat(updates.fuel_rate_per_litre) : (updates.cost !== undefined ? parseFloat(updates.cost) : undefined));
    const totalCost = updates.amount !== undefined ? parseFloat(updates.amount) : (updates.total_cost !== undefined ? parseFloat(updates.total_cost) : undefined);

    const payload = {
      updated_at: new Date().toISOString(),
    };

    if (startKm !== undefined && !isNaN(startKm)) payload.previous_reserve_odometer = startKm;
    if (endKm !== undefined) payload.current_reserve_odometer = isNaN(endKm) ? null : endKm;
    if (costPerL !== undefined && !isNaN(costPerL)) payload.rate_per_litre = costPerL;
    if (totalCost !== undefined && !isNaN(totalCost)) payload.amount = totalCost;
    if (updates.date) payload.refill_at = new Date(updates.date).toISOString();
    if (updates.refill_at) payload.refill_at = updates.refill_at;
    if (updates.fuel_datetime) payload.refill_at = updates.fuel_datetime;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.status) payload.status = updates.status;

    const { data, error } = await supabase
      .from('fuel_records')
      .update(payload)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('[fuelService] Error updating fuel record:', error);
      throw error;
    }

    return transformDbToUiRecord(data);
  },

  async softDeleteFuelRecord(recordId) {
    if (!recordId) throw new Error('Record ID is required');
    const { error } = await supabase
      .from('fuel_records')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) {
      console.error('[fuelService] Error moving fuel record to bin:', error);
      throw error;
    }
    return true;
  },

  async restoreFuelRecord(recordId) {
    if (!recordId) throw new Error('Record ID is required');
    const { error } = await supabase
      .from('fuel_records')
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) {
      console.error('[fuelService] Error restoring fuel record:', error);
      throw error;
    }
    return true;
  },

  async permanentlyDeleteFuelRecord(recordId) {
    if (!recordId) throw new Error('Record ID is required');
    const { error } = await supabase
      .from('fuel_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('[fuelService] Error permanently deleting fuel record:', error);
      throw error;
    }
    return true;
  },

  async bulkImportRecords(vehicleId, userId, recordsList) {
    if (!vehicleId || !recordsList || recordsList.length === 0) return [];

    const rows = recordsList.map(r => {
      const startKm = parseFloat(r.previous_reserve_odometer ?? r.oldReading ?? r.start_odometer_km ?? 0);
      const endKm = parseFloat(r.current_reserve_odometer ?? r.newReading ?? r.end_odometer_km ?? 0);
      const costPerL = parseFloat(r.rate_per_litre ?? r.cost ?? r.fuel_rate_per_litre ?? 105);
      const totalCost = parseFloat(r.amount ?? r.total_cost ?? 0);
      const dateVal = r.refill_at || r.fuel_datetime || (r.date ? new Date(r.date).toISOString() : new Date().toISOString());

      return {
        vehicle_id: vehicleId,
        status: 'completed',
        previous_reserve_odometer: startKm,
        current_reserve_odometer: endKm,
        rate_per_litre: costPerL,
        amount: totalCost,
        refill_at: dateVal,
        notes: r.notes || 'Imported record',
      };
    });

    const { data, error } = await supabase
      .from('fuel_records')
      .insert(rows)
      .select();

    if (error) {
      console.error('[fuelService] Error bulk importing records:', error);
      throw error;
    }
    return (data || []).map(transformDbToUiRecord);
  }
};
