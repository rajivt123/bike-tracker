// src/services/cashBookCategoryService.js
import { supabase } from '../lib/supabase';

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Fuel', category_type: 'expense', icon: 'Fuel', sort_order: 1 },
  { name: 'Service', category_type: 'expense', icon: 'Wrench', sort_order: 2 },
  { name: 'Repair', category_type: 'expense', icon: 'Hammer', sort_order: 3 },
  { name: 'Insurance', category_type: 'expense', icon: 'Shield', sort_order: 4 },
  { name: 'Documents', category_type: 'expense', icon: 'FileText', sort_order: 5 },
  { name: 'Other', category_type: 'expense', icon: 'MoreHorizontal', sort_order: 6 },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', category_type: 'income', icon: 'Briefcase', sort_order: 1 },
  { name: 'Refund', category_type: 'income', icon: 'RotateCcw', sort_order: 2 },
  { name: 'Other Income', category_type: 'income', icon: 'TrendingUp', sort_order: 3 },
];

export const cashBookCategoryService = {
  async getCategories(userId) {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('cash_book_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[cashBookCategoryService] Error fetching categories:', error);
      throw error;
    }
    return data || [];
  },

  async ensureDefaultCategories(userId) {
    if (!userId) return [];

    // Check if user already has any categories
    const existing = await this.getCategories(userId);
    if (existing.length > 0) {
      return existing;
    }

    // First use: seed sensible default categories
    const allDefaults = [
      ...DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c, user_id: userId, is_active: true })),
      ...DEFAULT_INCOME_CATEGORIES.map(c => ({ ...c, user_id: userId, is_active: true })),
    ];

    const { data, error } = await supabase
      .from('cash_book_categories')
      .insert(allDefaults)
      .select();

    if (error) {
      console.error('[cashBookCategoryService] Error seeding default categories:', error);
      // Fallback: don't crash, return empty array
      return [];
    }

    return data || [];
  },

  async createCategory(userId, payload) {
    if (!userId) throw new Error('User ID required');
    if (!payload.name?.trim()) throw new Error('Category name required');

    const row = {
      user_id: userId,
      name: payload.name.trim(),
      category_type: payload.category_type || 'expense',
      icon: payload.icon || 'Tag',
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      sort_order: parseInt(payload.sort_order || 0, 10),
    };

    const { data, error } = await supabase
      .from('cash_book_categories')
      .insert([row])
      .select()
      .single();

    if (error) {
      console.error('[cashBookCategoryService] Error creating category:', error);
      throw error;
    }
    return data;
  },

  async updateCategory(categoryId, updates) {
    if (!categoryId) throw new Error('Category ID required');

    const updatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    if (updatePayload.name !== undefined) {
      updatePayload.name = updatePayload.name.trim();
    }
    if (updatePayload.sort_order !== undefined) {
      updatePayload.sort_order = parseInt(updatePayload.sort_order, 10);
    }

    const { data, error } = await supabase
      .from('cash_book_categories')
      .update(updatePayload)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      console.error('[cashBookCategoryService] Error updating category:', error);
      throw error;
    }
    return data;
  },

  async archiveCategory(categoryId, isActive = false) {
    return this.updateCategory(categoryId, { is_active: isActive });
  },

  async deleteCategoryIfUnused(categoryId) {
    if (!categoryId) throw new Error('Category ID required');

    // 1. Check if category is used by any cash_book_entries
    const { count, error: countErr } = await supabase
      .from('cash_book_entries')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (countErr) {
      console.error('[cashBookCategoryService] Error checking category usage:', countErr);
      throw countErr;
    }

    if (count && count > 0) {
      throw new Error(`Cannot delete category because it is used by ${count} transaction(s). Archive it instead.`);
    }

    // 2. Safely delete unused category
    const { error } = await supabase
      .from('cash_book_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('[cashBookCategoryService] Error deleting category:', error);
      throw error;
    }
    return true;
  },

  async getCategoryUsageCounts(userId) {
    if (!userId) return {};
    const { data, error } = await supabase
      .from('cash_book_entries')
      .select('category_id')
      .eq('user_id', userId)
      .not('category_id', 'is', null);

    if (error) {
      console.error('[cashBookCategoryService] Error fetching category counts:', error);
      return {};
    }

    const counts = {};
    (data || []).forEach(row => {
      if (row.category_id) {
        counts[row.category_id] = (counts[row.category_id] || 0) + 1;
      }
    });
    return counts;
  }
};
