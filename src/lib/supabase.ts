/// <reference types="vite/client" />

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Supabase credentials missing: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}. Check environment variables.`
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

console.log('[Supabase] Client initialized:', {
  url: supabaseUrl ? 'configured' : 'MISSING',
  key: supabaseAnonKey ? 'configured' : 'MISSING',
});
