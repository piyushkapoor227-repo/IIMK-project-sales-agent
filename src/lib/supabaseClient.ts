import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEMO } from './demo/store'
import { demoClient } from './demo/demoClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!DEMO && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.local.example to .env.local and fill them in, or set VITE_DEMO_MODE=true to run the offline demo.',
  )
}

// In demo mode every backend call is served by an in-browser mock (see
// src/lib/demo). Otherwise this is the real Supabase client.
export const supabase = (
  DEMO ? demoClient : createClient(supabaseUrl, supabaseAnonKey)
) as unknown as SupabaseClient

export const functionsUrl = `${supabaseUrl ?? ''}/functions/v1`
