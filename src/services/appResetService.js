// src/services/appResetService.js
import { supabase } from '../lib/supabase';

export const appResetService = {
  async deleteAllAppData(userId) {
    if (!userId) throw new Error('Authenticated user ID required');

    // 1. Identify and delete document files from Supabase Storage
    try {
      // List and remove files under `${userId}/documents`
      const { data: docFiles, error: listDocErr } = await supabase.storage
        .from('user-files')
        .list(`${userId}/documents`);

      if (!listDocErr && docFiles && docFiles.length > 0) {
        const filePaths = docFiles.map(f => `${userId}/documents/${f.name}`);
        const { error: remErr } = await supabase.storage
          .from('user-files')
          .remove(filePaths);
        if (remErr) {
          console.error('[appResetService] Error removing document files from storage:', remErr);
          throw new Error('Failed to delete storage documents: ' + remErr.message);
        }
      }

      // Also list root files for user if any
      const { data: rootFiles, error: listRootErr } = await supabase.storage
        .from('user-files')
        .list(userId);

      if (!listRootErr && rootFiles && rootFiles.length > 0) {
        const rootPaths = rootFiles.filter(f => f.id).map(f => `${userId}/${f.name}`);
        if (rootPaths.length > 0) {
          await supabase.storage.from('user-files').remove(rootPaths);
        }
      }
    } catch (storageErr) {
      console.error('[appResetService] Storage deletion failure:', storageErr);
      throw new Error('Cloud storage deletion failed: ' + storageErr.message);
    }

    // 2. Call the Supabase delete_all_app_data RPC
    const { error: rpcError } = await supabase.rpc('delete_all_app_data');
    if (rpcError) {
      console.error('[appResetService] Error executing delete_all_app_data RPC:', rpcError);
      throw rpcError;
    }

    return true;
  }
};
