import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Obtiene variables de entorno desde Vite (import.meta.env) y hace fallback
// a process.env para entornos donde estén definidas (por ejemplo, CI/servidor).
const getEnv = () => {
  const vite = (import.meta.env as any) || {}
  const nodeEnv = typeof process !== 'undefined' ? (process as any).env || {} : {}
  return { vite, nodeEnv }
}

const { vite, nodeEnv } = getEnv()

const supabaseUrl = (vite.VITE_SUPABASE_URL as string) || nodeEnv.VITE_SUPABASE_URL || nodeEnv.SUPABASE_URL
const supabaseAnonKey = (vite.VITE_SUPABASE_ANON_KEY as string) || nodeEnv.VITE_SUPABASE_ANON_KEY || nodeEnv.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase. Defina VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export default supabase