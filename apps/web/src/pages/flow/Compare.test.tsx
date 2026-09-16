// Phase 3 Task T6: /flow/compare drill — selected / last-week / YoY.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { ComparePage } from './Compare'
import { fetchCompare } from '@/lib/footfall/api'

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
      compare: null as Deferred<unknown> | null,
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
  fetchCompare: vi.fn(() => {
    h.state.calls += 1
    h.state.compare = h.deferred()
    const p = h.state.compare.promise
    if (h.state.failOnce && h.state.calls === 1) {
      queueMicrotask(() => h.state.compare?.reject(new Error('boom')))
    }
    return p
  }),
}))

const FIXTURE = {
  selected: [
    { day: '2026-09-15', inCount: 100, uniqueVisitors: 80 },
    { day: '2026-09-16', inCount: 120, uniqueVisitors: 90 },
  ],
  lastWeek: [
    { day: '2026-09-08', inCount: 90, uniqueVisitors: 70 },
    { day: '2026-09-09', inCount: 95, uniqueVisitors: 75 },
  ],
  yoy: [
    { day: '2025-09-15', inCount: 110, uniqueVisitors: 85 },
    { day: '2025-09-16', inCount: 115, uniqueVisitors: 88 },
  ],
}

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <ComparePage />
    </FlowLocaleProvider>,
  )
}

describe('ComparePage', () => {
  beforeEach(() => {
    h.state.compare = null
    h.state.failOnce = false
    h.state.calls = 0
  })

  it('shows skeleton then compare series labels; fetches hkToday', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('compare-page')).toBeInTheDocument()
    })
    expect(screen.getByText('同期對比')).toBeInTheDocument()

    await waitFor(() => {
      expect(h.state.compare).not.toBeNull()
    })
    expect(fetchCompare).toHaveBeenCalledWith('b1', '2026-09-16')
    expect(screen.getAllByLabelText('載入中…').length).toBeGreaterThanOrEqual(1)

    h.state.compare?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.queryAllByLabelText('載入中…')).toHaveLength(0)
    })

    const legend = screen.getByTestId('compare-series')
    expect(within(legend).getByText(/選定日/)).toBeInTheDocument()
    expect(within(legend).getByText(/上週同曜日/)).toBeInTheDocument()
    expect(within(legend).getByText(/去年同期/)).toBeInTheDocument()
  })

  it('retries after fetch error', async () => {
    const user = userEvent.setup()
    h.state.failOnce = true
    renderPage()

    await waitFor(() => {
      expect(h.state.compare).not.toBeNull()
    })

    const card = await screen.findByTestId('compare-widget')
    await waitFor(() => {
      expect(within(card).getByRole('button', { name: /重試/ })).toBeInTheDocument()
    })

    await user.click(within(card).getByRole('button', { name: /重試/ }))

    await waitFor(() => {
      expect(h.state.calls).toBeGreaterThanOrEqual(2)
      expect(h.state.compare).not.toBeNull()
    })
    h.state.compare?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.getByTestId('compare-series')).toBeInTheDocument()
    })
  })
})
