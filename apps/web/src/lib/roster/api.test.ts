import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssignmentRow, EmployeeRow, RosterWeekRow } from './types'

// ---- mock holder (vi.mock is hoisted) ----
const h = vi.hoisted(() => {
  const state: {
    client: any
    tables: Record<string, any[]>
    results: Record<string, { data: unknown; error: unknown }>
  } = { client: null, tables: {}, results: {} }
  return state
})

vi.mock('@/lib/supabase', () => ({
  createFlowSupabase: vi.fn(() => h.client),
}))

import {
  RosterError,
  addAssignments,
  copyWeek,
  createEmployee,
  createTemplate,
  deleteTemplate,
  fetchAudit,
  fetchEmployees,
  fetchManagedBranchId,
  fetchMonthAssignments,
  fetchPolicies,
  fetchSwaps,
  fetchTemplates,
  fetchWeekData,
  isoWeekInfo,
  mapRpcError,
  publishWeek,
  removeAssignment,
  reviewSwap,
  unpublishWeek,
  updateEmployee,
  updateTemplate,
  upsertPolicy,
} from './api'

// ---- chainable query-builder fake ----

function promiseOf(state: { data: unknown; error: unknown }) {
  // supabase-js semantics: query errors arrive as { data, error } resolution,
  // NOT a rejected promise — the api layer maps error → RosterError itself.
  return Promise.resolve({ data: state.data, error: state.error })
}

function makeQB(state: { data: unknown; error: unknown }) {
  const qb: any = {}
  for (const m of [
    'select',
    'eq',
    'gte',
    'lte',
    'in',
    'order',
    'range',
    'limit',
    'insert',
    'update',
    'upsert',
    'delete',
  ]) {
    qb[m] = vi.fn(() => qb)
  }
  qb.single = vi.fn(() => promiseOf(state))
  qb.maybeSingle = vi.fn(() => promiseOf(state))
  qb.then = (
    res: (v: unknown) => unknown,
    rej: (e: unknown) => unknown,
  ) => promiseOf(state).then(res, rej)
  return qb
}

function makeClient() {
  const fns: Record<string, ReturnType<typeof vi.fn>> = {}
  h.client = {
    from: vi.fn((table: string) => {
      const st = h.results[table] ?? { data: [], error: null }
      const qb = makeQB(st)
      fns[table] = qb
      return qb
    }),
    rpc: vi.fn((name: string, args: unknown) => {
      const st = h.results[`rpc:${name}`] ?? { data: null, error: null }
      const p = promiseOf(st) as any
      p.rpcArgs = args
      fns[`rpc:${name}`] = p
      return p
    }),
  }
  h.results = {}
  return fns
}

beforeEach(() => {
  makeClient()
})

// ---- fixtures ----

const WEEK: RosterWeekRow = {
  id: 'w1',
  branch_id: 'b1',
  year: 2026,
  week_number: 2,
  week_start: '2026-01-05',
  status: 'draft',
  published_at: null,
  published_by: null,
}

const EMP: EmployeeRow = {
  id: 'e1',
  branch_id: 'b1',
  name_zh: '陳大文',
  name_en: 'Chan Tai Man',
  station: '樓面',
  employment_type: 'full_time',
  min_hours_per_week: 0,
  max_hours_per_week: 48,
  is_active: true,
}

const ASG: AssignmentRow = {
  id: 'a1',
  roster_week_id: 'w1',
  employee_id: 'e1',
  shift_template_id: 's1',
  work_date: '2026-01-05',
  notes: '',
}

// ---- tests ----

describe('isoWeekInfo', () => {
  it('computes ISO year + week (Monday start)', () => {
    expect(isoWeekInfo('2026-01-05')).toEqual({ year: 2026, weekNumber: 2 })
    expect(isoWeekInfo('2024-12-30')).toEqual({ year: 2025, weekNumber: 1 })
    expect(isoWeekInfo('2026-09-14')).toEqual({ year: 2026, weekNumber: 38 })
  })
})

describe('mapRpcError', () => {
  it('maps known P0001 codes to typed RosterError', () => {
    expect(mapRpcError({ message: 'HARD_CONFLICT' }).code).toBe('HARD_CONFLICT')
    expect(mapRpcError({ message: 'NOT_DRAFT' }).code).toBe('NOT_DRAFT')
    expect(mapRpcError({ message: 'FORBIDDEN' }).code).toBe('FORBIDDEN')
    expect(mapRpcError({ message: 'CROSS_BRANCH' }).code).toBe('CROSS_BRANCH')
    expect(mapRpcError({ message: 'NOT_PENDING' }).code).toBe('NOT_PENDING')
    expect(mapRpcError({ message: 'NOT_FOUND' }).code).toBe('NOT_FOUND')
    expect(mapRpcError({ message: 'something else' }).code).toBe('UNKNOWN')
  })

  it('RosterError is an Error with code', () => {
    const e = new RosterError('HARD_CONFLICT', 'HARD_CONFLICT')
    expect(e).toBeInstanceOf(Error)
    expect(e.code).toBe('HARD_CONFLICT')
  })
})

