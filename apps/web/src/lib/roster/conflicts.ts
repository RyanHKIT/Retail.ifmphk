// TS conflict engine — live board feedback. Single source of truth with SQL
// `private.roster_conflicts(week_id)` (migration 20260916000004). Same rule ids,
// same severities. See spec §3 (docs/superpowers/specs/2026-09-16-ifmp-flow-roster-design.md).
//
// Rules:
//   double_booking  hard  same employee, same work_date, shift ranges overlap (overnight-aware)
//   overtime_hard   hard  weekly hours > effective max AND hard_block_overtime
//   overtime        soft  weekly hours > effective max, no hard block
//   below_min       soft  weekly hours < effective min (only if ≥1 assignment that week)
//   availability    soft  assignment overlaps an unavailable_slots entry for that week
//
// `understaffed` stays display-only (cell counter), never a conflict row.

import type {
  AssignmentRow,
  AvailabilityNoteRow,
  EmployeeRow,
  HourPolicyRow,
  ShiftTemplateRow,
} from './types'

export type ConflictKind =
  | 'double_booking'
  | 'overtime'
  | 'overtime_hard'
  | 'below_min'
  | 'availability'
export type ConflictSeverity = 'soft' | 'hard'

export interface Conflict {
  employeeId: string
  workDate: string // "YYYY-MM-DD"
  kind: ConflictKind
  severity: ConflictSeverity
  detail: Record<string, unknown>
}

export interface EffectiveLimits {
  min: number
  max: number
  hardBlock: boolean
}

export interface RosterWeekInput {
  /** Monday of the ISO week, "YYYY-MM-DD". */
  weekStart: string
  assignments: AssignmentRow[]
  templates: ShiftTemplateRow[]
  employees: EmployeeRow[]
  policies: HourPolicyRow[]
  availability: AvailabilityNoteRow[]
}

/** Effective min/max = hour_policies row when present, else employees columns. */
export function effectiveLimits(
  employee: EmployeeRow,
  policy: HourPolicyRow | undefined,
): EffectiveLimits {
  return {
    min: policy ? policy.min_hours_per_week : employee.min_hours_per_week,
    max: policy ? policy.max_hours_per_week : employee.max_hours_per_week,
    hardBlock: policy ? policy.hard_block_overtime : false,
  }
}

// ---------- time helpers (identical semantics to SQL intervals) ----------

/** "HH:MM" | "HH:MM:SS" → minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

interface ShiftRange {
  start: number // minutes
  endEff: number // minutes, overnight-aware (end <= start ⇒ +1440)
  durHours: number
}

function shiftRange(start: string, end: string): ShiftRange {
  const s = toMinutes(start)
  const e = toMinutes(end)
  const endEff = e <= s ? e + 24 * 60 : e
  return { start: s, endEff, durHours: (endEff - s) / 60 }
}

/** ISO weekday of "YYYY-MM-DD" as 0=Mon … 6=Sun (matches SQL ISODOW − 1). */
export function dayOfWeekIndex(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return (d.getUTCDay() + 6) % 7
}

// ---------- engine ----------

export function detectConflicts(week: RosterWeekInput): Conflict[] {
  const out: Conflict[] = []

  const tmplById = new Map(week.templates.map((t) => [t.id, t]))
  const empById = new Map(week.employees.map((e) => [e.id, e]))
  const policyByEmp = new Map(week.policies.map((p) => [p.employee_id, p]))

  // Resolved assignment windows (unknown employee/template ignored safely).
  interface Win {
    assignmentId: string
    employeeId: string
    workDate: string
    start: number
    endEff: number
    durHours: number
  }
  const wins: Win[] = []
  for (const a of week.assignments) {
    const t = tmplById.get(a.shift_template_id)
    if (!t || !empById.has(a.employee_id)) continue
    const r = shiftRange(t.start_time, t.end_time)
    wins.push({
      assignmentId: a.id,
      employeeId: a.employee_id,
      workDate: a.work_date,
      start: r.start,
      endEff: r.endEff,
      durHours: r.durHours,
    })
  }

  // --- double_booking (hard): same employee, same date, overlapping ranges ---
  const byEmpDate = new Map<string, Win[]>()
  for (const w of wins) {
    const key = `${w.employeeId}|${w.workDate}`
    const arr = byEmpDate.get(key)
    if (arr) arr.push(w)
    else byEmpDate.set(key, [w])
  }
  for (const arr of byEmpDate.values()) {
    for (let i = 0; i < arr.length; i += 1) {
      for (let j = i + 1; j < arr.length; j += 1) {
        const x = arr[i]
        const y = arr[j]
        if (x.start < y.endEff && y.start < x.endEff) {
          out.push({
            employeeId: x.employeeId,
            workDate: x.workDate,
            kind: 'double_booking',
            severity: 'hard',
            detail: { a: x.assignmentId, b: y.assignmentId },
          })
        }
      }
    }
  }

  // --- weekly hours per employee ---
  const hoursByEmp = new Map<string, { hours: number; shifts: number }>()
  for (const w of wins) {
    const cur = hoursByEmp.get(w.employeeId) ?? { hours: 0, shifts: 0 }
    cur.hours += w.durHours
    cur.shifts += 1
    hoursByEmp.set(w.employeeId, cur)
  }

  // --- overtime / overtime_hard / below_min ---
  for (const [employeeId, { hours, shifts }] of hoursByEmp) {
    const employee = empById.get(employeeId)
    if (!employee) continue
    const lim = effectiveLimits(employee, policyByEmp.get(employeeId))
    const round2 = Math.round(hours * 100) / 100
    if (hours > lim.max) {
      out.push({
        employeeId,
        workDate: week.weekStart,
        kind: lim.hardBlock ? 'overtime_hard' : 'overtime',
        severity: lim.hardBlock ? 'hard' : 'soft',
        detail: { hours: round2, max: lim.max },
      })
    }
    if (shifts > 0 && hours < lim.min) {
      out.push({
        employeeId,
        workDate: week.weekStart,
        kind: 'below_min',
        severity: 'soft',
        detail: { hours: round2, min: lim.min },
      })
    }
  }

  // --- availability (soft) ---
  const availByEmp = new Map<string, AvailabilityNoteRow[]>()
  for (const an of week.availability) {
    if (an.week_start !== week.weekStart) continue
    const arr = availByEmp.get(an.employee_id)
    if (arr) arr.push(an)
    else availByEmp.set(an.employee_id, [an])
  }
  for (const w of wins) {
    const notes = availByEmp.get(w.employeeId)
    if (!notes) continue
    const dow = dayOfWeekIndex(w.workDate)
    for (const an of notes) {
      for (const slot of an.unavailable_slots ?? []) {
        if (slot.dayOfWeek !== dow) continue
        const overlaps =
          slot.allDay ||
          (() => {
            const s = toMinutes(slot.startTime)
            const e = toMinutes(slot.endTime)
            const eEff = e <= s ? e + 24 * 60 : e
            return w.start < eEff && s < w.endEff
          })()
        if (overlaps) {
          out.push({
            employeeId: w.employeeId,
            workDate: w.workDate,
            kind: 'availability',
            severity: 'soft',
            detail: { slot },
          })
        }
      }
    }
  }

  return out
}

/** Convenience: does this week have any hard conflict (publish gate mirror)? */
export function hasHardConflict(week: RosterWeekInput): boolean {
  return detectConflicts(week).some((c) => c.severity === 'hard')
}
