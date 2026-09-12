import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

type ExpoEnvironment = Record<string, string | undefined>;

function requiredEnvironmentValue(environment: ExpoEnvironment, name: string): string {
  const value = environment[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createSupabaseClient(
  environment: ExpoEnvironment = process.env
): SupabaseClient<Database> {
  const url = requiredEnvironmentValue(environment, 'EXPO_PUBLIC_SUPABASE_URL');
  const anonKey = requiredEnvironmentValue(environment, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
  return createClient<Database>(url, anonKey);
}

export const supabase = createSupabaseClient();