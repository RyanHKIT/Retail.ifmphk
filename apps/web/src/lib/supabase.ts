import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Singleton: ONE GoTrueClient per page. Multiple instances sharing the same
// storage key + BroadcastChannel cause a SIGNED_IN echo cascade — each new
// client re-broadcasts the session, every instance's onAuthStateChange fires,
// applySession → fetchProfile → yet another client → exponential loop
// (4,822 clients / 5,103 SIGNED_IN events in 2 min → ERR_INSUFFICIENT_RESOURCES).
let __cached: SupabaseClient | null = null

export function createFlowSupabase(): SupabaseClient {
  if (__cached) return __cached
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
  }
  __cached = createClient(url, anon)
  return __cached
}
