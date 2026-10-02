// src/services/reminderService.js
import { supabase } from '../lib/supabase';

export const reminderService = {
  async getReminders(vehicleId) {
    if (!vehicleId) return [];
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (error) {
      console.error('[reminderService] Error fetching reminders:', error);
      throw error;
    }
    return data || [];
  },

  async createReminder(vehicleId, userId, payload) {
    if (!vehicleId) throw new Error('Vehicle ID required');

    const dueKm = payload.due_odometer_km ? parseFloat(payload.due_odometer_km) : null;

    const { data, error } = await supabase
      .from('reminders')
      .insert([{
        vehicle_id: vehicleId,
        title: payload.title || 'Vehicle Reminder',
        reminder_type: payload.reminder_type || 'custom',
        due_date: payload.due_date || null,
        due_odometer_km: dueKm,
        status: payload.status || 'active',
        notes: payload.notes || '',
      }])
      .select()
      .single();

    if (error) {
      console.error('[reminderService] Error creating reminder:', error);
      throw error;
    }
    return data;
  },

  async updateReminder(reminderId, updates) {
    if (!reminderId) throw new Error('Reminder ID required');
    const { data, error } = await supabase
      .from('reminders')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) {
      console.error('[reminderService] Error updating reminder:', error);
      throw error;
    }
    return data;
  },

  async completeReminder(reminderId) {
    return this.updateReminder(reminderId, { status: 'completed' });
  },

  async deleteReminder(reminderId) {
    if (!reminderId) throw new Error('Reminder ID required');
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId);

    if (error) {
      console.error('[reminderService] Error deleting reminder:', error);
      throw error;
    }
    return true;
  }
};
