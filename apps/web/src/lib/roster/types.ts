// Row types mirroring the public schema (migrations 20260915000001 + 20260916000004).
// PostgREST returns snake_case columns; `time` arrives as "HH:MM:SS".

export type Station = '樓面' | '試衣' | '收銀'
export type RosterStatus = 'draft' | 'published' | 'archived'
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'publish'
  | 'copy_week'
  | 'approve_swap'
  | 'reject_swap'

export interface BranchRow {
  id: string
  name_zh: string
  name_en: string
  address: string
  is_active: boolean
  created_at?: string
}

export interface EmployeeRow {
  id: string
  profile_id?: string | null
  branch_id: string
  name_zh: string
  name_en: string
  phone?: string
  station: Station
  employment_type: 'full_time' | 'part_time'
  min_hours_per_week: number
  max_hours_per_week: number
  is_active: boolean
  created_at?: string
}

export interface ShiftTemplateRow {
  id: string
  branch_id: string
  name: string
  start_time: string // "HH:MM" or "HH:MM:SS"
  end_time: string
  color: string
  station: Station
  headcount_target: number
  is_active: boolean
  created_at?: string
}

export interface RosterWeekRow {
  id: string
  branch_id: string
  year: number
  week_number: number
  week_start: string // "YYYY-MM-DD" (Monday)
  status: RosterStatus
  published_at?: string | null
  published_by?: string | null
  created_at?: string
}

export interface AssignmentRow {
  id: string
  roster_week_id: string
  employee_id: string
  shift_template_id: string
  work_date: string // "YYYY-MM-DD"
  notes: string
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

export interface SwapRequestRow {
  id: string
  requester_employee_id: string
  requester_assignment_id: string
  target_employee_id?: string | null
  target_assignment_id?: string | null
  is_open_bid: boolean
  reason: string
  status: SwapStatus
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_notes: string
  created_at?: string
}

export interface HourPolicyRow {
  id?: string
  employee_id: string
  min_hours_per_week: number
  max_hours_per_week: number
  hard_block_overtime: boolean
  created_at?: string
  updated_at?: string
}

/** One entry of `availability_notes.unavailable_slots` (jsonb array). */
export interface UnavailableSlot {
  /** 0 = Monday … 6 = Sunday (ISO weekday − 1). */
  dayOfWeek: number
  allDay: boolean
  startTime: string // "HH:MM" (ignored when allDay)
  endTime: string
}

export interface AvailabilityNoteRow {
  id?: string
  employee_id: string
  week_start: string // "YYYY-MM-DD"
  notes: string
  unavailable_slots: UnavailableSlot[]
  created_at?: string
}

export interface AuditLogRow {
  id: string
  actor_id: string | null
  action: AuditAction
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  notes: string
  created_at: string
}
