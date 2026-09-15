/// <reference types="vite/client" />

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = 'https://fdsiutxsduuzayfmgocd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkc2l1dHhzZHV1emF5Zm1nb2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMzEyOTMsImV4cCI6MjEwNDgwNzI5M30.aEv14p1IhEfLFJy6dtKruiDokUB4YgbhlgzBhxXyREc';

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
