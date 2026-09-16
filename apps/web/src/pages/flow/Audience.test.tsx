// Phase 3 Task T5: /flow/audience drill — gender + age-group charts.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { AudiencePage } from './Audience'
import { fetchAudience } from '@/lib/footfall/api'

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
      audience: null as Deferred<unknown> | null,
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
  fetchAudience: vi.fn(() => {
    h.state.calls += 1
    h.state.audience = h.deferred()
    const p = h.state.audience.promise
    if (h.state.failOnce && h.state.calls === 1) {
      queueMicrotask(() => h.state.audience?.reject(new Error('boom')))
    }
    return p
  }),
}))

const FIXTURE = [
  { gender: 'male', ageGroup: 'unknown', visitorCount: 55 },
  { gender: 'female', ageGroup: 'unknown', visitorCount: 45 },
  { gender: 'unknown', ageGroup: 'youth', visitorCount: 60 },
  { gender: 'unknown', ageGroup: 'toddler', visitorCount: 12 },
]

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <AudiencePage />
    </FlowLocaleProvider>,
  )
}

describe('AudiencePage', () => {
  beforeEach(() => {
    h.state.audience = null
    h.state.failOnce = false
    h.state.calls = 0
  })

  it('shows skeleton then gender + age labels; fetches month-to-date', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('audience-page')).toBeInTheDocument()
    })
    expect(screen.getAllByText('客群畫像').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('本月至今')).toBeInTheDocument()

    await waitFor(() => {
      expect(h.state.audience).not.toBeNull()
    })
    expect(fetchAudience).toHaveBeenCalledWith('b1', {
      start: '2026-09-01',
      end: '2026-09-16',
    })
    expect(screen.getAllByLabelText('載入中…').length).toBeGreaterThanOrEqual(1)

    h.state.audience?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.queryAllByLabelText('載入中…')).toHaveLength(0)
    })

    // Age labels via overview.age.* (DongQia buckets)
    const legend = screen.getByTestId('audience-age-labels')
    expect(within(legend).getByText(/青年/)).toBeInTheDocument()
    expect(within(legend).getByText(/幼兒/)).toBeInTheDocument()
  })

  it('retries after fetch error', async () => {
    const user = userEvent.setup()
    h.state.failOnce = true
    renderPage()

    await waitFor(() => {
      expect(h.state.audience).not.toBeNull()
    })

    const card = await screen.findByTestId('audience-widget')
    await waitFor(() => {
      expect(within(card).getByRole('button', { name: /重試/ })).toBeInTheDocument()
    })

    await user.click(within(card).getByRole('button', { name: /重試/ }))

    await waitFor(() => {
      expect(h.state.calls).toBeGreaterThanOrEqual(2)
      expect(h.state.audience).not.toBeNull()
    })
    h.state.audience?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.getByTestId('audience-age-labels')).toBeInTheDocument()
    })
  })
})
