// Typed data-access layer for Phase 2 roster (manager parity).
// All writes go through the singleton Supabase client; publish/copy/swap are
// server-side RPCs (migration 20260916000004) whose P0001 error messages map
// to typed RosterError codes for bilingual UI copy.

import { createFlowSupabase } from '@/lib/supabase'
import type {
  AssignmentRow,
  AuditLogRow,
  AvailabilityNoteRow,
  EmployeeRow,
  HourPolicyRow,
  RosterWeekRow,
  ShiftTemplateRow,
  Station,
  SwapRequestRow,
} from './types'

// ---------- errors ----------

export type RosterErrorCode =
  | 'HARD_CONFLICT'
  | 'NOT_DRAFT'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NOT_PENDING'
  | 'CROSS_BRANCH'
  | 'UNKNOWN'

export class RosterError extends Error {
  code: RosterErrorCode
  constructor(code: RosterErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'RosterError'
    this.code = code
  }
}

const KNOWN_CODES: RosterErrorCode[] = [
  'HARD_CONFLICT',
  'NOT_DRAFT',
  'FORBIDDEN',
  'NOT_FOUND',
  'NOT_PENDING',
  'CROSS_BRANCH',
]

export function mapRpcError(err: unknown): RosterError {
  const msg =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : ''
  const code = KNOWN_CODES.find((c) => msg.includes(c))
  return new RosterError(code ?? 'UNKNOWN', msg || undefined)
}

// ---------- ISO week helpers ----------

/** ISO-8601 week (Monday start) for a "YYYY-MM-DD" date. */
export function isoWeekInfo(isoDate: string): {
  year: number
  weekNumber: number
} {
  const d = new Date(`${isoDate}T00:00:00Z`)
  const day = d.getUTCDay() || 7 // 1..7, Mon=1
  d.setUTCDate(d.getUTCDate() + 4 - day) // Thursday of this ISO week
  const year = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const weekNumber = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  )
  return { year, weekNumber }
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ---------- week bundle ----------

export interface WeekBundle {
  week: RosterWeekRow
  assignments: AssignmentRow[]
  templates: ShiftTemplateRow[]
  employees: EmployeeRow[]
  policies: HourPolicyRow[]
  availability: AvailabilityNoteRow[]
}

function sb() {
  return createFlowSupabase()
}

/** Branch id the current profile manages (branch_managers row). Null for owner/none. */
export async function fetchManagedBranchId(profileId: string): Promise<string | null> {
  const { data, error } = await sb()
    .from('branch_managers')
    .select('branch_id')
    .eq('profile_id', profileId)
    .limit(1)
  if (error) throw mapRpcError(error)
  const row = (data?.[0] ?? null) as { branch_id: string } | null
  return row?.branch_id ?? null
}

/**
 * Month view: assignments for every roster week overlapping the calendar month
 * of `monthAnchor` (any date inside that month), scoped to `branchId`.
 * Read-only — unlike the week bundle it never creates weeks.
 */
export async function fetchMonthAssignments(
  branchId: string,
  monthAnchor: string, // "YYYY-MM-DD" inside the target month
): Promise<AssignmentRow[]> {
  const client = sb()
  const [y, m] = monthAnchor.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const last = new Date(Date.UTC(y, m, 0))
  const padStart = (first.getUTCDay() + 6) % 7 // Mon-start pad
  const padEnd = 7 - ((last.getUTCDay() + 6) % 7) - 1
  const start = new Date(first)
  start.setUTCDate(start.getUTCDate() - padStart)
  const end = new Date(last)
  end.setUTCDate(end.getUTCDate() + padEnd)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

  const { data: weeks, error } = await client
    .from('roster_weeks')
    .select('id')
    .eq('branch_id', branchId)
    .gte('week_start', startStr)
    .lte('week_start', endStr)
  if (error) throw mapRpcError(error)
  const ids = (weeks ?? []).map((w: { id: string }) => w.id)
  if (ids.length === 0) return []

  const { data: assignments, error: aErr } = await client
    .from('assignments')
    .select('*')
    .in('roster_week_id', ids)
  if (aErr) throw mapRpcError(aErr)
  return (assignments ?? []) as AssignmentRow[]
}

