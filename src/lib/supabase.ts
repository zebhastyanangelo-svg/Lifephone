/// <reference types="vite/client" />

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

console.log('[Supabase] Client initialized:', {
  url: import.meta.env.VITE_SUPABASE_URL ? 'configured' : 'MISSING',
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'configured' : 'MISSING',
});