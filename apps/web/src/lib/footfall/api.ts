// SELECT-only footfall reads. Columns match migration 20260915000002
// plus age_group CHECK from 20260916000005 (DongQia buckets).
// HK calendar day = UTC+8. Browser never writes these tables.

import { createFlowSupabase } from '@/lib/supabase'
import { mapRpcError } from '@/lib/roster/api'

function sb() {
  return createFlowSupabase()
}

/**
 * Demo clock. Keep this in sync with the seeded demo data so the
 * pilot always shows data for 2026-09-16 regardless of wall-clock time.
 * Remove or set to null after pilot.
 */
export const FLOW_DEMO_DAY = '2026-09-16'

export function hkToday(now: Date = new Date()): string {
  if (FLOW_DEMO_DAY) return FLOW_DEMO_DAY
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Actual HK calendar day for non-demo use (e.g. auth/session logging). */
export function hkCalendarDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addIsoDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function hkDayBounds(day: string): { gte: string; lt: string } {
  return {
    gte: `${day}T00:00:00+08:00`,
    lt: `${addIsoDays(day, 1)}T00:00:00+08:00`,
  }
}

export function hkMonthBounds(yearMonth: string): { start: string; endExclusive: string } {
  const [y, m] = yearMonth.split('-').map(Number)
  const start = `${yearMonth}-01`
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  return { start, endExclusive: next }
}

/** 0=Monday … 6=Sunday. `isoDate` is a calendar Y-M-D (no TZ). */
export function isoWeekdayMonStart(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return (d.getUTCDay() + 6) % 7
}

function lastDayOfMonth(yearMonth: string): string {
  return addIsoDays(hkMonthBounds(yearMonth).endExclusive, -1)
}

export type HourlyPoint = {
  hour: number
  inCount: number
  outCount: number
  uniqueVisitors: number
}

export async function fetchTodayHourly(
  branchId: string,
  now: Date = new Date(),
): Promise<HourlyPoint[]> {
  const day = hkToday(now)
  const { data, error } = await sb()
    .from('footfall_hourly')
    .select('hour_start,in_count,out_count,unique_visitors')
    .eq('branch_id', branchId)
    .gte('hour_start', `${day}T00:00:00+08:00`)
    .lte('hour_start', `${day}T23:59:59+08:00`)
    .order('hour_start', { ascending: true })
  if (error) throw mapRpcError(error)
  return (data ?? []).map((row: {
    hour_start: string
    in_count: number
    out_count: number
    unique_visitors: number
  }) => ({
    hour: Number(row.hour_start.slice(11, 13)),
    inCount: row.in_count,
    outCount: row.out_count,
    uniqueVisitors: row.unique_visitors,
  }))
}

export type MonthDayPoint = { day: string; inCount: number; uniqueVisitors: number }

export async function fetchMonthDaily(
  branchId: string,
  yearMonth: string,
): Promise<MonthDayPoint[]> {
  const { start } = hkMonthBounds(yearMonth)
  const end = lastDayOfMonth(yearMonth)
  const { data, error } = await sb()
    .from('footfall_daily')
    .select('day,in_count,unique_visitors')
    .eq('branch_id', branchId)
    .gte('day', start)
    .lte('day', end)
    .order('day', { ascending: true })
  if (error) throw mapRpcError(error)
  return (data ?? []).map((row: { day: string; in_count: number; unique_visitors: number }) => ({
    day: row.day,
    inCount: row.in_count,
    uniqueVisitors: row.unique_visitors,
  }))
}

export type AudienceRow = { gender: string; ageGroup: string; visitorCount: number }

export async function fetchAudience(
  branchId: string,
  range: { start: string; end: string },
): Promise<AudienceRow[]> {
  const { data, error } = await sb()
    .from('audience_daily')
    .select('day,gender,age_group,visitor_count')
    .eq('branch_id', branchId)
    .gte('day', range.start)
    .lte('day', range.end)
  if (error) throw mapRpcError(error)
  const gender = new Map<string, number>()
  const age = new Map<string, number>()
  for (const row of data ?? []) {
    const r = row as { gender: string; age_group: string; visitor_count: number }
    if (r.age_group === 'unknown') {
      gender.set(r.gender, (gender.get(r.gender) ?? 0) + r.visitor_count)
    }
    if (r.gender === 'unknown' && r.age_group !== 'unknown') {
      age.set(r.age_group, (age.get(r.age_group) ?? 0) + r.visitor_count)
    }
  }
  const out: AudienceRow[] = []
  for (const [g, n] of gender) out.push({ gender: g, ageGroup: 'unknown', visitorCount: n })
  for (const [a, n] of age) out.push({ gender: 'unknown', ageGroup: a, visitorCount: n })
  return out
}

export type DeviceRow = { name: string; status: string; lastSeenAt: string | null }

export async function fetchDevices(branchId: string): Promise<DeviceRow[]> {
  const { data, error } = await sb()
    .from('devices')
    .select('name,status,last_seen_at')
    .eq('branch_id', branchId)
    .order('name', { ascending: true })
  if (error) throw mapRpcError(error)
  return (data ?? []).map((row: { name: string; status: string; last_seen_at: string | null }) => ({
    name: row.name,
    status: row.status,
    lastSeenAt: row.last_seen_at,
  }))
}

export type EntranceHourly = {
  entranceId: string
  nameZh: string
  nameEn: string
  sortOrder: number
  today: { hour: number; inCount: number; outCount: number }[]
  sevenDayIn: number
  sevenDayOut: number
}

export async function fetchEntranceHourly(
  branchId: string,
  now: Date = new Date(),
): Promise<EntranceHourly[]> {
  const client = sb()
  const { data: gates, error: gErr } = await client
    .from('entrances')
    .select('id,name_zh,name_en,sort_order')
    .eq('branch_id', branchId)
    .order('sort_order', { ascending: true })
  if (gErr) throw mapRpcError(gErr)

  const day = hkToday(now)
  const from = `${addIsoDays(day, -6)}T00:00:00+08:00`
  const to = `${day}T23:59:59+08:00`
  const { data: hours, error: hErr } = await client
    .from('entrance_hourly')
    .select('entrance_id,hour_start,in_count,out_count')
    .gte('hour_start', from)
    .lte('hour_start', to)
  if (hErr) throw mapRpcError(hErr)

  return (gates ?? []).map((gate: {
    id: string
    name_zh: string
    name_en: string
    sort_order: number
  }) => {
    const rows = (hours ?? []).filter((r: { entrance_id: string }) => r.entrance_id === gate.id)
    const todayRows = rows.filter((r: { hour_start: string }) => r.hour_start.startsWith(day))
    return {
      entranceId: gate.id,
      nameZh: gate.name_zh,
      nameEn: gate.name_en,
      sortOrder: gate.sort_order,
      today: todayRows.map((r: { hour_start: string; in_count: number; out_count: number }) => ({
        hour: Number(r.hour_start.slice(11, 13)),
        inCount: r.in_count,
        outCount: r.out_count,
      })),
      sevenDayIn: rows.reduce((s: number, r: { in_count: number }) => s + r.in_count, 0),
      sevenDayOut: rows.reduce((s: number, r: { out_count: number }) => s + r.out_count, 0),
    }
  })
}

export type UniqueKpi = { today: number; spark: { day: string; uniqueVisitors: number }[] }

export async function fetchTodayUnique(
  branchId: string,
  now: Date = new Date(),
): Promise<UniqueKpi> {
  const client = sb()
  const day = hkToday(now)
  const { data: hourly, error: hErr } = await client
    .from('footfall_hourly')
    .select('hour_start,in_count,out_count,unique_visitors')
    .eq('branch_id', branchId)
    .gte('hour_start', `${day}T00:00:00+08:00`)
    .lte('hour_start', `${day}T23:59:59+08:00`)
  if (hErr) throw mapRpcError(hErr)
  const today = (hourly ?? []).reduce(
    (s: number, r: { unique_visitors: number }) => s + r.unique_visitors,
    0,
  )

  const sparkStart = addIsoDays(day, -6)
  const { data: daily, error: dErr } = await client
    .from('footfall_daily')
    .select('day,in_count,unique_visitors')
    .eq('branch_id', branchId)
    .gte('day', sparkStart)
    .lte('day', day)
    .order('day', { ascending: true })
  if (dErr) throw mapRpcError(dErr)

  return {
    today,
    spark: (daily ?? []).map((r: { day: string; unique_visitors: number }) => ({
      day: r.day,
      uniqueVisitors: r.unique_visitors,
    })),
  }
}

export type WeekdayAvg = { weekday: number; avgInCount: number }

export async function fetchWeekdayDistribution(
  branchId: string,
  now: Date = new Date(),
): Promise<WeekdayAvg[]> {
  const day = hkToday(now)
  const start = addIsoDays(day, -56)
  const { data, error } = await sb()
    .from('footfall_daily')
    .select('day,in_count,unique_visitors')
    .eq('branch_id', branchId)
    .gte('day', start)
    .lte('day', day)
  if (error) throw mapRpcError(error)
  const buckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
  for (const row of data ?? []) {
    const r = row as { day: string; in_count: number }
    const w = isoWeekdayMonStart(r.day)
    buckets[w].sum += r.in_count
    buckets[w].n += 1
  }
  return buckets.map((b, weekday) => ({
    weekday,
    avgInCount: b.n ? b.sum / b.n : 0,
  }))
}

export type CompareSeries = {
  selected: MonthDayPoint[]
  lastWeek: MonthDayPoint[]
  yoy: MonthDayPoint[]
}

export async function fetchCompare(branchId: string, day: string): Promise<CompareSeries> {
  const client = sb()
  async function window(start: string, end: string): Promise<MonthDayPoint[]> {
    const { data, error } = await client
      .from('footfall_daily')
      .select('day,in_count,unique_visitors')
      .eq('branch_id', branchId)
      .gte('day', start)
      .lte('day', end)
      .order('day', { ascending: true })
    if (error) throw mapRpcError(error)
    return (data ?? []).map((r: { day: string; in_count: number; unique_visitors: number }) => ({
      day: r.day,
      inCount: r.in_count,
      uniqueVisitors: r.unique_visitors,
    }))
  }
  const selected = await window(addIsoDays(day, -7), day)
  const lastWeekEnd = addIsoDays(day, -7)
  const lastWeek = await window(addIsoDays(lastWeekEnd, -7), lastWeekEnd)
  const yoyDay = `${Number(day.slice(0, 4)) - 1}${day.slice(4)}`
  const yoy = await window(addIsoDays(yoyDay, -7), yoyDay)
  return { selected, lastWeek, yoy }
}

export type HolidayRow = {
  day: string
  holidayNameZh: string
  holidayNameEn: string
  holidayInCount: number
  normalInCount: number | null
}

export async function fetchHolidayAnalysis(branchId: string): Promise<HolidayRow[]> {
  const client = sb()
  const { data: holidays, error: cErr } = await client
    .from('calendar_days')
    .select('day,is_holiday,name_zh,name_en')
    .eq('is_holiday', true)
    .order('day', { ascending: true })
  if (cErr) throw mapRpcError(cErr)

  const { data: daily, error: dErr } = await client
    .from('footfall_daily')
    .select('day,in_count,unique_visitors')
    .eq('branch_id', branchId)
  if (dErr) throw mapRpcError(dErr)

  const byDay = new Map(
    (daily ?? []).map((r: { day: string; in_count: number }) => [r.day, r.in_count]),
  )
  const holidaySet = new Set(
    (holidays ?? []).map((h: { day: string }) => h.day),
  )

  return (holidays ?? [])
    .filter((h: { day: string }) => byDay.has(h.day))
    .map((h: { day: string; name_zh: string; name_en: string }) => {
      let normal: number | null = null
      for (let i = 1; i <= 4; i += 1) {
        const cand = addIsoDays(h.day, 7 * i)
        if (!holidaySet.has(cand) && byDay.has(cand)) {
          normal = byDay.get(cand) ?? null
          break
        }
      }
      return {
        day: h.day,
        holidayNameZh: h.name_zh,
        holidayNameEn: h.name_en,
        holidayInCount: byDay.get(h.day) ?? 0,
        normalInCount: normal,
      }
    })
}

export type ZoneKey = 'entrance' | 'shelf_a' | 'shelf_b' | 'fitting_room' | 'cashier'

export type ZoneRow = {
  id: string
  zoneKey: ZoneKey
  nameZh: string
  nameEn: string
  zoneType: string
  anchorX: number
  anchorY: number
  anchorR: number
}

export type HeatmapDayRow = {
  zoneId: string
  zoneKey: ZoneKey
  visitCount: number
  avgDwellSec: number
  intensity: number
}

export type JourneyPayload = {
  floorPlanUrl: string
  floorPlanLabelZh: string
  floorPlanLabelEn: string
  zones: ZoneRow[]
  heat: HeatmapDayRow[]
  day: string
}

export async function fetchJourney(
  branchId: string,
  day: string = hkToday(),
): Promise<JourneyPayload> {
  const client = sb()
  const { data: branch, error: bErr } = await client
    .from('branches')
    .select('floor_plan_url,floor_plan_label_zh,floor_plan_label_en')
    .eq('id', branchId)
    .maybeSingle()
  if (bErr) throw mapRpcError(bErr)

  const { data: zones, error: zErr } = await client
    .from('zones')
    .select('id,zone_key,name_zh,name_en,zone_type,anchor_x,anchor_y,anchor_r')
    .eq('branch_id', branchId)
  if (zErr) throw mapRpcError(zErr)

  const zoneRows: ZoneRow[] = (zones ?? []).map((z: {
    id: string
    zone_key: ZoneKey
    name_zh: string
    name_en: string
    zone_type: string
    anchor_x: number
    anchor_y: number
    anchor_r: number
  }) => ({
    id: z.id,
    zoneKey: z.zone_key,
    nameZh: z.name_zh,
    nameEn: z.name_en,
    zoneType: z.zone_type,
    anchorX: Number(z.anchor_x),
    anchorY: Number(z.anchor_y),
    anchorR: Number(z.anchor_r),
  }))

  const ids = zoneRows.map((z) => z.id)
  let heat: HeatmapDayRow[] = []
  if (ids.length > 0) {
    const { data: rows, error: hErr } = await client
      .from('heatmap_daily')
      .select('zone_id,visit_count,avg_dwell_sec,intensity')
      .eq('day', day)
      .in('zone_id', ids)
    if (hErr) throw mapRpcError(hErr)
    const byId = new Map(zoneRows.map((z) => [z.id, z.zoneKey]))
    heat = (rows ?? []).map((r: {
      zone_id: string
      visit_count: number
      avg_dwell_sec: number
      intensity: number
    }) => ({
      zoneId: r.zone_id,
      zoneKey: byId.get(r.zone_id) as ZoneKey,
      visitCount: r.visit_count,
      avgDwellSec: Number(r.avg_dwell_sec),
      intensity: Number(r.intensity),
    }))
  }

  return {
    floorPlanUrl: branch?.floor_plan_url ?? '',
    floorPlanLabelZh: branch?.floor_plan_label_zh ?? '',
    floorPlanLabelEn: branch?.floor_plan_label_en ?? '',
    zones: zoneRows,
    heat,
    day,
  }
}
