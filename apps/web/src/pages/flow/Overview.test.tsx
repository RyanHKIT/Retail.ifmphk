// Phase 3 Task T4: Overview 主控台 renders 8 footfall widgets;
// skeleton → data; per-card retry. Footfall api + auth mocked.

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { OverviewPage } from './Overview'

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
      hourly: null as Deferred<unknown> | null,
      entrance: null as Deferred<unknown> | null,
      month: null as Deferred<unknown> | null,
      weekday: null as Deferred<unknown> | null,
      holiday: null as Deferred<unknown> | null,
      unique: null as Deferred<unknown> | null,
      audience: null as Deferred<unknown> | null,
      compare: null as Deferred<unknown> | null,
      uniqueFailOnce: false,
      uniqueCalls: 0,
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
  fetchTodayHourly: vi.fn(() => {
    h.state.hourly = h.deferred()
    return h.state.hourly.promise
  }),
  fetchEntranceHourly: vi.fn(() => {
    h.state.entrance = h.deferred()
    return h.state.entrance.promise
  }),
  fetchMonthDaily: vi.fn(() => {
    h.state.month = h.deferred()
    return h.state.month.promise
  }),
  fetchWeekdayDistribution: vi.fn(() => {
    h.state.weekday = h.deferred()
    return h.state.weekday.promise
  }),
  fetchHolidayAnalysis: vi.fn(() => {
    h.state.holiday = h.deferred()
    return h.state.holiday.promise
  }),
  fetchTodayUnique: vi.fn(() => {
    h.state.uniqueCalls += 1
    h.state.unique = h.deferred()
    const p = h.state.unique.promise
    if (h.state.uniqueFailOnce && h.state.uniqueCalls === 1) {
      queueMicrotask(() => h.state.unique?.reject(new Error('boom')))
    }
    return p
  }),
  fetchAudience: vi.fn(() => {
    h.state.audience = h.deferred()
    return h.state.audience.promise
  }),
  fetchCompare: vi.fn(() => {
    h.state.compare = h.deferred()
    return h.state.compare.promise
  }),
}))

const FIXTURES = {
  hourly: [{ hour: 10, inCount: 12, outCount: 8, uniqueVisitors: 10 }],
  entrance: [
    {
      entranceId: 'e1',
      nameZh: '正門',
      nameEn: 'Main',
      sortOrder: 1,
      today: [{ hour: 10, inCount: 5, outCount: 3 }],
      sevenDayIn: 40,
      sevenDayOut: 35,
    },
  ],
  month: [{ day: '2026-09-01', inCount: 100, uniqueVisitors: 80 }],
  weekday: Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    avgInCount: 100 + weekday,
  })),
  holiday: [
    {
      day: '2026-07-01',
      holidayNameZh: '香港特別行政區成立紀念日',
      holidayNameEn: 'HKSAR Establishment Day',
      holidayInCount: 500,
      normalInCount: 300,
    },
  ],
  unique: {
    today: 420,
    spark: [
      { day: '2026-09-10', uniqueVisitors: 400 },
      { day: '2026-09-16', uniqueVisitors: 420 },
    ],
  },
  audience: [
    { gender: 'male', ageGroup: 'unknown', visitorCount: 55 },
    { gender: 'female', ageGroup: 'unknown', visitorCount: 45 },
    { gender: 'unknown', ageGroup: 'youth', visitorCount: 60 },
  ],
  compare: {
    selected: [{ day: '2026-09-16', inCount: 200, uniqueVisitors: 150 }],
    lastWeek: [{ day: '2026-09-09', inCount: 180, uniqueVisitors: 140 }],
    yoy: [{ day: '2025-09-16', inCount: 190, uniqueVisitors: 145 }],
  },
}

function resolveAllOk() {
  h.state.hourly?.resolve(FIXTURES.hourly)
  h.state.entrance?.resolve(FIXTURES.entrance)
  h.state.month?.resolve(FIXTURES.month)
  h.state.weekday?.resolve(FIXTURES.weekday)
  h.state.holiday?.resolve(FIXTURES.holiday)
  if (!h.state.uniqueFailOnce || h.state.uniqueCalls > 1) {
    h.state.unique?.resolve(FIXTURES.unique)
  }
  h.state.audience?.resolve(FIXTURES.audience)
  h.state.compare?.resolve(FIXTURES.compare)
}

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <OverviewPage />
    </FlowLocaleProvider>,
  )
}

const TITLES_ZH = [
  '當日分時客流',
  '出入口客流',
  '當月每日客流',
  '週7天客流分佈',
  '節假日客流分析',
  '今日去重客流',
  '客群畫像',
  '客流同期對比',
]

describe('OverviewPage', () => {
  beforeEach(() => {
    h.state.hourly = null
    h.state.entrance = null
    h.state.month = null
    h.state.weekday = null
    h.state.holiday = null
    h.state.unique = null
    h.state.audience = null
    h.state.compare = null
    h.state.uniqueFailOnce = false
    h.state.uniqueCalls = 0
  })

  it('shows 8 widget skeletons then data + honesty footnote', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByTestId(/^overview-widget-/)).toHaveLength(8)
    })

    for (const title of TITLES_ZH) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }

    // wait until branch resolved + fetchers created deferreds
    await waitFor(() => {
      expect(h.state.hourly).not.toBeNull()
      expect(h.state.unique).not.toBeNull()
    })
    expect(screen.getAllByLabelText('載入中…').length).toBeGreaterThanOrEqual(8)

    resolveAllOk()

    await waitFor(() => {
      expect(screen.getByText('420')).toBeInTheDocument()
    })
    expect(screen.queryAllByLabelText('載入中…')).toHaveLength(0)
    expect(screen.getByTestId('overview-honesty')).toHaveTextContent(
      '示例流量（匿名同級店舖）',
    )
  })

  it('retries a failed widget without blocking others', async () => {
    const user = userEvent.setup()
    h.state.uniqueFailOnce = true
    renderPage()

    await waitFor(() => {
      expect(h.state.hourly).not.toBeNull()
      expect(h.state.unique).not.toBeNull()
    })

    resolveAllOk()

    const uniqueCard = await screen.findByTestId('overview-widget-unique')
    await waitFor(() => {
      expect(within(uniqueCard).getByRole('button', { name: /重試/ })).toBeInTheDocument()
    })

    // other widgets already show data
    expect(screen.getByText('當日分時客流')).toBeInTheDocument()

    await user.click(within(uniqueCard).getByRole('button', { name: /重試/ }))

    await waitFor(() => {
      expect(h.state.uniqueCalls).toBeGreaterThanOrEqual(2)
      expect(h.state.unique).not.toBeNull()
    })
    h.state.unique?.resolve(FIXTURES.unique)

    await waitFor(() => {
      expect(within(uniqueCard).getByText('420')).toBeInTheDocument()
    })
  })
})