describe('fetchWeekData', () => {
  it('returns existing week bundle without inserting', async () => {
    h.results.roster_weeks = { data: WEEK, error: null }
    h.results.assignments = { data: [ASG], error: null }
    h.results.shift_templates = { data: [], error: null }
    h.results.employees = { data: [EMP], error: null }
    h.results.hour_policies = { data: [], error: null }
    h.results.availability_notes = { data: [], error: null }

    const bundle = await fetchWeekData('b1', '2026-01-05')
    expect(bundle.week.id).toBe('w1')
    expect(bundle.assignments).toEqual([ASG])
    expect(bundle.employees).toEqual([EMP])
    expect(h.client.from).toHaveBeenCalledWith('roster_weeks')
    // no insert path
    const weeksQB = (h.client.from as any).mock.results[0].value
    expect(weeksQB.insert).not.toHaveBeenCalled()
  })

  it('creates a draft week when missing (fetch-or-create)', async () => {
    // first call → maybeSingle null; second call (after insert) → single week
    let weekCall = 0
    h.client.from = vi.fn((table: string) => {
      if (table === 'roster_weeks') {
        weekCall += 1
        return makeQB(weekCall === 1 ? { data: null, error: null } : { data: WEEK, error: null })
      }
      return makeQB({ data: [], error: null })
    })

    const bundle = await fetchWeekData('b1', '2026-01-05')
    expect(bundle.week.id).toBe('w1')
    // call[0] = SELECT (maybeSingle null); call[1] = INSERT…single path
    const weeksQB = (h.client.from as any).mock.results[1].value
    expect(weeksQB.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        branch_id: 'b1',
        week_start: '2026-01-05',
        year: 2026,
        week_number: 2,
        status: 'draft',
      }),
    )
  })
})

describe('assignment mutations', () => {
  it('addAssignments batch-inserts scoped to the week', async () => {
    h.results.assignments = { data: [ASG], error: null }
    const rows = await addAssignments('w1', [
      { employee_id: 'e1', shift_template_id: 's1', work_date: '2026-01-05' },
    ])
    expect(rows).toEqual([ASG])
    const qb = (h.client.from as any).mock.results[0].value
    expect(qb.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        roster_week_id: 'w1',
        employee_id: 'e1',
        shift_template_id: 's1',
      }),
    ])
  })

  it('removeAssignment deletes by id', async () => {
    h.results.assignments = { data: null, error: null }
    await removeAssignment('a1')
    const qb = (h.client.from as any).mock.results[0].value
    expect(qb.delete).toHaveBeenCalled()
    expect(qb.eq).toHaveBeenCalledWith('id', 'a1')
  })
})

