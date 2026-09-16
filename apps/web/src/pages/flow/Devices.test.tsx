// Phase 3 Task T7: /flow/devices — read-only ETL device list.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { DevicesPage } from './Devices'

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
      devices: null as Deferred<unknown> | null,
      failOnce: false,
      emptyOnce: false,
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
  fetchDevices: vi.fn(() => {
    h.state.calls += 1
    h.state.devices = h.deferred()
    const p = h.state.devices.promise
    if (h.state.failOnce && h.state.calls === 1) {
      queueMicrotask(() => h.state.devices?.reject(new Error('boom')))
    } else if (h.state.emptyOnce && h.state.calls === 1) {
      queueMicrotask(() => h.state.devices?.resolve([]))
    }
    return p
  }),
}))

const FIXTURE = [
  { name: 'Gate Cam A', status: 'online', lastSeenAt: '2026-09-16T10:00:00+08:00' },
  { name: 'Gate Cam B', status: 'offline', lastSeenAt: null },
  { name: 'Gate Cam C', status: 'degraded', lastSeenAt: '2026-09-15T18:00:00+08:00' },
]

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <DevicesPage />
    </FlowLocaleProvider>,
  )
}

describe('DevicesPage', () => {
  beforeEach(() => {
    h.state.devices = null
    h.state.failOnce = false
    h.state.emptyOnce = false
    h.state.calls = 0
  })

  it('shows skeleton then read-only device rows', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('devices-page')).toBeInTheDocument()
    })
    expect(screen.getByText('設備')).toBeInTheDocument()

    await waitFor(() => {
      expect(h.state.devices).not.toBeNull()
    })
    expect(screen.getAllByLabelText('載入中…').length).toBeGreaterThanOrEqual(1)

    h.state.devices?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.queryAllByLabelText('載入中…')).toHaveLength(0)
    })

    const list = screen.getByTestId('devices-list')
    expect(within(list).getByText('Gate Cam A')).toBeInTheDocument()
    expect(within(list).getByText('Gate Cam B')).toBeInTheDocument()
    expect(within(list).getByText(/在線/)).toBeInTheDocument()
    expect(within(list).getByText(/離線/)).toBeInTheDocument()
    expect(within(list).getByText(/預警/)).toBeInTheDocument()
  })

  it('shows empty hint when no devices', async () => {
    h.state.emptyOnce = true
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('尚未匯入資料')).toBeInTheDocument()
    })
  })

  it('retries after fetch error', async () => {
    const user = userEvent.setup()
    h.state.failOnce = true
    renderPage()

    await waitFor(() => {
      expect(h.state.devices).not.toBeNull()
    })

    const card = await screen.findByTestId('devices-widget')
    await waitFor(() => {
      expect(within(card).getByRole('button', { name: /重試/ })).toBeInTheDocument()
    })

    await user.click(within(card).getByRole('button', { name: /重試/ }))

    await waitFor(() => {
      expect(h.state.calls).toBeGreaterThanOrEqual(2)
      expect(h.state.devices).not.toBeNull()
    })
    h.state.devices?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.getByTestId('devices-list')).toBeInTheDocument()
    })
  })
})
