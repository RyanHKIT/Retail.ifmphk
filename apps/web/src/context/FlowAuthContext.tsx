import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createFlowSupabase } from '@/lib/supabase'

export type FlowProfile = {
  id: string
  email: string
  display_name: string
  role: 'owner' | 'branch_manager' | 'staff'
}

type FlowAuthContextValue = {
  session: Session | null
  profile: FlowProfile | null
  loading: boolean
  /** True while a session exists but its profile is still resolving (gate must not redirect). */
  resolvingProfile: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const FlowAuthContext = createContext<FlowAuthContextValue | null>(null)

async function fetchProfile(user: User | null): Promise<FlowProfile | null> {
  if (!user) return null
  const supabase = createFlowSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', user.id)
    .maybeSingle()
  if (error || !data) return null
  return data as FlowProfile
}

export function FlowAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<FlowProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [resolvingProfile, setResolvingProfile] = useState(false)

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession) {
      setProfile(null)
      setResolvingProfile(false)
      return
    }
    setResolvingProfile(true)
    const p = await fetchProfile(nextSession.user ?? null)
    setProfile(p)
    setResolvingProfile(false)
  }, [])

  useEffect(() => {
    const supabase = createFlowSupabase()
    let cancelled = false

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      await applySession(data.session ?? null)
      if (!cancelled) setLoading(false)
    }

    void init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [applySession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = createFlowSupabase()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      await applySession(data.session ?? null)
      return { error: null }
    },
    [applySession],
  )

  const signOut = useCallback(async () => {
    const supabase = createFlowSupabase()
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setResolvingProfile(false)
  }, [])

  const value = useMemo(
    () => ({ session, profile, loading, resolvingProfile, signIn, signOut }),
    [session, profile, loading, resolvingProfile, signIn, signOut],
  )

  return <FlowAuthContext.Provider value={value}>{children}</FlowAuthContext.Provider>
}

export function useFlowAuth(): FlowAuthContextValue {
  const ctx = useContext(FlowAuthContext)
  if (!ctx) throw new Error('useFlowAuth must be used within FlowAuthProvider')
  return ctx
}
