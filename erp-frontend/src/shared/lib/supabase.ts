import { createClient } from '@supabase/supabase-js';

export const AUTH_MODE = import.meta.env.VITE_AUTH_MODE?.toLowerCase() === 'supabase'
  ? 'supabase'
  : 'legacy';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseAuthConfigured =
  AUTH_MODE === 'supabase' && Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = isSupabaseAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
