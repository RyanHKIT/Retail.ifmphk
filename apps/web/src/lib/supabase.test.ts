import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('createFlowSupabase', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when env missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')
    const { createFlowSupabase } = await import('./supabase')
    expect(() => createFlowSupabase()).toThrow(/VITE_SUPABASE/)
  })

  it('returns client when env present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-test-key')
    const { createFlowSupabase } = await import('./supabase')
    const client = createFlowSupabase()
    expect(client).toBeTruthy()
    expect(typeof client.from).toBe('function')
  })
})
