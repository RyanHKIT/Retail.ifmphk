import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function createFlowSupabase(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
  }
  return createClient(url, anon)
}
