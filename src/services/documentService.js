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

    // Attach fresh signed URLs (1 hour expiry) for documents with storage_path
    const docsWithSignedUrls = await Promise.all(
      (data || []).map(async (doc) => {
        const uiDoc = {
          ...doc,
          expiry_date: doc.expires_on,
          file_path: doc.storage_path
        };
        
        if (!doc.storage_path) return { ...uiDoc, downloadUrl: null };
        try {
          const { data: signed } = await supabase.storage
            .from(doc.storage_bucket || 'user-files')
            .createSignedUrl(doc.storage_path, 3600);
          return {
            ...uiDoc,
            downloadUrl: signed?.signedUrl || null,
          };
        } catch {
          return { ...uiDoc, downloadUrl: null };
        }
      })
    );

    return docsWithSignedUrls;
  },

  async uploadDocument(vehicleId, userId, { title, document_type, expiry_date, notes, file }) {
    if (!vehicleId || !userId) throw new Error('Vehicle ID and User ID required');

    let storagePath = null;
    if (file) {
      const ext = file.name ? file.name.split('.').pop() : 'pdf';
      storagePath = `${userId}/documents/${vehicleId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, file, { upsert: true });

      if (uploadError) {
        console.error('[documentService] Error uploading file to user-files bucket:', uploadError);
        throw uploadError;
      }
    }

    const { data, error } = await supabase
      .from('documents')
      .insert([{
        vehicle_id: vehicleId,
        title: title || 'Vehicle Document',
        document_type: document_type || 'other',
        expires_on: expiry_date || null,
        storage_bucket: storagePath ? 'user-files' : null,
        storage_path: storagePath,
        mime_type: file ? file.type : null,
        file_size_bytes: file ? file.size : null,
        notes: notes || '',
      }])
      .select()
      .single();

    if (error) {
      console.error('[documentService] Error saving document record:', error);
      if (storagePath) {
        try {
          await supabase.storage.from('user-files').remove([storagePath]);
        } catch (cleanupErr) {
          console.warn('[documentService] Cleanup of orphaned file failed:', cleanupErr);
        }
      }
      throw error;
    }

    let downloadUrl = null;
    if (storagePath) {
      const { data: signed } = await supabase.storage
        .from('user-files')
        .createSignedUrl(storagePath, 3600);
      downloadUrl = signed?.signedUrl || null;
    }

    return { 
      ...data, 
      expiry_date: data.expires_on,
      file_path: data.storage_path,
      downloadUrl 
    };
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
