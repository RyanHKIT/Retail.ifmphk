// Task 6 component contract (plan docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md):
// registry table lists zh/en name + station; add dialog validates min ≤ max
// (MeDo gap fix) and blocks submit; deactivate = soft delete behind confirm.
// The api layer and auth context are mocked; validation logic is REAL.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import type { EmployeeRow } from '@/lib/roster/types'
import { StaffPage } from './Staff'

// ---- hoisted mock state (vi.mock factories are hoisted) ----

const h = vi.hoisted(() => {
  const state: {
    employees: any[]
    calls: {
      create: [string, any][]
      update: [string, any][]
      deactivate: string[]
    }
  } = {
    employees: [],
    calls: { create: [], update: [], deactivate: [] },
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
  fetchEmployees: vi.fn(async () => h.state.employees),
  createEmployee: vi.fn(async (branchId: string, input: any) => {
    h.state.calls.create.push([branchId, input])
    const row = {
      id: `new-${h.state.calls.create.length}`,
      branch_id: branchId,
      name_en: '',
      phone: '',
      is_active: true,
      ...input,
    }
    h.state.employees = [...h.state.employees, row]
    return row
  }),
  updateEmployee: vi.fn(async (id: string, patch: any) => {
    h.state.calls.update.push([id, patch])
    h.state.employees = h.state.employees.map((e) =>
      e.id === id ? { ...e, ...patch } : e,
    )
  }),
  deactivateEmployee: vi.fn(async (id: string) => {
    h.state.calls.deactivate.push(id)
    h.state.employees = h.state.employees.map((e) =>
      e.id === id ? { ...e, is_active: false } : e,
    )
  }),
}))

// ---- fixtures ----

function emp(overrides: { id: string } & Partial<EmployeeRow>): EmployeeRow {
  return {
    branch_id: 'b1',
    name_en: '',
    phone: '',
    station: '樓面',
    employment_type: 'full_time',
    min_hours_per_week: 0,
    max_hours_per_week: 48,
    is_active: true,
    ...overrides,
  }
}

function resetState() {
  h.state.employees = [
    emp({
      id: 'e1',
      name_zh: '陳大文',
      name_en: 'Chan Tai Man',
      phone: '91234567',
      station: '樓面',
    }),
    emp({
      id: 'e2',
      name_zh: '李小美',
      station: '收銀',
      employment_type: 'part_time',
      min_hours_per_week: 8,
      max_hours_per_week: 20,
    }),
  ]
  h.state.calls = { create: [], update: [], deactivate: [] }
}

beforeEach(() => {
  localStorage.removeItem('ifmp_flow_locale')
  resetState()
})

// ---- harness ----

function renderStaff() {
  return render(
    <FlowLocaleProvider>
      <StaffPage />
    </FlowLocaleProvider>,
  )
}

// ---- tests ----

describe('StaffPage (Task 6 contract)', () => {
  it('renders employees with zh names and stations from fetchEmployees', async () => {
    renderStaff()
    const table = await screen.findByTestId('staff-table')
    expect(table).toHaveTextContent('陳大文')
    expect(table).toHaveTextContent('李小美')
    expect(table).toHaveTextContent('樓面')
    expect(table).toHaveTextContent('收銀')
    // en name + employment type render via i18n keys
    expect(table).toHaveTextContent('Chan Tai Man')
    expect(table).toHaveTextContent('兼職')
    expect(table).toHaveTextContent('在職')
  })

  it('search box filters by zh and en name client-side', async () => {
    renderStaff()
    await screen.findByTestId('staff-table')
    await userEvent.type(screen.getByTestId('staff-search'), 'Chan')
    const table = screen.getByTestId('staff-table')
    expect(table).toHaveTextContent('陳大文')
    expect(table).not.toHaveTextContent('李小美')
    await userEvent.clear(screen.getByTestId('staff-search'))
    await userEvent.type(screen.getByTestId('staff-search'), '小美')
    expect(screen.getByTestId('staff-table')).toHaveTextContent('李小美')
    expect(screen.getByTestId('staff-table')).not.toHaveTextContent('陳大文')
  })

  it('blocks save while min > max, then calls createEmployee after fix', async () => {
    renderStaff()
    await screen.findByTestId('staff-table')
    await userEvent.click(screen.getByTestId('staff-add'))
    const dialog = await screen.findByRole('dialog')

    await userEvent.type(within(dialog).getByLabelText(/中文名/), '測試員')
    const minInput = within(dialog).getByLabelText(
      '每週最少工時',
    ) as HTMLInputElement
    const maxInput = within(dialog).getByLabelText(
      '每週最多工時',
    ) as HTMLInputElement
    await userEvent.clear(minInput)
    await userEvent.type(minInput, '40')
    await userEvent.clear(maxInput)
    await userEvent.type(maxInput, '20')

    // bilingual (locale-driven) error shows and submit is blocked
    expect(
      within(dialog).getByTestId('staff-hours-error'),
    ).toHaveTextContent('每週最少工時 ≤ 每週最多工時')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '儲存' }),
    )
    expect(h.state.calls.create).toHaveLength(0)

    // fix to min=10 max=20 → error clears and createEmployee fires
    await userEvent.clear(minInput)
    await userEvent.type(minInput, '10')
    expect(
      within(dialog).queryByTestId('staff-hours-error'),
    ).toBeNull()
    await userEvent.click(
      within(dialog).getByRole('button', { name: '儲存' }),
    )

    await waitFor(() => expect(h.state.calls.create).toHaveLength(1))
    expect(h.state.calls.create[0][0]).toBe('b1')
    expect(h.state.calls.create[0][1]).toMatchObject({
      name_zh: '測試員',
      station: '樓面',
      employment_type: 'full_time',
      min_hours_per_week: 10,
      max_hours_per_week: 20,
    })
  })

  it('deactivates only after confirm, with the correct employee id', async () => {
    renderStaff()
    const row = await screen.findByTestId('staff-row-e1')
    await userEvent.click(within(row).getByTestId('staff-deactivate'))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('確認將此員工標記為離職？')

    await userEvent.click(
      within(dialog).getByTestId('staff-deactivate-confirm'),
    )
    await waitFor(() => expect(h.state.calls.deactivate).toEqual(['e1']))
    expect(h.state.calls.deactivate).not.toContain('e2')

    // reload marks the row inactive
    await waitFor(() =>
      expect(screen.getByTestId('staff-row-e1')).toHaveTextContent('離職'),
    )
  })
})