/** Fetch-or-create the draft week for `weekStart`, plus all board inputs. */
export async function fetchWeekData(
  branchId: string,
  weekStart: string,
): Promise<WeekBundle> {
  const client = sb()
  const { year, weekNumber } = isoWeekInfo(weekStart)

  let { data: week, error } = await client
    .from('roster_weeks')
    .select('*')
    .eq('branch_id', branchId)
    .eq('week_start', weekStart)
    .maybeSingle()

  if (error) throw mapRpcError(error)

  if (!week) {
    const { data: created, error: insErr } = await client
      .from('roster_weeks')
      .insert({ branch_id: branchId, year, week_number: weekNumber, week_start: weekStart, status: 'draft' })
      .select('*')
      .single()
    if (insErr) throw mapRpcError(insErr)
    week = created
  }
  const w = week as RosterWeekRow

  const [assignments, templates, employees, policies, availability] =
    await Promise.all([
      client.from('assignments').select('*').eq('roster_week_id', w.id),
      client
        .from('shift_templates')
        .select('*')
        .eq('branch_id', branchId)
        .order('start_time'),
      client
        .from('employees')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name_zh'),
      client
        .from('hour_policies')
        .select('*, employees!inner(branch_id)')
        .eq('employees.branch_id', branchId),
      client
        .from('availability_notes')
        .select('*, employees!inner(branch_id)')
        .eq('employees.branch_id', branchId)
        .eq('week_start', weekStart),
    ])

  if (assignments.error) throw mapRpcError(assignments.error)
  if (templates.error) throw mapRpcError(templates.error)
  if (employees.error) throw mapRpcError(employees.error)
  if (policies.error) throw mapRpcError(policies.error)
  if (availability.error) throw mapRpcError(availability.error)

  return {
    week: w,
    assignments: (assignments.data ?? []) as AssignmentRow[],
    templates: (templates.data ?? []) as ShiftTemplateRow[],
    employees: (employees.data ?? []) as EmployeeRow[],
    policies: (policies.data ?? []) as HourPolicyRow[],
    availability: (availability.data ?? []) as AvailabilityNoteRow[],
  }
}

// ---------- assignment mutations ----------

export interface NewAssignment {
  employee_id: string
  shift_template_id: string
  work_date: string
  notes?: string
}

export async function addAssignments(
  rosterWeekId: string,
  rows: NewAssignment[],
): Promise<AssignmentRow[]> {
  const { data, error } = await sb()
    .from('assignments')
    .insert(rows.map((r) => ({ ...r, notes: r.notes ?? '', roster_week_id: rosterWeekId })))
    .select('*')
  if (error) throw mapRpcError(error)
  return (data ?? []) as AssignmentRow[]
}

export async function removeAssignment(assignmentId: string): Promise<void> {
  const { error } = await sb()
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
  if (error) throw mapRpcError(error)
}

// ---------- publish / copy RPCs ----------

export async function publishWeek(weekId: string): Promise<void> {
  const { error } = await sb().rpc('publish_roster_week', { wid: weekId })
  if (error) throw mapRpcError(error)
}

export async function unpublishWeek(weekId: string): Promise<void> {
  const { error } = await sb().rpc('unpublish_roster_week', { wid: weekId })
  if (error) throw mapRpcError(error)
}

export async function copyWeek(srcWeekId: string, dstWeekId: string): Promise<number> {
  const { data, error } = await sb().rpc('copy_roster_week', {
    src: srcWeekId,
    dst: dstWeekId,
  })
  if (error) throw mapRpcError(error)
  return Number(data ?? 0)
}

// ---------- swaps + audit ----------

export async function reviewSwap(
  swapId: string,
  approve: boolean,
  notes?: string,
): Promise<void> {
  const { error } = await sb().rpc('review_swap_request', {
    sid: swapId,
    approve,
    notes: notes ?? '',
  })
  if (error) throw mapRpcError(error)
}

