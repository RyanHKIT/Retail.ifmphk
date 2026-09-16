// Authentication, authorisation, rate limiting, and response helpers.
//
// Every request passes through `authorize` before any provider call. That
// ordering is the point: an exposed function must not be usable as a free
// model proxy by an anonymous caller, so rejection has to happen before tokens
// are spent.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export type AiKind = 'insight' | 'ask'

/** Per-user hourly ceilings. */
const RATE_LIMITS: Record<AiKind, number> = {
  insight: 20,
  ask: 60,
}

export class GuardError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message?: string) {
    super(message ?? code)
    this.name = 'GuardError'
    this.status = status
    this.code = code
  }
}

export interface Caller {
  userId: string
  email: string
  displayName: string
  /** The branch this caller manages. Insights are scoped to it. */
  branchId: string | null
  isOwner: boolean
}

/** Service-role client. Bypasses RLS — never hand this to a caller. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new GuardError(500, 'SERVER_MISCONFIGURED', 'Supabase service credentials missing')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Verify the caller's JWT and resolve their role and branch.
 *
 * `getUser()` validates the token against the auth server rather than merely
 * decoding it, so a forged or expired token is rejected here.
 */
export async function authorize(req: Request): Promise<Caller> {
  const header = req.headers.get('Authorization') ?? ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    throw new GuardError(401, 'UNAUTHENTICATED', 'Missing bearer token')
  }

  const url = Deno.env.get('SUPABASE_URL')
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !anon) {
    throw new GuardError(500, 'SERVER_MISCONFIGURED', 'Supabase URL or anon key missing')
  }

  // Scoped client carrying the caller's token, so auth.getUser() resolves them.
  const asCaller = createClient(url, anon, {
    global: { headers: { Authorization: header } },
    auth: { persistSession: false },
  })

  const { data, error } = await asCaller.auth.getUser()
  if (error || !data?.user) {
    throw new GuardError(401, 'UNAUTHENTICATED', 'Invalid or expired token')
  }

  const userId = data.user.id
  const service = serviceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    throw new GuardError(403, 'NO_PROFILE', 'No profile for this user')
  }

  if (profile.role !== 'owner' && profile.role !== 'branch_manager') {
    throw new GuardError(403, 'FORBIDDEN', 'Manager role required')
  }

  const isOwner = profile.role === 'owner'

  // Owners may have no branch_managers row; they pass branchId = null and the
  // caller supplies the branch for insight generation.
  const { data: managed } = await service
    .from('branch_managers')
    .select('branch_id')
    .eq('profile_id', userId)
    .maybeSingle()

  return {
    userId,
    email: profile.email ?? '',
    displayName: profile.display_name ?? '',
    branchId: managed?.branch_id ?? null,
    isOwner,
  }
}

/**
 * Throw 429 when the caller has exceeded their hourly ceiling.
 *
 * Counts rows in ai_usage rather than keeping a counter, so the limit needs no
 * extra table and cannot drift out of sync with actual spend.
 */
export async function enforceRateLimit(
  service: SupabaseClient,
  userId: string,
  kind: AiKind,
): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error } = await service
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .neq('outcome', 'cached')
    .gt('created_at', since)

  if (error) {
    // A rate-limit check that cannot run must fail closed: this endpoint spends
    // money, so an unverifiable limit is a reason to refuse, not to proceed.
    throw new GuardError(503, 'RATE_LIMIT_UNAVAILABLE', error.message)
  }

  if ((count ?? 0) >= RATE_LIMITS[kind]) {
    throw new GuardError(429, 'RATE_LIMITED', `Hourly limit of ${RATE_LIMITS[kind]} reached`)
  }
}

export interface UsageRecord {
  user_id: string
  branch_id: string | null
  kind: AiKind
  tab_key: string | null
  model: string
  input_tokens: number
  output_tokens: number
  duration_ms: number
  outcome: 'ok' | 'cached' | 'error'
}

/**
 * Record a call for cost attribution and the rate limit.
 *
 * Best-effort: a logging failure must not fail the user's request, because the
 * insight they asked for is already generated. The one exception is a paid
 * call, which is recorded before returning — see the endpoints.
 */
export async function recordUsage(
  service: SupabaseClient,
  row: UsageRecord,
): Promise<void> {
  const { error } = await service.from('ai_usage').insert(row)
  if (error) console.error('ai_usage insert failed', error.message)
}

/** Stable digest of the prompt inputs, so changed numbers invalidate the cache. */
export async function digestInput(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32)
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

export function streamResponse(body: ReadableStream): Response {
  return new Response(body, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

/** Map a thrown value onto a response. GuardError carries its own status. */
export function errorResponse(error: unknown): Response {
  if (error instanceof GuardError) {
    return jsonResponse({ error: error.code, message: error.message }, error.status)
  }
  const message = error instanceof Error ? error.message : 'Unexpected error'
  console.error('unhandled ai error', message)
  return jsonResponse({ error: 'INTERNAL', message }, 500)
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }
  return null
}
