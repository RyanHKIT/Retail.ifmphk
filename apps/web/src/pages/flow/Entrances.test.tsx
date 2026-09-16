// Phase 3 Task T5: /flow/entrances drill — per-gate today + 7-day.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { EntrancesPage } from './Entrances'

const h = vi.hoisted(() => {
  type Deferred<T> = {
    promise: Promise<T>
    resolve: (v: T) => void
    reject: (e: unknown) => void
  }
  function deferred<T>(): Deferred<T> {
    let resolve!: (v: T) => void
    let reject!: (e: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
  return {
    deferred,
    state: {
      entrance: null as Deferred<unknown> | null,
      failOnce: false,
      calls: 0,
    },
  }
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
}))

vi.mock('@/lib/footfall/api', () => ({
  hkToday: () => '2026-09-16',
  fetchEntranceHourly: vi.fn(() => {
    h.state.calls += 1
    h.state.entrance = h.deferred()
    const p = h.state.entrance.promise
    if (h.state.failOnce && h.state.calls === 1) {
      queueMicrotask(() => h.state.entrance?.reject(new Error('boom')))
    }
    return p
  }),
}))

const FIXTURE = [
  {
    entranceId: 'e1',
    nameZh: '正門',
    nameEn: 'Main',
    sortOrder: 1,
    today: [
      { hour: 10, inCount: 5, outCount: 3 },
      { hour: 11, inCount: 7, outCount: 4 },
    ],
    sevenDayIn: 40,
    sevenDayOut: 35,
  },
  {
    entranceId: 'e2',
    nameZh: '側門',
    nameEn: 'Side',
    sortOrder: 2,
    today: [{ hour: 10, inCount: 2, outCount: 1 }],
    sevenDayIn: 18,
    sevenDayOut: 16,
  },
]

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <EntrancesPage />
    </FlowLocaleProvider>,
  )
}

describe('EntrancesPage', () => {
  beforeEach(() => {
    h.state.entrance = null
    h.state.failOnce = false
    h.state.calls = 0
  })

  it('shows skeleton then per-gate today + 7-day totals', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('entrances-page')).toBeInTheDocument()
    })
    expect(screen.getByText('出入口')).toBeInTheDocument()

    await waitFor(() => {
      expect(h.state.entrance).not.toBeNull()
    })
    expect(screen.getAllByLabelText('載入中…').length).toBeGreaterThanOrEqual(1)

    h.state.entrance?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.queryAllByLabelText('載入中…')).toHaveLength(0)
    })

    const totals = screen.getByTestId('entrances-totals')
    expect(within(totals).getByText(/正門/)).toBeInTheDocument()
    expect(within(totals).getByText(/側門/)).toBeInTheDocument()
    // today in = 5+7=12, out = 3+4=7; 7d 40/35
    expect(within(totals).getByText(/12/)).toBeInTheDocument()
    expect(within(totals).getByText(/40/)).toBeInTheDocument()
    expect(within(totals).getByText(/35/)).toBeInTheDocument()
  })

  it('retries after fetch error', async () => {
    const user = userEvent.setup()
    h.state.failOnce = true
    renderPage()

    await waitFor(() => {
      expect(h.state.entrance).not.toBeNull()
    })

    const card = await screen.findByTestId('entrances-widget')
    await waitFor(() => {
      expect(within(card).getByRole('button', { name: /重試/ })).toBeInTheDocument()
    })

    await user.click(within(card).getByRole('button', { name: /重試/ }))

    await waitFor(() => {
      expect(h.state.calls).toBeGreaterThanOrEqual(2)
      expect(h.state.entrance).not.toBeNull()
    })
    h.state.entrance?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.getByTestId('entrances-totals')).toBeInTheDocument()
    })
  })
})