export async function fetchSwaps(branchId?: string): Promise<SwapRequestRow[]> {
  let q = sb().from('swap_requests').select('*')
  if (branchId) q = q.eq('branch_id', branchId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw mapRpcError(error)
  return (data ?? []) as SwapRequestRow[]
}

export async function fetchAudit(options: {
  limit?: number
  offset?: number
  action?: string
}): Promise<AuditLogRow[]> {
  const { limit = 50, offset = 0, action } = options
  let q = sb().from('audit_logs').select('*')
  if (action) q = q.eq('action', action)
  const { data, error } = await q
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw mapRpcError(error)
  return (data ?? []) as AuditLogRow[]
}

// ---------- shared read wrappers for leaf pages (T6–T10) ----------

/** All employees of a branch, active first then by zh name. */
export async function fetchEmployees(branchId: string): Promise<EmployeeRow[]> {
  const { data, error } = await sb()
    .from('employees')
    .select('*')
    .eq('branch_id', branchId)
    .order('is_active', { ascending: false })
    .order('name_zh')
  if (error) throw mapRpcError(error)
  return (data ?? []) as EmployeeRow[]
}

/** All shift templates of a branch ordered by start time. */
export async function fetchTemplates(branchId: string): Promise<ShiftTemplateRow[]> {
  const { data, error } = await sb()
    .from('shift_templates')
    .select('*')
    .eq('branch_id', branchId)
    .order('start_time')
  if (error) throw mapRpcError(error)
  return (data ?? []) as ShiftTemplateRow[]
}

/** All hour policies visible to the branch (join scopes to branch). */
export async function fetchPolicies(branchId: string): Promise<HourPolicyRow[]> {
  const { data, error } = await sb()
    .from('hour_policies')
    .select('*, employees!inner(branch_id)')
    .eq('employees.branch_id', branchId)
    .order('employee_id')
  if (error) throw mapRpcError(error)
  return (data ?? []) as unknown as HourPolicyRow[]
}

// ---------- staff registry CRUD ----------

export interface NewEmployee {
  name_zh: string
  name_en?: string
  phone?: string
  station: Station
  employment_type: 'full_time' | 'part_time'
  min_hours_per_week?: number
  max_hours_per_week?: number
}

export async function createEmployee(
  branchId: string,
  input: NewEmployee,
): Promise<EmployeeRow> {
  const { data, error } = await sb()
    .from('employees')
    .insert({
      branch_id: branchId,
      name_zh: input.name_zh,
      name_en: input.name_en ?? '',
      phone: input.phone ?? '',
      station: input.station,
      employment_type: input.employment_type,
      min_hours_per_week: input.min_hours_per_week ?? 0,
      max_hours_per_week: input.max_hours_per_week ?? 48,
    })
    .select('*')
    .single()
  if (error) throw mapRpcError(error)
  return data as EmployeeRow
}

export async function updateEmployee(
  id: string,
  patch: Partial<Pick<EmployeeRow, 'name_zh' | 'name_en' | 'phone' | 'station' | 'employment_type' | 'min_hours_per_week' | 'max_hours_per_week' | 'is_active'>>,
): Promise<void> {
  const { error } = await sb().from('employees').update(patch).eq('id', id)
  if (error) throw mapRpcError(error)
}

export async function deactivateEmployee(id: string): Promise<void> {
  await updateEmployee(id, { is_active: false })
}

// ---------- shift templates CRUD ----------

export interface NewTemplate {
  name: string
  start_time: string
  end_time: string
  station: Station
  color?: string
  headcount_target?: number
}

export async function createTemplate(
  branchId: string,
  input: NewTemplate,
): Promise<ShiftTemplateRow> {
  const { data, error } = await sb()
    .from('shift_templates')
    .insert({
      branch_id: branchId,
      name: input.name,
      start_time: input.start_time,
      end_time: input.end_time,
      station: input.station,
      color: input.color ?? '#B45309',
      headcount_target: input.headcount_target ?? 1,
    })
    .select('*')
    .single()
  if (error) throw mapRpcError(error)
  return data as ShiftTemplateRow
}

export async function updateTemplate(
  id: string,
  patch: Partial<Pick<ShiftTemplateRow, 'name' | 'start_time' | 'end_time' | 'station' | 'color' | 'headcount_target' | 'is_active'>>,
): Promise<void> {
  const { error } = await sb().from('shift_templates').update(patch).eq('id', id)
  if (error) throw mapRpcError(error)
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await sb().from('shift_templates').delete().eq('id', id)
  if (error) throw mapRpcError(error)
}

// ---------- hour policies ----------

export async function upsertPolicy(policy: HourPolicyRow): Promise<void> {
  const { error } = await sb()
    .from('hour_policies')
    .upsert(
      {
        employee_id: policy.employee_id,
        min_hours_per_week: policy.min_hours_per_week,
        max_hours_per_week: policy.max_hours_per_week,
        hard_block_overtime: policy.hard_block_overtime,
      },
      { onConflict: 'employee_id' },
    )
  if (error) throw mapRpcError(error)
}
