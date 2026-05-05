import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from './env';

export const isSupabaseAuthConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

export const supabase = isSupabaseAuthConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
