import { describe, expect, it } from 'vitest'
import {
  detectConflicts,
  effectiveLimits,
  type RosterWeekInput,
} from './conflicts'
import type {
  AssignmentRow,
  EmployeeRow,
  HourPolicyRow,
  ShiftTemplateRow,
  UnavailableSlot,
} from './types'

// ---------- fixture builders ----------

const WEEK_START = '2099-01-05' // Monday

function emp(over: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    id: 'e1',
    branch_id: 'b1',
    name_zh: '驗證A',
    name_en: '',
    station: '樓面',
    employment_type: 'full_time',
    min_hours_per_week: 0,
    max_hours_per_week: 48,
    is_active: true,
    ...over,
  }
}

function tmpl(over: Partial<ShiftTemplateRow> = {}): ShiftTemplateRow {
  return {
    id: 's1',
    branch_id: 'b1',
    name: 'VS1',
    start_time: '09:00',
    end_time: '13:00',
    color: '#B45309',
    station: '樓面',
    headcount_target: 1,
    is_active: true,
    ...over,
  }
}

function asg(over: Partial<AssignmentRow> = {}): AssignmentRow {
  return {
    id: 'a1',
    roster_week_id: 'w1',
    employee_id: 'e1',
    shift_template_id: 's1',
    work_date: WEEK_START,
    notes: '',
    ...over,
  }
}

function week(over: Partial<RosterWeekInput> = {}): RosterWeekInput {
  return {
    weekStart: WEEK_START,
    assignments: [],
    templates: [],
    employees: [],
    policies: [],
    availability: [],
    ...over,
  }
}

function slot(over: Partial<UnavailableSlot> = {}): UnavailableSlot {
  return { dayOfWeek: 0, allDay: false, startTime: '00:00', endTime: '23:59', ...over }
}

const kinds = (cs: ReturnType<typeof detectConflicts>) =>
  cs.map((c) => `${c.employeeId}|${c.workDate}|${c.kind}|${c.severity}`).sort()

// ---------- tests ----------

describe('effectiveLimits', () => {
  it('falls back to employee columns when no policy', () => {
    const e = emp({ min_hours_per_week: 10, max_hours_per_week: 40 })
    expect(effectiveLimits(e, undefined)).toEqual({
      min: 10,
      max: 40,
      hardBlock: false,
    })
  })

  it('prefers hour_policies row (MeDo bug fix)', () => {
    const e = emp({ min_hours_per_week: 10, max_hours_per_week: 40 })
    const p: HourPolicyRow = {
      employee_id: 'e1',
      min_hours_per_week: 5,
      max_hours_per_week: 20,
      hard_block_overtime: true,
    }
    expect(effectiveLimits(e, p)).toEqual({ min: 5, max: 20, hardBlock: true })
  })
})

