import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

type AppEnvironment = Record<string, string | undefined>;

function requiredEnvironmentValue(environment: AppEnvironment, name: string): string {
  const value = environment[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseClient(
  environment: AppEnvironment = process.env
): SupabaseClient<Database> {
  const url = requiredEnvironmentValue(environment, 'VITE_SUPABASE_URL');
  const anonKey = requiredEnvironmentValue(environment, 'VITE_SUPABASE_ANON_KEY');
  return createClient<Database>(url, anonKey);
}

export const supabase = createSupabaseClient();