describe('publish / unpublish / copy RPC wrappers', () => {
  it('publishWeek resolves on success', async () => {
    h.results['rpc:publish_roster_week'] = { data: null, error: null }
    await expect(publishWeek('w1')).resolves.toBeUndefined()
    expect(h.client.rpc).toHaveBeenCalledWith('publish_roster_week', { wid: 'w1' })
  })

  it('publishWeek maps HARD_CONFLICT to typed error', async () => {
    h.results['rpc:publish_roster_week'] = {
      data: null,
      error: { message: 'HARD_CONFLICT', code: 'P0001' },
    }
    await expect(publishWeek('w1')).rejects.toMatchObject({ code: 'HARD_CONFLICT' })
  })

  it('unpublishWeek maps NOT_DRAFT', async () => {
    h.results['rpc:unpublish_roster_week'] = {
      data: null,
      error: { message: 'NOT_DRAFT', code: 'P0001' },
    }
    await expect(unpublishWeek('w1')).rejects.toMatchObject({ code: 'NOT_DRAFT' })
  })

  it('copyWeek returns inserted count', async () => {
    h.results['rpc:copy_roster_week'] = { data: 3, error: null }
    await expect(copyWeek('wA', 'wB')).resolves.toBe(3)
    expect(h.client.rpc).toHaveBeenCalledWith('copy_roster_week', {
      src: 'wA',
      dst: 'wB',
    })
  })

  it('copyWeek maps FORBIDDEN', async () => {
    h.results['rpc:copy_roster_week'] = {
      data: null,
      error: { message: 'FORBIDDEN', code: 'P0001' },
    }
    await expect(copyWeek('wA', 'wB')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('swaps + audit queries', () => {
  it('reviewSwap passes args through', async () => {
    h.results['rpc:review_swap_request'] = { data: null, error: null }
    await reviewSwap('s1', true, 'ok')
    expect(h.client.rpc).toHaveBeenCalledWith('review_swap_request', {
      sid: 's1',
      approve: true,
      notes: 'ok',
    })
  })

  it('fetchSwaps orders newest first (branch scope via employees join)', async () => {
    h.results.swap_requests = { data: [], error: null }
    await fetchSwaps()
    const qb = (h.client.from as any).mock.results[0].value
    expect(qb.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(qb.select).toHaveBeenCalledWith(
      '*, requester:requester_employee_id(branch_id), target:target_employee_id(branch_id)',
    )
    expect(qb.eq).not.toHaveBeenCalled()
  })

  it('fetchAudit pages by created_at desc + range', async () => {
    h.results.audit_logs = { data: [], error: null }
    await fetchAudit({ limit: 50, offset: 100 })
    const qb = (h.client.from as any).mock.results[0].value
    expect(qb.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(qb.range).toHaveBeenCalledWith(100, 149)
  })
})

describe('manager branch + month query', () => {
  it('fetchManagedBranchId returns the managed branch or null', async () => {
    h.results.branch_managers = { data: [{ branch_id: 'b1' }], error: null }
    await expect(fetchManagedBranchId('p1')).resolves.toBe('b1')

    h.results.branch_managers = { data: [], error: null }
    await expect(fetchManagedBranchId('p2')).resolves.toBeNull()
  })

  it('fetchMonthAssignments queries week range then assignments by week ids', async () => {
    h.results.roster_weeks = { data: [{ id: 'w1' }, { id: 'w2' }], error: null }
    h.results.assignments = { data: [ASG], error: null }
    const rows = await fetchMonthAssignments('b1', '2026-09-16')
    expect(rows).toEqual([ASG])
    const weeksQB = (h.client.from as any).mock.results[0].value
    expect(weeksQB.gte).toHaveBeenCalledWith('week_start', '2026-08-31')
    expect(weeksQB.lte).toHaveBeenCalledWith('week_start', '2026-10-04')
    const asgQB = (h.client.from as any).mock.results[1].value
    expect(asgQB.in).toHaveBeenCalledWith('roster_week_id', ['w1', 'w2'])
  })

  it('fetchMonthAssignments returns [] when no weeks', async () => {
    h.results.roster_weeks = { data: [], error: null }
    await expect(fetchMonthAssignments('b1', '2026-09-16')).resolves.toEqual([])
  })
})

describe('staff / templates / policies CRUD', () => {
  it('createEmployee inserts with defaults', async () => {
    h.results.employees = { data: [EMP], error: null }
    await createEmployee('b1', {
      name_zh: '陳大文',
      name_en: 'Chan Tai Man',
      station: '樓面',
      employment_type: 'full_time',
    })
    const qb = (h.client.from as any).mock.results[0].value
    expect(qb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ branch_id: 'b1', name_zh: '陳大文' }),
    )
  })

  it('updateEmployee patches by id', async () => {
    h.results.employees = { data: null, error: null }
    await updateEmployee('e1', { max_hours_per_week: 40 })
    const qb = (h.client.from as any).mock.results[0].value
    expect(qb.update).toHaveBeenCalledWith({ max_hours_per_week: 40 })
    expect(qb.eq).toHaveBeenCalledWith('id', 'e1')
  })

  it('createTemplate / updateTemplate / deleteTemplate', async () => {
    h.results.shift_templates = { data: [], error: null }
    await createTemplate('b1', {
      name: '早',
      start_time: '09:00',
      end_time: '13:00',
      station: '樓面',
    })
    await updateTemplate('s1', { headcount_target: 2 })
    await deleteTemplate('s1')
    const calls = (h.client.from as any).mock.results.map(
      (r: any) => r.value,
    )
    expect(calls[0].insert).toHaveBeenCalled()
    expect(calls[1].update).toHaveBeenCalledWith({ headcount_target: 2 })
    expect(calls[2].delete).toHaveBeenCalled()
    expect(calls[2].eq).toHaveBeenCalledWith('id', 's1')
  })

  it('upsertPolicy keyed on employee_id', async () => {
    h.results.hour_policies = { data: [], error: null }
    await upsertPolicy({
      employee_id: 'e1',
      min_hours_per_week: 10,
      max_hours_per_week: 40,
      hard_block_overtime: true,
    })
    const qb = (h.client.from as any).mock.results[0].value
    expect(qb.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: 'e1', max_hours_per_week: 40 }),
      expect.objectContaining({ onConflict: 'employee_id' }),
    )
  })

  it('fetchEmployees / fetchTemplates / fetchPolicies scope by branch', async () => {
    h.results.employees = { data: [EMP], error: null }
    h.results.shift_templates = { data: [], error: null }
    h.results.hour_policies = { data: [], error: null }

    expect(await fetchEmployees('b1')).toEqual([EMP])
    const empQb = (h.client.from as any).mock.results[0].value
    expect(empQb.eq).toHaveBeenCalledWith('branch_id', 'b1')
    expect(empQb.order).toHaveBeenCalledWith('is_active', { ascending: false })

    await fetchTemplates('b1')
    await fetchPolicies('b1')
    const calls = (h.client.from as any).mock.results.map((r: any) => r.value)
    expect(calls[1].eq).toHaveBeenCalledWith('branch_id', 'b1')
    expect(calls[1].order).toHaveBeenCalledWith('start_time')
    expect(calls[2].eq).toHaveBeenCalledWith('employees.branch_id', 'b1')
  })
})
