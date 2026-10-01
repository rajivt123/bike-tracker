// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lszfoabqkobbeitudgdf.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseKey) {
  console.warn(
    '[Supabase] Warning: VITE_SUPABASE_PUBLISHABLE_KEY is not defined in environment variables.\n' +
    'Please add your Supabase anon/publishable key to your .env file:\n' +
    'VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key'
  );
}

// Fallback dummy key to prevent createClient initialization crash if key is not yet set
const effectiveKey = supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key_for_initialization';

export const supabase = createClient(supabaseUrl, effectiveKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = () => Boolean(supabaseKey && supabaseKey.length > 20);
