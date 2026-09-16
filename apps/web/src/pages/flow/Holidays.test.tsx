// Phase 3 Task T6: /flow/holidays drill — holiday vs normal table.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { HolidaysPage } from './Holidays'

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
      holiday: null as Deferred<unknown> | null,
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
  fetchHolidayAnalysis: vi.fn(() => {
    h.state.calls += 1
    h.state.holiday = h.deferred()
    const p = h.state.holiday.promise
    if (h.state.failOnce && h.state.calls === 1) {
      queueMicrotask(() => h.state.holiday?.reject(new Error('boom')))
    }
    return p
  }),
}))

const FIXTURE = [
  {
    day: '2026-01-01',
    holidayNameZh: '元旦',
    holidayNameEn: "New Year's Day",
    holidayInCount: 200,
    normalInCount: 150,
  },
  {
    day: '2026-02-17',
    holidayNameZh: '農曆新年',
    holidayNameEn: 'Lunar New Year',
    holidayInCount: 80,
    normalInCount: 140,
  },
]

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <HolidaysPage />
    </FlowLocaleProvider>,
  )
}

describe('HolidaysPage', () => {
  beforeEach(() => {
    h.state.holiday = null
    h.state.failOnce = false
    h.state.calls = 0
  })

  it('shows skeleton then holiday vs normal rows', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('holidays-page')).toBeInTheDocument()
    })
    expect(screen.getByText('節假日')).toBeInTheDocument()

    await waitFor(() => {
      expect(h.state.holiday).not.toBeNull()
    })
    expect(screen.getAllByLabelText('載入中…').length).toBeGreaterThanOrEqual(1)

    h.state.holiday?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.queryAllByLabelText('載入中…')).toHaveLength(0)
    })

    const card = screen.getByTestId('holidays-widget')
    expect(within(card).getByText('元旦')).toBeInTheDocument()
    expect(within(card).getByText('農曆新年')).toBeInTheDocument()
    expect(within(card).getByText('200')).toBeInTheDocument()
    expect(within(card).getByText('150')).toBeInTheDocument()
  })

  it('retries after fetch error', async () => {
    const user = userEvent.setup()
    h.state.failOnce = true
    renderPage()

    await waitFor(() => {
      expect(h.state.holiday).not.toBeNull()
    })

    const card = await screen.findByTestId('holidays-widget')
    await waitFor(() => {
      expect(within(card).getByRole('button', { name: /重試/ })).toBeInTheDocument()
    })

    await user.click(within(card).getByRole('button', { name: /重試/ }))

    await waitFor(() => {
      expect(h.state.calls).toBeGreaterThanOrEqual(2)
      expect(h.state.holiday).not.toBeNull()
    })
    h.state.holiday?.resolve(FIXTURE)

    await waitFor(() => {
      expect(within(screen.getByTestId('holidays-widget')).getByText('元旦')).toBeInTheDocument()
    })
  })
})
