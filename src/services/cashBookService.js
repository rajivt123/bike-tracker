// src/services/cashBookService.js
import { supabase } from '../lib/supabase';

export const cashBookService = {
  // ==========================================
  // 1. FINANCIAL ACCOUNTS MANAGEMENT
  // ==========================================

  async getAccounts(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('financial_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[cashBookService] Error fetching accounts:', error);
      throw error;
    }

    // Auto-seed a default Cash account if the user has no accounts yet
    if (!data || data.length === 0) {
      try {
        const defaultAcc = await this.createAccount(userId, {
          name: 'Cash',
          account_type: 'cash',
          opening_balance: 0,
          is_default: true,
          is_active: true,
          notes: 'Default Cash Account',
        });
        return [defaultAcc];
      } catch (seedErr) {
        console.warn('[cashBookService] Could not auto-seed default account:', seedErr);
        return [];
      }
    }

    return data;
  },

  async createAccount(userId, payload) {
    if (!userId) throw new Error('User ID required');
    if (!payload.name?.trim()) throw new Error('Account name is required');

    const openingBalance = parseFloat(payload.opening_balance) || 0;
    const isDefault = Boolean(payload.is_default);

    // If this new account is default, unset default on other accounts for this user
    if (isDefault) {
      await supabase
        .from('financial_accounts')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const row = {
      user_id: userId,
      name: payload.name.trim(),
      account_type: payload.account_type || 'cash',
      opening_balance: openingBalance,
      is_default: isDefault,
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      notes: payload.notes || '',
    };

    const { data, error } = await supabase
      .from('financial_accounts')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('[cashBookService] Error creating account:', error);
      throw error;
    }
    return data;
  },

  async updateAccount(accountId, updates) {
    if (!accountId) throw new Error('Account ID required');

    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updatePayload.opening_balance !== undefined) {
      updatePayload.opening_balance = parseFloat(updatePayload.opening_balance) || 0;
    }
    if (updatePayload.name !== undefined) {
      updatePayload.name = updatePayload.name.trim();
    }

    // If setting as default, unset default on other accounts for this user
    if (updatePayload.is_default && updatePayload.user_id) {
      await supabase
        .from('financial_accounts')
        .update({ is_default: false })
        .eq('user_id', updatePayload.user_id)
        .neq('id', accountId);
    }

    const { data, error } = await supabase
      .from('financial_accounts')
      .update(updatePayload)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      console.error('[cashBookService] Error updating account:', error);
      throw error;
    }
    return data;
  },

  async setDefaultAccount(userId, accountId) {
    if (!userId || !accountId) throw new Error('User ID and Account ID required');
    return this.updateAccount(accountId, { is_default: true, user_id: userId });
  },

  async deactivateAccount(accountId, isActive = false) {
    return this.updateAccount(accountId, { is_active: isActive });
  },

  async deleteAccount(accountId) {
    if (!accountId) throw new Error('Account ID required');

    // Check if account has transactions before deleting
    const { count, error: countErr } = await supabase
      .from('cash_book_entries')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId);

    if (!countErr && count > 0) {
      throw new Error(`Cannot delete account with ${count} existing transaction(s). Reassign or delete transactions first.`);
    }

    const { error } = await supabase
      .from('financial_accounts')
      .delete()
      .eq('id', accountId);

    if (error) {
      console.error('[cashBookService] Error deleting account:', error);
      throw error;
    }
    return true;
  },

  // ==========================================
  // 2. CASH BOOK ENTRIES & TRANSFERS
  // ==========================================

  async getEntries(userId, filters = {}) {
    if (!userId) return [];
    let query = supabase
      .from('cash_book_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.entry_type && filters.entry_type !== 'all') {
      query = query.eq('entry_type', filters.entry_type);
    }
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters.category_id && filters.category_id !== 'all') {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.account_id && filters.account_id !== 'all') {
      query = query.eq('account_id', filters.account_id);
    }
    if (filters.vehicle_id && filters.vehicle_id !== 'all') {
      if (filters.vehicle_id === 'none') {
        query = query.is('vehicle_id', null);
      } else {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
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

    let results = data || [];

    // Client-side text search if filter is present
    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(e => 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q)) ||
        (e.reference && e.reference.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
      );
    }

    return results;
  },

  async createEntry(userId, payload) {
    if (!userId) throw new Error('User ID required');

    const amountVal = parseFloat(payload.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      throw new Error('Valid positive amount is required');
    }

    // Requirement 2: If account_id is not selected, use user's default Cash account
    let accountId = payload.account_id;
    if (!accountId) {
      const accounts = await this.getAccounts(userId);
      const defaultAcc = accounts.find(a => a.is_default) ||
                         accounts.find(a => a.name.toLowerCase() === 'cash') ||
                         accounts[0];
      if (defaultAcc) {
        accountId = defaultAcc.id;
      } else {
        const createdAcc = await this.createAccount(userId, {
          name: 'Cash',
          account_type: 'cash',
          opening_balance: 0,
          is_default: true,
        });
        accountId = createdAcc.id;
      }
    }

    const row = {
      user_id: userId,
      account_id: accountId,
      vehicle_id: payload.vehicle_id || null,
      category_id: payload.category_id || null,
      entry_date: payload.entry_date || new Date().toISOString().split('T')[0],
      entry_type: payload.entry_type || 'expense', // 'income' | 'expense'
      amount: amountVal,
      category: payload.category || 'General',
      description: payload.description || '',
      reference: payload.reference || null,
      notes: payload.notes || '',
      source_type: payload.source_type || 'manual',
      source_id: payload.source_id || null,
      transfer_group_id: null,
      transfer_direction: null,
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

  async createTransfer(userId, payload) {
    if (!userId) throw new Error('User ID required');
    const { from_account_id, to_account_id, amount, entry_date, description, notes, vehicle_id } = payload;

    if (!from_account_id || !to_account_id) {
      throw new Error('Both Source and Destination accounts are required');
    }
    if (from_account_id === to_account_id) {
      throw new Error('Source and Destination accounts must be different');
    }

    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      throw new Error('Valid positive transfer amount is required');
    }

    const transferDate = entry_date || new Date().toISOString().split('T')[0];
    const transferGroupId = crypto.randomUUID();

    // Leg 1: Outflow from source account
    const fromRow = {
      user_id: userId,
      account_id: from_account_id,
      vehicle_id: vehicle_id || null,
      entry_date: transferDate,
      entry_type: 'transfer',
      amount: amountVal,
      category: 'Transfer',
      description: description || 'Account Transfer',
      notes: notes || '',
      transfer_group_id: transferGroupId,
      transfer_direction: 'out',
      source_type: 'manual',
      source_id: null,
    };

    // Leg 2: Inflow into destination account
    const toRow = {
      user_id: userId,
      account_id: to_account_id,
      vehicle_id: vehicle_id || null,
      entry_date: transferDate,
      entry_type: 'transfer',
      amount: amountVal,
      category: 'Transfer',
      description: description || 'Account Transfer',
      notes: notes || '',
      transfer_group_id: transferGroupId,
      transfer_direction: 'in',
      source_type: 'manual',
      source_id: null,
    };

    const { data, error } = await supabase
      .from('cash_book_entries')
      .insert([fromRow, toRow])
      .select();

    if (error) {
      console.error('[cashBookService] Error creating transfer:', error);
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
    delete updatePayload.payment_mode;

    // Check if this entry belongs to a transfer group
    const { data: existing } = await supabase
      .from('cash_book_entries')
      .select('transfer_group_id, transfer_direction')
      .eq('id', entryId)
      .single();

    if (existing?.transfer_group_id) {
      // Synchronize amount, date, description, notes across both legs of transfer
      const syncFields = {
        updated_at: new Date().toISOString(),
      };
      if (updatePayload.amount !== undefined) syncFields.amount = updatePayload.amount;
      if (updatePayload.entry_date !== undefined) syncFields.entry_date = updatePayload.entry_date;
      if (updatePayload.description !== undefined) syncFields.description = updatePayload.description;
      if (updatePayload.notes !== undefined) syncFields.notes = updatePayload.notes;

      const { data, error } = await supabase
        .from('cash_book_entries')
        .update(syncFields)
        .eq('transfer_group_id', existing.transfer_group_id)
        .select();

      if (error) {
        console.error('[cashBookService] Error updating transfer:', error);
        throw error;
      }
      return data.find(e => e.id === entryId) || data[0];
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

    // If entry is part of a transfer, delete both legs
    const { data: existing } = await supabase
      .from('cash_book_entries')
      .select('transfer_group_id')
      .eq('id', entryId)
      .single();

    if (existing?.transfer_group_id) {
      const { error } = await supabase
        .from('cash_book_entries')
        .delete()
        .eq('transfer_group_id', existing.transfer_group_id);

      if (error) {
        console.error('[cashBookService] Error deleting transfer:', error);
        throw error;
      }
      return true;
    }

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

  // ==========================================
  // 3. AUTOMATIC CROSS-MODULE EXPENSE SYNC
  // ==========================================

  async syncSourceExpense(userId, { sourceType, sourceId, vehicleId, amount, date, description, notes, categoryName, accountId }) {
    if (!userId || !sourceId || !sourceType) return null;
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) return null;

    // 1. Resolve category_id from categoryName
    let categoryId = null;
    try {
      const { data: cat } = await supabase
        .from('cash_book_categories')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', categoryName)
        .eq('category_type', 'expense')
        .maybeSingle();
      categoryId = cat?.id || null;
    } catch {
      categoryId = null;
    }

    // 2. Ensure target accountId
    let targetAccountId = accountId;
    if (!targetAccountId) {
      const accounts = await this.getAccounts(userId);
      const defaultAcc = accounts.find(a => a.is_default) || accounts[0];
      targetAccountId = defaultAcc?.id || null;
    }
    if (!targetAccountId) return null;

    const entryDate = date 
      ? (typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0]) 
      : new Date().toISOString().split('T')[0];

    // 3. Unique source protection: Check if entry with sourceType and sourceId already exists
    const { data: existing } = await supabase
      .from('cash_book_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle();

    const entryData = {
      user_id: userId,
      account_id: targetAccountId,
      vehicle_id: vehicleId || null,
      category_id: categoryId,
      entry_date: entryDate,
      entry_type: 'expense',
      amount: numAmount,
      category: categoryName,
      description: description || `${categoryName} expense`,
      notes: notes || '',
      source_type: sourceType,
      source_id: sourceId,
      transfer_direction: null,
      transfer_group_id: null,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('cash_book_entries')
        .update({
          ...entryData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) console.error('[cashBookService] Error updating source expense:', error);
      return data;
    } else {
      const { data, error } = await supabase
        .from('cash_book_entries')
        .insert([entryData])
        .select()
        .single();
      if (error) console.error('[cashBookService] Error creating source expense:', error);
      return data;
    }
  },

  async deleteSourceExpense(userId, sourceType, sourceId) {
    if (!userId || !sourceId || !sourceType) return;
    const { error } = await supabase
      .from('cash_book_entries')
      .delete()
      .eq('user_id', userId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId);
    if (error) console.error('[cashBookService] Error deleting source expense:', error);
  },

  // ==========================================
  // 4. FINANCIAL SUMMARY & BALANCES
  // ==========================================

  async getSummary(userId, filters = {}) {
    const entries = await this.getEntries(userId, filters);
    let totalIncome = 0;
    let totalExpense = 0;

    for (const e of entries) {
      const amt = parseFloat(e.amount) || 0;
      if (e.entry_type === 'income') {
        totalIncome += amt;
      } else if (e.entry_type === 'expense') {
        totalExpense += amt;
      }
      // Requirement 4: Transfer does NOT count as income or expense!
    }

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpense) * 100) / 100,
      entriesCount: entries.length,
    };
  }
};
