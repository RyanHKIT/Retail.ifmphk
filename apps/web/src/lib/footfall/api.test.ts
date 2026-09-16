import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  client: null as any,
}))

vi.mock('@/lib/supabase', () => ({
  createFlowSupabase: vi.fn(() => h.client),
}))

import { RosterError } from '@/lib/roster/api'
import {
  fetchAudience,
  fetchCompare,
  fetchDevices,
  fetchEntranceHourly,
  fetchHolidayAnalysis,
  fetchJourney,
  fetchMonthDaily,
  fetchTodayHourly,
  fetchTodayUnique,
  fetchWeekdayDistribution,
  hkDayBounds,
  hkMonthBounds,
  hkToday,
  isoWeekdayMonStart,
} from './api'

function promiseOf(state: { data: unknown; error: unknown }) {
  return Promise.resolve({ data: state.data, error: state.error })
}

const recs: Record<string, {
  _select: string
  _eq: [string, unknown][]
  _gte: [string, unknown][]
  _lte: [string, unknown][]
  _in: [string, unknown][]
}> = {}

function makeQB(
  state: { data: unknown; error: unknown },
  rec: (typeof recs)[string],
) {
  const qb: any = rec
  for (const m of ['eq', 'gte', 'lte', 'in', 'order', 'limit']) {
    qb[m] = vi.fn((col: string, val: unknown) => {
      if (m === 'eq') rec._eq.push([col, val])
      if (m === 'gte') rec._gte.push([col, val])
      if (m === 'lte') rec._lte.push([col, val])
      if (m === 'in') rec._in.push([col, val])
      return qb
    })
  }
  qb.select = vi.fn((cols: string) => {
    rec._select = cols
    return qb
  })
  qb.maybeSingle = vi.fn(() => qb)
  qb.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    promiseOf(state).then(res, rej)
  return qb
}

function makeClient(results: Record<string, { data: unknown; error: unknown }> = {}) {
  for (const k of Object.keys(recs)) delete recs[k]
  h.client = {
    from: vi.fn((table: string) => {
      if (!recs[table]) recs[table] = { _select: '', _eq: [], _gte: [], _lte: [], _in: [] }
      return makeQB(results[table] ?? { data: [], error: null }, recs[table])
    }),
  }
  return recs
}

beforeEach(() => {
  makeClient()
})

const BRANCH = 'a0000000-0000-4000-8000-000000000001'

describe('HK-day helpers', () => {
  it('hkToday uses Asia/Hong_Kong calendar day', () => {
    expect(hkToday(new Date('2026-09-15T15:59:00Z'))).toBe('2026-09-15')
    expect(hkToday(new Date('2026-09-15T16:00:00Z'))).toBe('2026-09-16')
  })

  it('hkDayBounds are +08:00 exclusive end', () => {
    expect(hkDayBounds('2026-09-15')).toEqual({
      gte: '2026-09-15T00:00:00+08:00',
      lt: '2026-09-16T00:00:00+08:00',
    })
  })

  it('hkMonthBounds covers the calendar month', () => {
    expect(hkMonthBounds('2026-09')).toEqual({
      start: '2026-09-01',
      endExclusive: '2026-10-01',
    })
  })

  it('isoWeekdayMonStart is 0=Mon', () => {
    expect(isoWeekdayMonStart('2026-09-14')).toBe(0)
    expect(isoWeekdayMonStart('2026-09-20')).toBe(6)
  })
})

describe('fetchTodayHourly', () => {
  it('selects schema columns and HK-today hour_start window', async () => {
    makeClient({
      footfall_hourly: {
        data: [
          {
            hour_start: '2026-09-15T10:00:00+08:00',
            in_count: 312,
            out_count: 298,
            unique_visitors: 280,
          },
        ],
        error: null,
      },
    })
    const rows = await fetchTodayHourly(BRANCH, new Date('2026-09-15T04:00:00Z'))
    const qb = recs.footfall_hourly
    expect(qb._select).toBe('hour_start,in_count,out_count,unique_visitors')
    expect(qb._eq).toContainEqual(['branch_id', BRANCH])
    expect(qb._gte).toContainEqual(['hour_start', '2026-09-15T00:00:00+08:00'])
    expect(qb._lte).toContainEqual(['hour_start', '2026-09-15T23:59:59+08:00'])
    expect(rows[0]).toEqual({
      hour: 10,
      inCount: 312,
      outCount: 298,
      uniqueVisitors: 280,
    })
  })

  it('maps query errors to RosterError', async () => {
    makeClient({
      footfall_hourly: { data: null, error: { message: 'FORBIDDEN: no' } },
    })
    await expect(fetchTodayHourly(BRANCH)).rejects.toBeInstanceOf(RosterError)
  })
})

