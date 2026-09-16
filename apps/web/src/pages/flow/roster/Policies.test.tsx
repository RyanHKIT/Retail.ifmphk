// Task 8 component contract (plan Task 8): per-employee hour-policy table shows
// policy values (or registry defaults) with hard/soft badges; the edit dialog
// prefills policy values, else the employee registry defaults; min<=max is
// validated before submit; save goes through upsertPolicy (api handles
// onConflict employee_id).
// The api layer and auth context are mocked; FlowLocaleProvider is REAL.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import type { EmployeeRow, HourPolicyRow, Station } from '@/lib/roster/types'
import { PoliciesPage } from './Policies'

// ---- hoisted mock state (vi.mock factories are hoisted) ----

const h = vi.hoisted(() => {
  const state: {
    employees: any[]
    policies: any[]
    failEmployees: boolean
    calls: { upsert: any[] }
  } = {
    employees: [],
    policies: [],
    failEmployees: false,
    calls: { upsert: [] },
  }
  return { state }
})

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => ({
    session: { user: { id: 'p1' } },
    profile: {
      id: 'p1',
      email: 'manager@ifmphk.com',
      display_name: 'Pilot Manager',
      role: 'branch_manager',
    },
    loading: false,
    resolvingProfile: false,
    signIn: async () => ({ error: null }),
    signOut: async () => {},
  }),
}))

vi.mock('@/lib/roster/api', () => ({
  RosterError: class extends Error {
    code: string
    constructor(code: string) {
      super(code)
      this.code = code
    }
  },
  fetchManagedBranchId: vi.fn(async () => 'b1'),
  fetchEmployees: vi.fn(async () => {
    if (h.state.failEmployees) throw new Error('db down')
    return h.state.employees
  }),
  fetchPolicies: vi.fn(async () => h.state.policies),
  upsertPolicy: vi.fn(async (policy: any) => {
    h.state.calls.upsert.push(policy)
    const i = h.state.policies.findIndex(
      (p: any) => p.employee_id === policy.employee_id,
    )
    if (i >= 0) h.state.policies[i] = { ...h.state.policies[i], ...policy }
    else h.state.policies.push({ ...policy })
  }),
}))

// ---- fixtures ----

function emp(
  id: string,
  name: string,
  station: Station,
  min: number,
  max: number,
): EmployeeRow {
  return {
    id,
    branch_id: 'b1',
    name_zh: name,
    name_en: '',
    station,
    employment_type: 'full_time',
    min_hours_per_week: min,
    max_hours_per_week: max,
    is_active: true,
  }
}

function policy(
  employeeId: string,
  min: number,
  max: number,
  hard: boolean,
): HourPolicyRow {
  return {
    employee_id: employeeId,
    min_hours_per_week: min,
    max_hours_per_week: max,
    hard_block_overtime: hard,
  }
}

function resetState() {
  h.state.employees = [
    emp('e1', '陳大文', '樓面', 8, 40),
    emp('e2', '李小美', '收銀', 12, 44),
  ]
  h.state.policies = [policy('e1', 10, 50, true)]
  h.state.failEmployees = false
  h.state.calls = { upsert: [] }
}

beforeEach(() => {
  localStorage.removeItem('ifmp_flow_locale')
  resetState()
})

// ---- harness ----

function renderPolicies() {
  return render(
    <FlowLocaleProvider>
      <PoliciesPage />
    </FlowLocaleProvider>,
  )
}

function rowOf(id: string) {
  const el = screen
    .getAllByTestId('policy-row')
    .find((n) => n.dataset.employee === id)
  expect(el).toBeTruthy()
  return within(el as HTMLElement)
}

// ---- tests ----

describe('Policies (Task 8 contract)', () => {
  it('renders both employees: policy row shows values + hard badge, default row shows registry defaults', async () => {
    renderPolicies()
    expect((await screen.findAllByTestId('policy-row')).length).toBe(2)

    // e1 has a hard policy overriding its registry defaults (8/40)
    const e1 = rowOf('e1')
    expect(e1.getByText('陳大文')).toBeInTheDocument()
    expect(e1.getByText('10 小時')).toBeInTheDocument()
    expect(e1.getByText('50 小時')).toBeInTheDocument()
    expect(e1.getByTestId('policy-rule-hard')).toHaveTextContent('硬性封鎖超時')
    expect(e1.queryByTestId('policy-default')).toBeNull()

    // e2 has no policy: registry defaults 12/44 with the default marker
    const e2 = rowOf('e2')
    expect(e2.getByText('李小美')).toBeInTheDocument()
    expect(e2.getByText('12 小時')).toBeInTheDocument()
    expect(e2.getByText('44 小時')).toBeInTheDocument()
    expect(e2.getByTestId('policy-default')).toHaveTextContent(
      '所有員工使用名冊上的預設工時。',
    )
    expect(e2.queryByTestId('policy-rule-hard')).toBeNull()
  })

  it('edit dialog prefills registry defaults for a policy-less employee; save calls upsertPolicy', async () => {
    renderPolicies()
    expect((await screen.findAllByTestId('policy-row')).length).toBe(2)

    await userEvent.click(screen.getByTestId('policy-edit-e2'))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('李小美')

    const min = within(dialog).getByLabelText('最少工時') as HTMLInputElement
    const max = within(dialog).getByLabelText('最多工時') as HTMLInputElement
    const hard = within(dialog).getByLabelText('硬性封鎖超時') as HTMLInputElement
    expect(min.value).toBe('12')
    expect(max.value).toBe('44')
    expect(hard.checked).toBe(false)

    await userEvent.clear(min)
    await userEvent.type(min, '10')
    await userEvent.clear(max)
    await userEvent.type(max, '46')
    await userEvent.click(hard)
    await userEvent.click(within(dialog).getByRole('button', { name: '儲存' }))

    await waitFor(() =>
      expect(h.state.calls.upsert).toEqual([
        {
          employee_id: 'e2',
          min_hours_per_week: 10,
          max_hours_per_week: 46,
          hard_block_overtime: true,
        },
      ]),
    )
    // dialog closes and the reloaded row now carries the hard badge
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(rowOf('e2').getByTestId('policy-rule-hard')).toBeInTheDocument()
  })

  it('blocks submit and shows an error when min > max', async () => {
    renderPolicies()
    expect((await screen.findAllByTestId('policy-row')).length).toBe(2)

    await userEvent.click(screen.getByTestId('policy-edit-e1'))
    const dialog = await screen.findByRole('dialog')

    // e1 has a policy: dialog prefills the policy values (10/50)
    const min = within(dialog).getByLabelText('最少工時') as HTMLInputElement
    const max = within(dialog).getByLabelText('最多工時') as HTMLInputElement
    expect(min.value).toBe('10')
    expect(max.value).toBe('50')

    await userEvent.clear(min)
    await userEvent.type(min, '60')
    await userEvent.clear(max)
    await userEvent.type(max, '20')

    const err = within(dialog).getByTestId('policy-error')
    expect(err).toHaveTextContent('最少工時 > 最多工時')
    const save = within(dialog).getByRole('button', { name: '儲存' })
    expect(save).toBeDisabled()
    await userEvent.click(save)
    expect(h.state.calls.upsert).toHaveLength(0)
  })

  it('shows an error banner with retry when loading fails', async () => {
    h.state.failEmployees = true
    renderPolicies()

    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('發生錯誤，請重試。')
    expect(screen.queryByTestId('policy-row')).toBeNull()

    h.state.failEmployees = false
    await userEvent.click(screen.getByRole('button', { name: '重試' }))
    expect(await screen.findAllByTestId('policy-row')).toHaveLength(2)
  })
})
