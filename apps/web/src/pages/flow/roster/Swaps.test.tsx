// Task 9 component contract (plan docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md):
// default filter shows pending only; open-bid rows show the recruitment badge;
// approve opens dialog (notes) and calls reviewSwap(id, true, notes); reject calls
// reviewSwap(id, false, notes) — the same path for targeted and open-bid swaps
// (the server RPC `review_swap_request` performs the assignment exchange / close).
// The api layer and auth context are mocked; the i18n provider is REAL.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import type { EmployeeRow, SwapRequestRow } from '@/lib/roster/types'
import { SwapsPage } from './Swaps'

// ---- hoisted mock state (vi.mock factories are hoisted) ----

const h = vi.hoisted(() => {
  const state: {
    swaps: any[]
    employees: any[]
    failLoad: boolean
    calls: {
      review: [string, boolean, string][]
      fetchSwaps: (string | undefined)[]
      fetchEmployees: string[]
    }
  } = {
    swaps: [],
    employees: [],
    failLoad: false,
    calls: { review: [], fetchSwaps: [], fetchEmployees: [] },
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
  fetchSwaps: vi.fn(async (branchId?: string) => {
    h.state.calls.fetchSwaps.push(branchId)
    if (h.state.failLoad) throw new Error('boom')
    return h.state.swaps.map((s) => ({ ...s }))
  }),
  fetchEmployees: vi.fn(async (branchId: string) => {
    h.state.calls.fetchEmployees.push(branchId)
    return h.state.employees.map((e) => ({ ...e }))
  }),
  reviewSwap: vi.fn(async (id: string, approve: boolean, notes?: string) => {
    h.state.calls.review.push([id, approve, notes ?? ''])
    const row = h.state.swaps.find((s) => s.id === id)
    if (row) {
      row.status = approve ? 'approved' : 'rejected'
      row.review_notes = notes ?? ''
      row.reviewed_at = '2026-09-16T10:00:00Z'
    }
  }),
}))

// ---- fixtures ----

function emp(id: string, nameZh: string, nameEn: string): EmployeeRow {
  return {
    id,
    branch_id: 'b1',
    name_zh: nameZh,
    name_en: nameEn,
    station: '樓面',
    employment_type: 'full_time',
    min_hours_per_week: 0,
    max_hours_per_week: 48,
    is_active: true,
  }
}

function swap(
  id: string,
  overrides: Partial<SwapRequestRow> = {},
): SwapRequestRow {
  return {
    id,
    requester_employee_id: 'e1',
    requester_assignment_id: 'a1',
    target_employee_id: null,
    target_assignment_id: null,
    is_open_bid: false,
    reason: '',
    status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    review_notes: '',
    ...overrides,
  }
}

function resetState() {
  h.state.employees = [
    emp('e1', '陳大文', 'Chan Tai Man'),
    emp('e2', '李小美', 'Lee Siu Mei'),
  ]
  h.state.swaps = [
    swap('sw1', {
      // pending targeted: e1 requests e2's shift
      target_employee_id: 'e2',
      target_assignment_id: 'a2',
      reason: '家中有事',
    }),
    swap('sw2', {
      // pending open bid
      is_open_bid: true,
      reason: '想換晚更',
    }),
    swap('sw3', {
      // already approved targeted swap
      target_employee_id: 'e2',
      target_assignment_id: 'a2',
      reason: '私人理由',
      status: 'approved',
      reviewed_by: 'p1',
      reviewed_at: '2026-09-15T09:30:00Z',
      review_notes: '同意',
    }),
  ]
  h.state.failLoad = false
  h.state.calls = { review: [], fetchSwaps: [], fetchEmployees: [] }
}

beforeEach(() => {
  localStorage.removeItem('ifmp_flow_locale')
  resetState()
})

// ---- harness ----

function renderSwaps() {
  return render(
    <FlowLocaleProvider>
      <SwapsPage />
    </FlowLocaleProvider>,
  )
}

async function awaitList() {
  await screen.findByText('調更審批')
  await screen.findAllByTestId('swap-row')
}

function rowById(id: string): HTMLElement {
  const el = screen
    .getAllByTestId('swap-row')
    .find((n) => n.dataset.id === id)
  expect(el).toBeTruthy()
  return el as HTMLElement
}

// ---- tests ----

