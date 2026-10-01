// src/services/cashBookService.js
import { supabase } from '../lib/supabase';

export const cashBookService = {
  async getEntries(userId, filters = {}) {
    if (!userId) return [];
    let query = supabase
      .from('cash_book_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.entry_type) {
      query = query.eq('entry_type', filters.entry_type);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.startDate) {
      query = query.gte('entry_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('entry_date', filters.endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[cashBookService] Error fetching cash book entries:', error);
      throw error;
    }
    return data || [];
  },

  async createEntry(userId, payload) {
    if (!userId) throw new Error('User ID required');

    const amountVal = parseFloat(payload.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      throw new Error('Valid positive amount is required');
    }

    const row = {
      user_id: userId,
      entry_date: payload.entry_date || new Date().toISOString().split('T')[0],
      entry_type: payload.entry_type || 'expense', // 'income' | 'expense'
      amount: amountVal,
      category: payload.category || 'General',
      payment_mode: payload.payment_mode || 'Cash',
      description: payload.description || '',
    };

    const { data, error } = await supabase
      .from('cash_book_entries')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('[cashBookService] Error creating cash book entry:', error);
      throw error;
    }
    return data;
  },

  async updateEntry(entryId, updates) {
    if (!entryId) throw new Error('Entry ID required');

    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updatePayload.amount !== undefined) {
      updatePayload.amount = parseFloat(updatePayload.amount);
    }

    const { data, error } = await supabase
      .from('cash_book_entries')
      .update(updatePayload)
      .eq('id', entryId)
      .select()
      .single();

    if (error) {
      console.error('[cashBookService] Error updating cash book entry:', error);
      throw error;
    }
    return data;
  },

  async deleteEntry(entryId) {
    if (!entryId) throw new Error('Entry ID required');
    const { error } = await supabase
      .from('cash_book_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('[cashBookService] Error deleting cash book entry:', error);
      throw error;
    }
    return true;
  },

  async getSummary(userId) {
    const entries = await this.getEntries(userId);
    let totalIncome = 0;
    let totalExpense = 0;

    for (const e of entries) {
      const amt = parseFloat(e.amount) || 0;
      if (e.entry_type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
    }

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
      entriesCount: entries.length,
    };
  }
};
