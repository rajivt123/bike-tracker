// src/services/documentService.js
import { supabase } from '../lib/supabase';

export const documentService = {
  async getDocuments(vehicleId) {
    if (!vehicleId) return [];
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[documentService] Error fetching documents:', error);
      throw error;
    }

    // Attach fresh signed URLs (1 hour expiry) for documents with file_path
    const docsWithSignedUrls = await Promise.all(
      (data || []).map(async (doc) => {
        if (!doc.file_path) return { ...doc, downloadUrl: null };
        try {
          const { data: signed } = await supabase.storage
            .from('user-files')
            .createSignedUrl(doc.file_path, 3600);
          return {
            ...doc,
            downloadUrl: signed?.signedUrl || null,
          };
        } catch {
          return { ...doc, downloadUrl: null };
        }
      })
    );

    return docsWithSignedUrls;
  },

  async uploadDocument(vehicleId, userId, { title, document_type, expiry_date, notes, file }) {
    if (!vehicleId || !userId) throw new Error('Vehicle ID and User ID required');

    let filePath = null;
    if (file) {
      const ext = file.name ? file.name.split('.').pop() : 'pdf';
      filePath = `${userId}/documents/${vehicleId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('[documentService] Error uploading file to user-files bucket:', uploadError);
        throw uploadError;
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .insert([{
        vehicle_id: vehicleId,
        user_id: userId,
        title: title || 'Vehicle Document',
        document_type: document_type || 'other',
        expiry_date: expiry_date || null,
        file_path: filePath,
        notes: notes || '',
      }])
      .select()
      .single();

    if (error) {
      console.error('[documentService] Error saving document record:', error);
      throw error;
    }

    let downloadUrl = null;
    if (filePath) {
      const { data: signed } = await supabase.storage
        .from('user-files')
        .createSignedUrl(filePath, 3600);
      downloadUrl = signed?.signedUrl || null;
    }

    return { ...data, downloadUrl };
  },

  async deleteDocument(documentId, filePath = null) {
    if (!documentId) throw new Error('Document ID required');

    if (filePath) {
      try {
        await supabase.storage.from('user-files').remove([filePath]);
      } catch (e) {
        console.warn('[documentService] Could not remove file from storage:', e);
      }
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('[documentService] Error deleting document record:', error);
      throw error;
    }
    return true;
  }
};