describe('Swaps (Task 9 contract)', () => {
  it('defaults to pending filter; switching to all shows every row with the open-bid badge', async () => {
    renderSwaps()
    await awaitList()

    // default: only the 2 pending rows
    let rows = screen.getAllByTestId('swap-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('陳大文')
    expect(rows[1]).toHaveTextContent('陳大文')

    // switch to 全部 (all statuses) → 3 rows; open-bid badge on the open-bid row only
    await userEvent.click(screen.getByRole('button', { name: '全部動作' }))
    rows = screen.getAllByTestId('swap-row')
    expect(rows).toHaveLength(3)
    expect(within(rowById('sw2')).getByText('公開招募')).toBeInTheDocument()
    expect(rowById('sw3')).toHaveTextContent('陳大文')

    // api scoped to the managed branch
    expect(h.state.calls.fetchSwaps.at(-1)).toBe('b1')
  })

  it('approve targeted swap: dialog + notes then reviewSwap(id, true, notes)', async () => {
    renderSwaps()
    await awaitList()

    await userEvent.click(
      within(rowById('sw1')).getByRole('button', { name: '批准' }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('批准')
    expect(
      within(dialog).getAllByText('批准後，兩人的更段將會對換。').length,
    ).toBeGreaterThan(0)

    await userEvent.type(within(dialog).getByLabelText('審批備註'), '同意調更')
    await userEvent.click(within(dialog).getByRole('button', { name: '確認' }))

    await waitFor(() =>
      expect(h.state.calls.review).toEqual([['sw1', true, '同意調更']]),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('reject targeted swap: same dialog path with reviewSwap(id, false, notes)', async () => {
    renderSwaps()
    await awaitList()

    await userEvent.click(
      within(rowById('sw1')).getByRole('button', { name: '拒絕' }),
    )

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('審批備註'), '人手不足')
    await userEvent.click(within(dialog).getByRole('button', { name: '確認' }))

    await waitFor(() =>
      expect(h.state.calls.review).toEqual([['sw1', false, '人手不足']]),
    )
  })

  it('open-bid approval goes through the same reviewSwap path (server closes without swapping)', async () => {
    renderSwaps()
    await awaitList()

    await userEvent.click(
      within(rowById('sw2')).getByRole('button', { name: '批准' }),
    )

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: '確認' }))

    await waitFor(() =>
      expect(h.state.calls.review).toEqual([['sw2', true, '']]),
    )
  })

  it('reviewed rows show reviewed time + notes and drop action buttons', async () => {
    renderSwaps()
    await awaitList()
    await userEvent.click(screen.getByRole('button', { name: '全部動作' }))

    const approved = rowById('sw3')
    expect(approved).toHaveTextContent('處理時間')
    expect(approved).toHaveTextContent('同意')
    expect(
      within(approved).queryByRole('button', { name: '批准' }),
    ).toBeNull()
    expect(
      within(approved).queryByRole('button', { name: '拒絕' }),
    ).toBeNull()
  })

  it('shows the reviewed-at label after a successful review', async () => {
    renderSwaps()
    await awaitList()

    await userEvent.click(
      within(rowById('sw1')).getByRole('button', { name: '批准' }),
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: '確認' }))
    await waitFor(() => expect(h.state.calls.review).toHaveLength(1))

    // sw1 was pending → after reload it turns approved, visible under the
    // all-statuses filter with the reviewed-at label
    await userEvent.click(screen.getByRole('button', { name: '全部動作' }))
    await waitFor(() => {
      const row = rowById('sw1')
      expect(row).toHaveTextContent('處理時間')
    })
  })

  it('empty state shows roster.swaps.empty; load failure shows error banner with retry', async () => {
    h.state.swaps = []
    renderSwaps()
    expect(await screen.findByText('沒有調更申請。')).toBeInTheDocument()

    // failure → banner with retry; retry recovers
    h.state.failLoad = true
    renderSwaps()
    const banners = await screen.findAllByRole('alert')
    expect(banners.length).toBeGreaterThanOrEqual(1)

    h.state.failLoad = false
    await userEvent.click(
      banners[banners.length - 1].querySelector('button')!,
    )
    // fail-load call + retry call
    await waitFor(() =>
      expect(h.state.calls.fetchSwaps.length).toBeGreaterThanOrEqual(3),
    )
  })
})
