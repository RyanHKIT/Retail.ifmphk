// Phase 4 Task 4: /flow/journey — heatmap hero, metric toggle, zone focus.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import type { JourneyPayload } from '@/lib/footfall/api'
import { JourneyPage } from './Journey'

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
      journey: null as Deferred<JourneyPayload> | null,
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
  fetchJourney: vi.fn(() => {
    h.state.calls += 1
    h.state.journey = h.deferred<JourneyPayload>()
    return h.state.journey.promise
  }),
}))

const FIXTURE: JourneyPayload = {
  floorPlanUrl: '/assets/floor-plans/it-cwb-demo.png',
  floorPlanLabelZh: '示範平面圖（樣本）',
  floorPlanLabelEn: 'Demo floor plan (sample)',
  day: '2026-09-16',
  zones: [
    {
      id: 'e',
      zoneKey: 'entrance',
      nameZh: '入口',
      nameEn: 'Entrance',
      zoneType: 'entrance',
      anchorX: 50,
      anchorY: 92,
      anchorR: 12,
    },
    {
      id: 'f',
      zoneKey: 'fitting_room',
      nameZh: '試衣間',
      nameEn: 'Fitting room',
      zoneType: 'fitting',
      anchorX: 82,
      anchorY: 28,
      anchorR: 12,
    },
  ],
  heat: [
    { zoneId: 'e', zoneKey: 'entrance', visitCount: 100, avgDwellSec: 20, intensity: 1 },
    { zoneId: 'f', zoneKey: 'fitting_room', visitCount: 50, avgDwellSec: 200, intensity: 0.5 },
  ],
}

beforeEach(() => {
  h.state.journey = null
  h.state.calls = 0
  localStorage.removeItem('flow-locale')
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderPage(initialEntry = '/flow/journey') {
  const router = createMemoryRouter(
    [{ path: '/flow/journey', element: <JourneyPage /> }],
    { initialEntries: [initialEntry] },
  )
  const view = render(
    <FlowLocaleProvider>
      <RouterProvider router={router} />
    </FlowLocaleProvider>,
  )
  return { ...view, router }
}

describe('JourneyPage', () => {
  it('shows skeleton then heatmap and honesty line', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('journey-page')).toBeInTheDocument()
    })
    expect(screen.getByText('動線熱力')).toBeInTheDocument()

    await waitFor(() => {
      expect(h.state.journey).not.toBeNull()
    })
    expect(screen.getByLabelText('載入中…')).toBeInTheDocument()

    h.state.journey?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.queryByLabelText('載入中…')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('flow-heat')).toBeInTheDocument()
    expect(screen.getByTestId('journey-honesty')).toBeInTheDocument()
  })

  it('metric toggle is a group with three buttons', async () => {
    renderPage()

    await waitFor(() => {
      expect(h.state.journey).not.toBeNull()
    })
    h.state.journey?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.getByTestId('flow-heat')).toBeInTheDocument()
    })

    const group = screen.getByRole('group', { name: '平面熱力圖' })
    const buttons = group.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    expect(screen.getByRole('button', { name: '綜合' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '人次' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '停留' })).toBeInTheDocument()
  })

  it('zone click writes ?zone=entrance', async () => {
    const user = userEvent.setup()
    const { router } = renderPage()

    await waitFor(() => {
      expect(h.state.journey).not.toBeNull()
    })
    h.state.journey?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.getByTestId('flow-heat-zone-entrance')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('flow-heat-zone-entrance'))

    await waitFor(() => {
      expect(router.state.location.search).toBe('?zone=entrance')
    })
    expect(screen.getByTestId('journey-focus')).toBeInTheDocument()
  })

  it('does not link to /retail/service-gap', async () => {
    renderPage()

    await waitFor(() => {
      expect(h.state.journey).not.toBeNull()
    })
    h.state.journey?.resolve(FIXTURE)

    await waitFor(() => {
      expect(screen.getByTestId('journey-page')).toBeInTheDocument()
    })

    expect(document.querySelector('a[href*="/retail/service-gap"]')).toBeNull()
  })
})
