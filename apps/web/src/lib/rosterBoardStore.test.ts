import { afterEach, beforeEach, expect, test } from 'vitest'
import {
  detectConflicts,
  loadBoard,
  removeAssignment,
  upsertAssignment,
  type BoardAssignment,
  type BoardState,
} from './rosterBoardStore'

const KEY = 'ifmp_retail_roster_board_assignments'

function baseState(overrides: Partial<BoardState> = {}): BoardState {
  const board = loadBoard()
  return {
    ...board,
    assignments: [],
    ...overrides,
  }
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

test('detectConflicts marks overlapping same-day shifts as hard double_booking', () => {
  const state = baseState({
    assignments: [
      {
        id: 'a1',
        employeeId: 'emp-mei',
        station: '樓面',
        workDate: '2026-09-01',
        templateId: 'tmpl-am',
      },
      {
        id: 'a2',
        employeeId: 'emp-mei',
        station: '樓面',
        workDate: '2026-09-01',
        templateId: 'tmpl-mid',
      },
    ],
  })

  const conflicts = detectConflicts(state)
  const hard = conflicts.filter((c) => c.type === 'double_booking')

  expect(hard.length).toBeGreaterThanOrEqual(1)
  expect(hard.every((c) => c.severity === 'hard')).toBe(true)
  expect(hard[0]?.message).toMatch(/衝突|double/i)
})

test('detectConflicts reports soft understaff when day headcount is below target', () => {
  const state = baseState({
    assignments: [
      {
        id: 'a1',
        employeeId: 'emp-mei',
        station: '樓面',
        workDate: '2026-09-01',
        templateId: 'tmpl-am',
      },
    ],
  })

  const conflicts = detectConflicts(state)
  const under = conflicts.filter((c) => c.type === 'understaff')

  expect(under.length).toBeGreaterThanOrEqual(1)
  expect(under.every((c) => c.severity === 'soft')).toBe(true)
})

test('detectConflicts reports soft overstaff when day headcount exceeds target × 1.5', () => {
  const state = baseState({ targetHeadcount: 2 })
  const needed = Math.ceil(2 * 1.5) + 1
  const assignments: BoardAssignment[] = state.employees.slice(0, needed).map((emp, i) => ({
    id: `over-${i}`,
    employeeId: emp.id,
    station: emp.station,
    workDate: '2026-09-02',
    templateId: state.templates.find((t) => t.station === emp.station)?.id ?? state.templates[0]!.id,
  }))

  const conflicts = detectConflicts({ ...state, assignments })
  const over = conflicts.filter((c) => c.type === 'overstaff')

  expect(over.length).toBeGreaterThanOrEqual(1)
  expect(over.every((c) => c.severity === 'soft')).toBe(true)
})

test('upsertAssignment and removeAssignment persist via sessionStorage', () => {
  const assignment: BoardAssignment = {
    id: 'new-1',
    employeeId: 'emp-mei',
    station: '樓面',
    workDate: '2026-09-03',
    templateId: 'tmpl-am',
  }

  upsertAssignment(assignment)
  expect(loadBoard().assignments.some((a) => a.id === 'new-1')).toBe(true)
  expect(JSON.parse(sessionStorage.getItem(KEY) as string)).toEqual(
    expect.arrayContaining([expect.objectContaining({ id: 'new-1' })]),
  )

  removeAssignment('new-1')
  expect(loadBoard().assignments.some((a) => a.id === 'new-1')).toBe(false)
})

test('loadBoard exposes fashion stations 樓面 / 試衣 / 收銀', () => {
  const board = loadBoard()
  const stations = new Set(board.templates.map((t) => t.station))
  expect(stations.has('樓面')).toBe(true)
  expect(stations.has('試衣')).toBe(true)
  expect(stations.has('收銀')).toBe(true)
})