describe('detectConflicts', () => {
  it('clean week → no conflicts', () => {
    const w = week({
      employees: [emp()],
      templates: [tmpl()],
      assignments: [asg()],
    })
    expect(detectConflicts(w)).toEqual([])
  })

  it('double booking same day overlap → hard', () => {
    const w = week({
      employees: [emp()],
      templates: [
        tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' }),
        tmpl({ id: 's2', start_time: '12:00', end_time: '16:00' }),
      ],
      assignments: [
        asg({ id: 'a1', shift_template_id: 's1' }),
        asg({ id: 'a2', shift_template_id: 's2' }),
      ],
    })
    const cs = detectConflicts(w)
    expect(kinds(cs)).toEqual([`e1|${WEEK_START}|double_booking|hard`])
    expect(cs[0].detail).toMatchObject({ a: expect.any(String), b: expect.any(String) })
  })

  it('overnight shifts (22:00–06:00 vs 23:00–03:00) overlap on same work_date', () => {
    // overnight: end <= start ⇒ +24h, so [22:00,30:00] vs [23:00,27:00] overlap.
    // Naive (non-overnight-aware) comparison would see [1320,360] vs [1380,180]
    // and miss this — same semantics as SQL end_eff +24h.
    const w = week({
      employees: [emp()],
      templates: [
        tmpl({ id: 's1', start_time: '22:00', end_time: '06:00' }),
        tmpl({ id: 's2', start_time: '23:00', end_time: '03:00' }),
      ],
      assignments: [
        asg({ id: 'a1', shift_template_id: 's1' }),
        asg({ id: 'a2', shift_template_id: 's2' }),
      ],
    })
    expect(kinds(detectConflicts(w))).toEqual([
      `e1|${WEEK_START}|double_booking|hard`,
    ])
  })

  it('overnight shift vs early-morning shift same date do NOT overlap (48h timeline anchored at work_date — SQL parity)', () => {
    // 22:00–06:00 on D occupies [22:00 D, 06:00 D+1]; 02:00–06:00 on D occupies
    // early morning of D itself. Both engines (TS + SQL) compare same work_date only.
    const w = week({
      employees: [emp()],
      templates: [
        tmpl({ id: 's1', start_time: '22:00', end_time: '06:00' }),
        tmpl({ id: 's2', start_time: '02:00', end_time: '06:00' }),
      ],
      assignments: [
        asg({ id: 'a1', shift_template_id: 's1' }),
        asg({ id: 'a2', shift_template_id: 's2' }),
      ],
    })
    expect(detectConflicts(w)).toEqual([])
  })

  it('back-to-back shifts (13:00 end / 13:00 start) do NOT conflict', () => {
    const w = week({
      employees: [emp()],
      templates: [
        tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' }),
        tmpl({ id: 's2', start_time: '13:00', end_time: '17:00' }),
      ],
      assignments: [
        asg({ id: 'a1', shift_template_id: 's1' }),
        asg({ id: 'a2', shift_template_id: 's2' }),
      ],
    })
    expect(detectConflicts(w)).toEqual([])
  })

  it('overtime soft: weekly hours > max, no hard block', () => {
    const w = week({
      employees: [emp({ max_hours_per_week: 6 })],
      templates: [tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' })], // 4h
      assignments: [
        asg({ id: 'a1', work_date: '2099-01-05' }),
        asg({ id: 'a2', work_date: '2099-01-06' }), // 8h > 6
      ],
    })
    expect(kinds(detectConflicts(w))).toEqual([`e1|${WEEK_START}|overtime|soft`])
    const c = detectConflicts(w)[0]
    expect(c.detail).toMatchObject({ hours: 8, max: 6 })
  })

  it('overtime hard via hard_block_overtime policy', () => {
    const w = week({
      employees: [emp()],
      policies: [
        {
          employee_id: 'e1',
          min_hours_per_week: 0,
          max_hours_per_week: 6,
          hard_block_overtime: true,
        },
      ],
      templates: [tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' })],
      assignments: [
        asg({ id: 'a1', work_date: '2099-01-05' }),
        asg({ id: 'a2', work_date: '2099-01-06' }),
      ],
    })
    expect(kinds(detectConflicts(w))).toEqual([
      `e1|${WEEK_START}|overtime_hard|hard`,
    ])
  })

  it('below_min soft only when employee has ≥1 assignment', () => {
    const w = week({
      employees: [emp({ min_hours_per_week: 10 })],
      templates: [tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' })],
      assignments: [asg({ id: 'a1' })], // 4h < 10
    })
    expect(kinds(detectConflicts(w))).toEqual([`e1|${WEEK_START}|below_min|soft`])

    // no assignments → no below_min
    const w0 = week({ employees: [emp({ min_hours_per_week: 10 })] })
    expect(detectConflicts(w0)).toEqual([])
  })

  it('availability overlap → soft, allDay hits any shift', () => {
    const w = week({
      employees: [emp()],
      templates: [tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' })],
      assignments: [asg({ id: 'a1', work_date: '2099-01-06' })], // Tuesday
      availability: [
        {
          employee_id: 'e1',
          week_start: WEEK_START,
          unavailable_slots: [slot({ dayOfWeek: 1, allDay: true })], // Tuesday (ISO-1)
        },
      ],
    })
    expect(kinds(detectConflicts(w))).toEqual([
      `e1|2099-01-06|availability|soft`,
    ])
  })

  it('availability partial-window overlap + miss', () => {
    const t = [tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' })]
    const a = [asg({ id: 'a1', work_date: WEEK_START })] // Monday 09–13
    const hit = week({
      employees: [emp()],
      templates: t,
      assignments: a,
      availability: [
        {
          employee_id: 'e1',
          week_start: WEEK_START,
          unavailable_slots: [slot({ dayOfWeek: 0, startTime: '12:00', endTime: '14:00' })],
        },
      ],
    })
    expect(kinds(detectConflicts(hit))).toEqual([
      `e1|${WEEK_START}|availability|soft`,
    ])
    const miss = week({
      employees: [emp()],
      templates: t,
      assignments: a,
      availability: [
        {
          employee_id: 'e1',
          week_start: WEEK_START,
          unavailable_slots: [slot({ dayOfWeek: 0, startTime: '14:00', endTime: '18:00' })],
        },
      ],
    })
    expect(detectConflicts(miss)).toEqual([])
  })

  it('SQL parity: Task-1 verification fixture → double_booking/hard only', () => {
    // Mirrors the MCP verification of migration 20260916000004:
    // e1 max 48h, VS1 09:00–13:00 + VS2 12:00–16:00 same date.
    // SQL private.roster_conflicts returned: double_booking | hard (1 row).
    const w = week({
      employees: [emp({ min_hours_per_week: 0, max_hours_per_week: 48 })],
      templates: [
        tmpl({ id: 's1', start_time: '09:00', end_time: '13:00' }),
        tmpl({ id: 's2', start_time: '12:00', end_time: '16:00' }),
      ],
      assignments: [
        asg({ id: 'a1', shift_template_id: 's1' }),
        asg({ id: 'a2', shift_template_id: 's2' }),
      ],
    })
    const cs = detectConflicts(w)
    expect(cs).toHaveLength(1)
    expect(cs[0]).toMatchObject({
      employeeId: 'e1',
      workDate: WEEK_START,
      kind: 'double_booking',
      severity: 'hard',
    })
  })

  it('assignments for unknown employee/template are ignored safely', () => {
    const w = week({
      employees: [],
      templates: [],
      assignments: [asg()],
    })
    expect(detectConflicts(w)).toEqual([])
  })
})
