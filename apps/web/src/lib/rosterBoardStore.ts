import boardJson from '@/mocks/roster-board.json'
import { loadSuggestedOverride } from '@/lib/rosterStore'

const KEY = 'ifmp_retail_roster_board_assignments'

/** Soft overstaff when day headcount > target × this multiplier (PRODUCT staffing.overstaff_multiplier). */
export const OVERSTAFF_MULTIPLIER = 1.5

export type BoardAssignment = {
  id: string
  employeeId: string
  station: string
  workDate: string // YYYY-MM-DD
  templateId: string
}

export type BoardEmployee = {
  id: string
  nameZh: string
  station: string
  minHoursPerWeek: number
  maxHoursPerWeek: number
}

export type BoardTemplate = {
  id: string
  name: string
  station: string
  startTime: string
  endTime: string
  color: string
}

export type BoardConflict = {
  type: 'double_booking' | 'overstaff' | 'understaff'
  severity: 'hard' | 'soft'
  message: string
}

export type BoardState = {
  weekStart: string
  employees: BoardEmployee[]
  templates: BoardTemplate[]
  assignments: BoardAssignment[]
  /**
   * Target headcount callout per day (same for each day in the demo week).
   *
   * Formula: `targetHeadcount = max(demandSuggested[])`
   * — peak of the demand-layer hourly `suggested` series (session override wins
   * over mock `demandSuggested`). Soft understaff when unique assignees that day
   * are below target; soft overstaff when count > target × OVERSTAFF_MULTIPLIER.
   */
  targetHeadcount: number
  demandSuggested: number[]
}

type BoardMockData = {
  weekStart: string
  demandSuggested: number[]
  employees: BoardEmployee[]
  templates: BoardTemplate[]
  assignments: BoardAssignment[]
}

const seed = (boardJson as { data: BoardMockData }).data

function readOverrides(): BoardAssignment[] | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return null
    return arr as BoardAssignment[]
  } catch {
    return null
  }
}

function writeOverrides(assignments: BoardAssignment[]) {
  sessionStorage.setItem(KEY, JSON.stringify(assignments))
}

/**
 * Peak of demand suggested headcount — used as daily target callout on the week board.
 * Session override from the demand tuner takes precedence when present.
 */
export function peakSuggestedHeadcount(suggested: number[]): number {
  if (!suggested.length) return 0
  return Math.max(...suggested)
}

export function loadBoard(): BoardState {
  const demandSuggested = loadSuggestedOverride() ?? [...seed.demandSuggested]
  const targetHeadcount = peakSuggestedHeadcount(demandSuggested)
  const overrides = readOverrides()
  return {
    weekStart: seed.weekStart,
    employees: seed.employees,
    templates: seed.templates,
    assignments: overrides ?? seed.assignments.map((a) => ({ ...a })),
    targetHeadcount,
    demandSuggested,
  }
}

export function upsertAssignment(a: BoardAssignment): void {
  const state = loadBoard()
  const next = state.assignments.filter((x) => x.id !== a.id)
  next.push({ ...a })
  writeOverrides(next)
}

export function removeAssignment(id: string): void {
  const state = loadBoard()
  writeOverrides(state.assignments.filter((x) => x.id !== id))
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function shiftHours(start: string, end: string): number {
  let s = toMinutes(start)
  let e = toMinutes(end)
  if (e <= s) e += 24 * 60
  return (e - s) / 60
}

export function detectConflicts(state: BoardState): BoardConflict[] {
  const found: BoardConflict[] = []
  const empDateSlots = new Map<string, { start: number; end: number; id: string }[]>()

  for (const a of state.assignments) {
    const tmpl = state.templates.find((t) => t.id === a.templateId)
    if (!tmpl) continue
    const key = `${a.employeeId}:${a.workDate}`
    let start = toMinutes(tmpl.startTime)
    let end = toMinutes(tmpl.endTime)
    if (end <= start) end += 24 * 60
    const slots = empDateSlots.get(key) ?? []
    for (const slot of slots) {
      if (start < slot.end && end > slot.start) {
        const emp = state.employees.find((e) => e.id === a.employeeId)
        found.push({
          type: 'double_booking',
          severity: 'hard',
          message: `${emp?.nameZh ?? a.employeeId} 在 ${a.workDate} 有時段衝突`,
        })
      }
    }
    slots.push({ start, end, id: a.id })
    empDateSlots.set(key, slots)
  }

  const byDate = new Map<string, Set<string>>()
  for (const a of state.assignments) {
    const set = byDate.get(a.workDate) ?? new Set()
    set.add(a.employeeId)
    byDate.set(a.workDate, set)
  }

  const dates = weekDates(state.weekStart)
  for (const date of dates) {
    const count = byDate.get(date)?.size ?? 0
    const target = state.targetHeadcount
    if (count < target) {
      found.push({
        type: 'understaff',
        severity: 'soft',
        message: `${date} 人手不足（${count}/${target}）`,
      })
    } else if (count > target * OVERSTAFF_MULTIPLIER) {
      found.push({
        type: 'overstaff',
        severity: 'soft',
        message: `${date} 人手過剩（${count}/${target}）`,
      })
    }
  }

  return found
}

export function weekDates(weekStart: string): string[] {
  const start = new Date(`${weekStart}T00:00:00`)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })
}

export function assignmentHours(state: BoardState, employeeId: string): number {
  let total = 0
  for (const a of state.assignments) {
    if (a.employeeId !== employeeId) continue
    const tmpl = state.templates.find((t) => t.id === a.templateId)
    if (!tmpl) continue
    total += shiftHours(tmpl.startTime, tmpl.endTime)
  }
  return total
}

export const STATIONS = ['樓面', '試衣', '收銀'] as const
