// src/services/profileService.js
import { supabase } from '../lib/supabase';

export const profileService = {
  async getProfile(userId) {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('[profileService] Error fetching profile:', error);
      throw error;
    }
    return data;
  },

  async updateProfile(userId, updates) {
    if (!userId) throw new Error('User ID is required');
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[profileService] Error updating profile:', error);
      throw error;
    }
    return data;
  },

  async uploadAvatar(userId, file) {
    if (!userId || !file) throw new Error('User ID and file are required');
    const ext = file.name ? file.name.split('.').pop() : 'jpg';
    const filePath = `${userId}/avatar_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('user-files')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      console.error('[profileService] Error uploading avatar:', uploadError);
      throw uploadError;
    }

    // Get signed URL (valid for 1 year)
    const { data: signedData, error: signError } = await supabase.storage
      .from('user-files')
      .createSignedUrl(filePath, 31536000);

    if (signError) {
      return { filePath, publicUrl: '' };
    }

    return { filePath, signedUrl: signedData.signedUrl };
  },
};
