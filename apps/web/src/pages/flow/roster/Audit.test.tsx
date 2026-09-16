// Task 10 component contract (plan docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md):
// 50/page load-more (button hidden when a page returns < 50), action filter,
// client-side text search (api fetchAudit has no search param), actor + time +
// table + notes, old/new jsonb diff expand. The api layer and auth context are
// mocked; FlowLocaleProvider is REAL (WeekBoard.test.tsx pattern).

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { fetchAudit } from '@/lib/roster/api'
import type { AuditLogRow } from '@/lib/roster/types'
import { AuditPage } from './Audit'

const PAGE = 50

// ---- hoisted mock state (vi.mock factories are hoisted) ----

const h = vi.hoisted(() => {
  const state: {
    branchId: string | null
    page: any[]
    calls: { fetchAudit: any[] }
  } = {
    branchId: 'b1',
    page: [],
    calls: { fetchAudit: [] },
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
  fetchManagedBranchId: vi.fn(async () => h.state.branchId),
  fetchAudit: vi.fn(async (options: { offset?: number; action?: string }) => {
    h.state.calls.fetchAudit.push(options ?? {})
    const offset = options?.offset ?? 0
    return h.state.page.slice(offset, offset + PAGE)
  }),
}))

// ---- fixtures ----

function row(overrides: Partial<AuditLogRow>): AuditLogRow {
  return {
    id: 'log-1',
    actor_id: 'p9',
    action: 'create',
    table_name: 'assignments',
    record_id: 'r1',
    old_data: null,
    new_data: { notes: '幫忙收銀' },
    notes: '新增更段',
    created_at: '2026-09-14T09:30:00Z',
    ...overrides,
  }
}

function resetState(page: AuditLogRow[]) {
  h.state.branchId = 'b1'
  h.state.page = page
  h.state.calls.fetchAudit = []
}

beforeEach(() => {
  localStorage.removeItem('ifmp_flow_locale')
})

// ---- harness ----

function renderAudit() {
  return render(
    <FlowLocaleProvider>
      <AuditPage />
    </FlowLocaleProvider>,
  )
}

// ---- tests ----

describe('Audit (Task 10 contract)', () => {
  it('renders action badges, table names, actor and notes', async () => {
    resetState([
      row({ id: 'log-1', action: 'create', table_name: 'assignments' }),
      row({
        id: 'log-2',
        action: 'publish',
        table_name: 'roster_weeks',
        old_data: { status: 'draft' },
        new_data: { status: 'published' },
        notes: '發佈第 38 週',
      }),
    ])
    renderAudit()

    expect(
      screen.getByRole('heading', { name: '審計記錄' }),
    ).toBeInTheDocument()
    const table = await screen.findByRole('table')
    await within(table).findByText('assignments')
    expect(within(table).getByText('roster_weeks')).toBeInTheDocument()
    // action badges carry the bilingual label
    expect(within(table).getAllByText('新增').length).toBeGreaterThanOrEqual(1)
    expect(within(table).getAllByText('發佈').length).toBeGreaterThanOrEqual(1)
    // actor short id + notes render
    expect(within(table).getAllByText('p9').length).toBe(2)
    expect(within(table).getByText('發佈第 38 週')).toBeInTheDocument()
    // initial page fetch: limit 50, offset 0
    expect(h.state.calls.fetchAudit[0]).toMatchObject({ limit: 50, offset: 0 })
  })

  it('expands old/new jsonb diff when 詳情 clicked', async () => {
    resetState([
      row({
        id: 'log-1',
        action: 'update',
        table_name: 'assignments',
        old_data: { notes: '舊備註' },
        new_data: { notes: '幫忙收銀' },
      }),
    ])
    renderAudit()

    const table = await screen.findByRole('table')
    await within(table).findByText('assignments')
    await userEvent.click(within(table).getByRole('button', { name: '詳情' }))

    const diff = await screen.findByTestId('audit-diff-log-1')
    expect(diff).toHaveTextContent('old')
    expect(diff).toHaveTextContent('new')
    expect(diff).toHaveTextContent('舊備註')
    expect(diff).toHaveTextContent('幫忙收銀')
  })

  it('hides 詳情 when both old_data and new_data are null', async () => {
    resetState([row({ id: 'log-1', old_data: null, new_data: null })])
    renderAudit()

    const table = await screen.findByRole('table')
    await within(table).findByText('assignments')
    expect(within(table).queryByRole('button', { name: '詳情' })).toBeNull()
  })

  it('load-more fetches the next page with offset 50', async () => {
    resetState(
      Array.from({ length: PAGE }, (_, i) =>
        row({ id: `log-${i}`, action: 'create', table_name: 'assignments' }),
      ),
    )
    renderAudit()

    const loadMore = await screen.findByRole('button', { name: '載入更多' })
    expect(loadMore).toBeInTheDocument()
    await userEvent.click(loadMore)

    await waitFor(() => {
      expect(h.state.calls.fetchAudit[1]).toMatchObject({ offset: 50, limit: 50 })
    })
  })

  it('hides load-more button when a page returns fewer than 50 rows', async () => {
    resetState([row({ id: 'log-1' })])
    renderAudit()

    await screen.findByRole('table')
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '載入更多' })).toBeNull()
    })
  })

  it('action filter re-fetches page 0 with the selected action', async () => {
    resetState([row({ id: 'log-1', action: 'create' })])
    renderAudit()

    await screen.findByRole('table')
    await userEvent.selectOptions(screen.getByLabelText('動作'), 'publish')
    await waitFor(() => {
      expect(h.state.calls.fetchAudit.at(-1)).toMatchObject({
        action: 'publish',
        offset: 0,
      })
    })
  })

  it('shows the empty state when there are no audit rows', async () => {
    resetState([])
    renderAudit()
    expect(await screen.findByText('沒有審計記錄。')).toBeInTheDocument()
  })

  it('shows an error banner and retry refetches', async () => {
    resetState([row({ id: 'log-1' })])
    vi.mocked(fetchAudit).mockRejectedValueOnce(new Error('boom'))
    renderAudit()

    expect(await screen.findByText('發生錯誤，請重試。')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重試' }))
    const table = await screen.findByRole('table')
    expect(table).toHaveTextContent('assignments')
    expect(vi.mocked(fetchAudit).mock.calls.length).toBe(2)
  })

  it('text search filters client-side across notes / table / action', async () => {
    resetState([
      row({ id: 'log-1', action: 'create', table_name: 'assignments', notes: '新增更段' }),
      row({ id: 'log-2', action: 'publish', table_name: 'roster_weeks', notes: '發佈第 38 週' }),
    ])
    renderAudit()

    const table = await screen.findByRole('table')
    await within(table).findByText('assignments')
    const search = screen.getByPlaceholderText('搜尋備註、資料表或動作…')
    await userEvent.type(search, '發佈')
    expect(within(table).queryByText('assignments')).toBeNull()
    expect(within(table).getByText('roster_weeks')).toBeInTheDocument()
    await userEvent.clear(search)
    expect(within(table).getByText('assignments')).toBeInTheDocument()
  })
})