describe('column contracts vs migration 20260915000002 + age alter', () => {
  it('fetchMonthDaily selects day,in_count,unique_visitors', async () => {
    makeClient({ footfall_daily: { data: [], error: null } })
    await fetchMonthDaily(BRANCH, '2026-09')
    expect(recs.footfall_daily._select).toBe('day,in_count,unique_visitors')
    expect(recs.footfall_daily._eq).toContainEqual(['branch_id', BRANCH])
    expect(recs.footfall_daily._gte).toContainEqual(['day', '2026-09-01'])
    expect(recs.footfall_daily._lte).toContainEqual(['day', '2026-09-30'])
  })

  it('fetchAudience selects gender,age_group,visitor_count', async () => {
    makeClient({ audience_daily: { data: [], error: null } })
    await fetchAudience(BRANCH, { start: '2026-09-01', end: '2026-09-15' })
    expect(recs.audience_daily._select).toBe('day,gender,age_group,visitor_count')
    expect(recs.audience_daily._eq).toContainEqual(['branch_id', BRANCH])
  })

  it('fetchDevices selects name,status,last_seen_at', async () => {
    makeClient({ devices: { data: [], error: null } })
    await fetchDevices(BRANCH)
    expect(recs.devices._select).toBe('name,status,last_seen_at')
    expect(recs.devices._eq).toContainEqual(['branch_id', BRANCH])
  })

  it('fetchEntranceHourly queries entrance_hourly + entrances', async () => {
    makeClient({
      entrances: {
        data: [{ id: 'g1', name_zh: '正門', name_en: 'Main', sort_order: 0 }],
        error: null,
      },
      entrance_hourly: { data: [], error: null },
    })
    await fetchEntranceHourly(BRANCH, new Date('2026-09-15T04:00:00Z'))
    expect(recs.entrances._select).toBe('id,name_zh,name_en,sort_order')
    expect(recs.entrances._eq).toContainEqual(['branch_id', BRANCH])
    expect(recs.entrance_hourly._select).toBe('entrance_id,hour_start,in_count,out_count')
  })
})

describe('aggregates', () => {
  it('fetchTodayUnique sums unique_visitors and 7-day spark', async () => {
    makeClient({
      footfall_hourly: {
        data: [{ unique_visitors: 10 }, { unique_visitors: 20 }],
        error: null,
      },
      footfall_daily: {
        data: [
          { day: '2026-09-09', unique_visitors: 100 },
          { day: '2026-09-15', unique_visitors: 30 },
        ],
        error: null,
      },
    })
    const kpi = await fetchTodayUnique(BRANCH, new Date('2026-09-15T04:00:00Z'))
    expect(kpi.today).toBe(30)
    expect(kpi.spark.map((s) => s.day)).toEqual(['2026-09-09', '2026-09-15'])
  })

  it('fetchWeekdayDistribution averages by Mon-start weekday', async () => {
    makeClient({
      footfall_daily: {
        data: [
          { day: '2026-09-07', in_count: 100 }, // Mon
          { day: '2026-09-14', in_count: 200 }, // Mon
          { day: '2026-09-08', in_count: 50 }, // Tue
        ],
        error: null,
      },
    })
    const rows = await fetchWeekdayDistribution(BRANCH, new Date('2026-09-15T04:00:00Z'))
    expect(rows[0]).toEqual({ weekday: 0, avgInCount: 150 })
    expect(rows[1]).toEqual({ weekday: 1, avgInCount: 50 })
  })

  it('fetchCompare loads selected, last-week-same-weekday, and YoY windows', async () => {
    makeClient({ footfall_daily: { data: [], error: null } })
    await fetchCompare(BRANCH, '2026-09-15')
    const gte = recs.footfall_daily._gte.map((x) => x[1])
    const lte = recs.footfall_daily._lte.map((x) => x[1])
    expect(gte).toContain('2026-09-08')
    expect(lte).toContain('2026-09-15')
    expect(gte).toContain('2025-09-08')
    expect(lte).toContain('2025-09-15')
  })

  it('fetchHolidayAnalysis pairs holidays with same-weekday normals', async () => {
    makeClient({
      calendar_days: {
        data: [{ day: '2026-05-01', is_holiday: true, name_zh: '勞動節', name_en: 'Labour Day' }],
        error: null,
      },
      footfall_daily: {
        data: [
          { day: '2026-05-01', in_count: 4000, unique_visitors: 3000 },
          { day: '2026-05-08', in_count: 2600, unique_visitors: 2000 },
        ],
        error: null,
      },
    })
    const rows = await fetchHolidayAnalysis(BRANCH)
    expect(rows[0].holidayNameZh).toBe('勞動節')
    expect(rows[0].holidayInCount).toBe(4000)
    expect(rows[0].normalInCount).toBe(2600)
  })
})

const JOURNEY_ZONES = [
  {
    id: 'z-entrance',
    zone_key: 'entrance',
    name_zh: '入口',
    name_en: 'Entrance',
    zone_type: 'entrance',
    anchor_x: 50,
    anchor_y: 88,
    anchor_r: 12,
  },
  {
    id: 'z-shelf-a',
    zone_key: 'shelf_a',
    name_zh: '貨架 A',
    name_en: 'Shelf A',
    zone_type: 'shelf',
    anchor_x: 22,
    anchor_y: 48,
    anchor_r: 16,
  },
  {
    id: 'z-shelf-b',
    zone_key: 'shelf_b',
    name_zh: '貨架 B',
    name_en: 'Shelf B',
    zone_type: 'shelf',
    anchor_x: 52,
    anchor_y: 42,
    anchor_r: 14,
  },
  {
    id: 'z-fitting',
    zone_key: 'fitting_room',
    name_zh: '試衣間',
    name_en: 'Fitting room',
    zone_type: 'fitting_room',
    anchor_x: 82,
    anchor_y: 50,
    anchor_r: 11,
  },
  {
    id: 'z-cashier',
    zone_key: 'cashier',
    name_zh: '收銀台',
    name_en: 'Cashier',
    zone_type: 'cashier',
    anchor_x: 72,
    anchor_y: 82,
    anchor_r: 10,
  },
]

describe('fetchJourney', () => {
  it('fetchJourney selects branch floorplan, zones anchors, heatmap_daily for the HK day', async () => {
    makeClient({
      branches: {
        data: {
          floor_plan_url: '/assets/floor-plans/it-cwb-demo.png',
          floor_plan_label_zh: '示範平面圖',
          floor_plan_label_en: 'Demo floor plan',
        },
        error: null,
      },
      zones: { data: JOURNEY_ZONES, error: null },
      heatmap_daily: {
        data: [
          { zone_id: 'z-entrance', visit_count: 100, avg_dwell_sec: 20, intensity: 1 },
        ],
        error: null,
      },
    })
    const payload = await fetchJourney(BRANCH, '2026-09-16')
    expect(recs.branches._select).toBe(
      'floor_plan_url,floor_plan_label_zh,floor_plan_label_en',
    )
    expect(recs.zones._select).toBe(
      'id,zone_key,name_zh,name_en,zone_type,anchor_x,anchor_y,anchor_r',
    )
    expect(recs.heatmap_daily._select).toBe(
      'zone_id,visit_count,avg_dwell_sec,intensity',
    )
    expect(recs.heatmap_daily._eq).toContainEqual(['day', '2026-09-16'])
    expect(payload.floorPlanUrl).toBe('/assets/floor-plans/it-cwb-demo.png')
    expect(payload.zones).toHaveLength(5)
    expect(payload.heat[0].zoneKey).toBe('entrance')
  })

  it('returns heat: [] when heatmap_daily is empty and does not throw', async () => {
    makeClient({
      branches: {
        data: {
          floor_plan_url: '/assets/floor-plans/it-cwb-demo.png',
          floor_plan_label_zh: '示範平面圖',
          floor_plan_label_en: 'Demo floor plan',
        },
        error: null,
      },
      zones: { data: JOURNEY_ZONES, error: null },
      heatmap_daily: { data: [], error: null },
    })
    const payload = await fetchJourney(BRANCH, '2026-09-16')
    expect(payload.heat).toEqual([])
  })
})
