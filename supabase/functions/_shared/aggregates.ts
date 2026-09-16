// Aggregate fetchers, one per overview tab.
//
// All numbers come from here. The browser sends only a tab key, a day, and a
// locale, so a caller cannot place text into the prompt by way of the request
// body. Everything below runs under the service role, and only derived
// aggregates leave this module — never a raw row, never a name.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { TabKey } from './prompts.ts'

/** Cap on rows folded into a prompt. Keeps a bad seed from blowing the budget. */
const MAX_HOURS = 24

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + delta)
  return isoDay(date)
}

interface HourRow {
  hour_start: string
  in_count: number
  out_count: number
  passersby_count: number
  unique_visitors: number
}

interface DayRow {
  day: string
  in_count: number
  out_count: number
  passersby_count: number
  unique_visitors: number
}

function hourOf(iso: string): string {
  return new Date(iso).toISOString().slice(11, 16)
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function share(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 1000) / 10 : 0
}

/** Today's shape: hourly curve, peak, and the week's daily trend. */
async function overview(service: SupabaseClient, branchId: string, day: string) {
  const [hoursResult, weekResult, audienceResult] = await Promise.all([
    service
      .from('footfall_hourly')
      .select('hour_start, in_count, out_count, passersby_count, unique_visitors')
      .eq('branch_id', branchId)
      .gte('hour_start', `${day}T00:00:00Z`)
      .lt('hour_start', `${addDays(day, 1)}T00:00:00Z`)
      .order('hour_start')
      .limit(MAX_HOURS),
    service
      .from('footfall_daily')
      .select('day, in_count, out_count, passersby_count, unique_visitors')
      .eq('branch_id', branchId)
      .gte('day', addDays(day, -6))
      .lte('day', day)
      .order('day'),
    service
      .from('audience_daily')
      .select('gender, age_group, visitor_count')
      .eq('branch_id', branchId)
      .eq('day', day),
  ])

  const hours = (hoursResult.data ?? []) as HourRow[]
  const week = (weekResult.data ?? []) as DayRow[]
  const audience = audienceResult.data ?? []

  const todayRow = week.find((row) => row.day === day)
  const totalIn = todayRow?.in_count ?? sum(hours.map((h) => h.in_count))
  const totalOut = todayRow?.out_count ?? sum(hours.map((h) => h.out_count))
  const uniqueVisitors = todayRow?.unique_visitors ?? 0
  const passersby = todayRow?.passersby_count ?? 0

  const ranked = [...hours].sort((a, b) => b.in_count - a.in_count)
  const peak = ranked[0]

  // Average in_count for the peak hour across the week, so "busy" has a baseline.
  const priorDays = week.filter((row) => row.day !== day)
  const priorAvgIn =
    priorDays.length > 0
      ? Math.round(sum(priorDays.map((row) => row.in_count)) / priorDays.length)
      : null

  // Weekends run about 36% busier than weekdays in this store, so a baseline
  // that mixes them makes a normal Wednesday look like a collapse. That baseline
  // is supplied explicitly because the first live run, given only the mixed
  // average, invented a weekday figure of its own ("約2630人" where the real
  // value is 2637) and presented it as the normal level.
  const priorWeekdays = priorDays.filter((row) => {
    const weekday = new Date(`${row.day}T00:00:00Z`).getUTCDay()
    return weekday >= 1 && weekday <= 5
  })
  const priorWeekdayAvgIn =
    priorWeekdays.length > 0
      ? Math.round(sum(priorWeekdays.map((row) => row.in_count)) / priorWeekdays.length)
      : null

  // The busiest prior day, so a "down on the peak" comparison can cite a real
  // figure instead of rounding a subtraction into an invented one.
  const priorPeakInCount =
    priorDays.length > 0 ? Math.max(...priorDays.map((row) => row.in_count)) : null

  // Supplied because the model cannot otherwise express "how much down" without
  // subtracting two counts in prose, which is how "低約1000人" (really 956) got
  // into a briefing. A percentage is computed here so there is nothing to invent.
  const changeFromPriorWeekdayPercent =
    priorWeekdayAvgIn && priorWeekdayAvgIn > 0
      ? Math.round(((totalIn - priorWeekdayAvgIn) / priorWeekdayAvgIn) * 1000) / 10
      : null
  const changeFromPriorPeakPercent =
    priorPeakInCount && priorPeakInCount > 0
      ? Math.round(((totalIn - priorPeakInCount) / priorPeakInCount) * 1000) / 10
      : null

  const genderTotals: Record<string, number> = {}
  const ageTotals: Record<string, number> = {}
  for (const row of audience) {
    const gender = row.gender as string
    const age = row.age_group as string
    if (gender !== 'unknown') {
      genderTotals[gender] = (genderTotals[gender] ?? 0) + (row.visitor_count as number)
    }
    if (age) {
      ageTotals[age] = (ageTotals[age] ?? 0) + (row.visitor_count as number)
    }
  }

  return {
    day,
    today: {
      inCount: totalIn,
      outCount: totalOut,
      uniqueVisitors,
      passersbyCount: passersby,
      // unique_visitors is a distinct-person count, so it must not exceed in_count.
      // Surfacing the ratio lets the analyst notice a seed error instead of
      // reporting a contradiction as insight.
      uniqueToInRatio: totalIn > 0 ? Math.round((uniqueVisitors / totalIn) * 100) / 100 : null,
    },
    hourly: hours.map((row) => ({
      hour: hourOf(row.hour_start),
      inCount: row.in_count,
      outCount: row.out_count,
    })),
    peakHour: peak
      ? { hour: hourOf(peak.hour_start), inCount: peak.in_count, shareOfDay: share(peak.in_count, totalIn) }
      : null,
    weekDaily: week.map((row) => ({ day: row.day, inCount: row.in_count })),
    priorDaysAverageInCount: priorAvgIn,
    // The baseline to prefer when the comparison is "a normal working day".
    priorWeekdayAverageInCount: priorWeekdayAvgIn,
    // The busiest prior day, for "down on the peak" comparisons.
    priorPeakInCount,
    // Precomputed deltas. Cite these to describe a difference; never subtract.
    changeFromPriorWeekdayPercent,
    changeFromPriorPeakPercent,
    // Excluded from the age/gender totals above on purpose: age rows are keyed
    // with gender 'unknown' and vice versa, so summing across both dimensions
    // would double-count the same visitor. Reported separately, never added.
    mix: { gender: genderTotals, ageGroup: ageTotals },
  }
}

/** Zone intensity and dwell, ranked. */
async function journey(service: SupabaseClient, branchId: string, day: string) {
  const { data: zones } = await service
    .from('zones')
    .select('id, zone_key, name_zh, name_en, zone_type')
    .eq('branch_id', branchId)

  if (!zones || zones.length === 0) return { day, zones: [] }

  const { data: heat } = await service
    .from('heatmap_daily')
    .select('zone_id, visit_count, avg_dwell_sec, intensity')
    .eq('day', day)
    .in(
      'zone_id',
      zones.map((zone) => zone.id),
    )

  const byZone = new Map<string, { visit_count: number; avg_dwell_sec: number; intensity: number }>()
  for (const row of heat ?? []) {
    byZone.set(row.zone_id as string, {
      visit_count: row.visit_count as number,
      avg_dwell_sec: Number(row.avg_dwell_sec),
      intensity: Number(row.intensity),
    })
  }

  const ranked = zones
    .map((zone) => {
      const stats = byZone.get(zone.id as string)
      return {
        zone: zone.name_zh as string,
        zoneKey: zone.zone_key as string,
        type: zone.zone_type as string,
        visitCount: stats?.visit_count ?? 0,
        avgDwellSec: stats?.avg_dwell_sec ?? 0,
        // Normalised within the day: comparable across zones today, not across days.
        intensity: stats?.intensity ?? 0,
      }
    })
    .sort((a, b) => b.intensity - a.intensity)

  return { day, zones: ranked }
}

/** Per-gate load, today and over the week, with share of total. */
async function entrances(service: SupabaseClient, branchId: string, day: string) {
  const { data: gates } = await service
    .from('entrances')
    .select('id, name_zh, name_en')
    .eq('branch_id', branchId)
    .order('sort_order')

  if (!gates || gates.length === 0) return { day, gates: [] }

  const gateIds = gates.map((gate) => gate.id as string)

  const [todayResult, weekResult] = await Promise.all([
    service
      .from('entrance_hourly')
      .select('entrance_id, in_count, out_count')
      .gte('hour_start', `${day}T00:00:00Z`)
      .lt('hour_start', `${addDays(day, 1)}T00:00:00Z`)
      .in('entrance_id', gateIds),
    service
      .from('entrance_hourly')
      .select('entrance_id, in_count, out_count')
      .gte('hour_start', `${addDays(day, -6)}T00:00:00Z`)
      .lt('hour_start', `${addDays(day, 1)}T00:00:00Z`)
      .in('entrance_id', gateIds),
  ])

  function fold(rows: Record<string, unknown>[] | null) {
    const totals = new Map<string, { inCount: number; outCount: number }>()
    for (const row of rows ?? []) {
      const id = row.entrance_id as string
      const current = totals.get(id) ?? { inCount: 0, outCount: 0 }
      current.inCount += row.in_count as number
      current.outCount += row.out_count as number
      totals.set(id, current)
    }
    return totals
  }

  const todayTotals = fold(todayResult.data)
  const weekTotals = fold(weekResult.data)
  const todayTotalIn = sum([...todayTotals.values()].map((value) => value.inCount))

  return {
    day,
    totalInCount: todayTotalIn,
    gates: gates.map((gate) => {
      const today = todayTotals.get(gate.id as string) ?? { inCount: 0, outCount: 0 }
      const week = weekTotals.get(gate.id as string) ?? { inCount: 0, outCount: 0 }
      return {
        gate: gate.name_zh as string,
        todayInCount: today.inCount,
        todayOutCount: today.outCount,
        // Share of the store's total entries today — the imbalance signal.
        shareOfTotalPercent: share(today.inCount, todayTotalIn),
        sevenDayInCount: week.inCount,
        sevenDayOutCount: week.outCount,
        // >1 means the gate admits more than it releases over the window.
        inOutRatio:
          today.outCount > 0 ? Math.round((today.inCount / today.outCount) * 100) / 100 : null,
      }
    }),
  }
}

/** Composition today against the same weekday last week. */
async function audience(service: SupabaseClient, branchId: string, day: string) {
  const priorDay = addDays(day, -7)

  const { data } = await service
    .from('audience_daily')
    .select('day, gender, age_group, visitor_count')
    .eq('branch_id', branchId)
    .in('day', [day, priorDay])

  const rows = data ?? []

  function bucket(targetDay: string) {
    const byAge: Record<string, number> = {}
    const byGender: Record<string, number> = {}
    for (const row of rows) {
      if (row.day !== targetDay) continue
      const age = row.age_group as string
      const gender = row.gender as string
      if (age) byAge[age] = (byAge[age] ?? 0) + (row.visitor_count as number)
      if (gender !== 'unknown') {
        byGender[gender] = (byGender[gender] ?? 0) + (row.visitor_count as number)
      }
    }
    return { byAge, byGender }
  }

  const current = bucket(day)
  const prior = bucket(priorDay)

  return {
    day,
    comparisonDay: priorDay,
    // Two dimensions are reported separately: a visitor appears in one age row
    // and one gender row, so the two totals must never be added together.
    ageGroup: current.byAge,
    gender: current.byGender,
    priorWeekAgeGroup: prior.byAge,
    priorWeekGender: prior.byGender,
  }
}

/** Selected period against last week and year-on-year, aligned by offset. */
async function compare(service: SupabaseClient, branchId: string, day: string) {
  const { data } = await service
    .from('footfall_daily')
    .select('day, in_count')
    .eq('branch_id', branchId)
    .gte('day', addDays(day, -400))
    .lte('day', day)
    .order('day')

  const rows = (data ?? []) as { day: string; in_count: number }[]
  const byDay = new Map(rows.map((row) => [row.day, row.in_count]))

  const selected = byDay.get(day) ?? null
  const lastWeek = byDay.get(addDays(day, -7)) ?? null
  const lastYear = byDay.get(addDays(day, -364)) ?? null

  const priorWeek = Array.from({ length: 7 }, (_, index) => addDays(day, -7 - index))
    .map((key) => byDay.get(key))
    .filter((value): value is number => typeof value === 'number')

  return {
    day,
    // Comparison basis is explicit, because a percentage without its baseline
    // is not interpretable.
    basis: 'same weekday, previous week and previous year (±364 days)',
    selectedInCount: selected,
    lastWeekInCount: lastWeek,
    lastYearInCount: lastYear,
    weekOverWeekPercent:
      selected != null && lastWeek ? Math.round(((selected - lastWeek) / lastWeek) * 1000) / 10 : null,
    yearOverYearPercent:
      selected != null && lastYear ? Math.round(((selected - lastYear) / lastYear) * 1000) / 10 : null,
    priorWeekDailyAverageInCount:
      priorWeek.length > 0 ? Math.round(sum(priorWeek) / priorWeek.length) : null,
  }
}

/** Holiday lift against the matched normal weekday. */
async function holidays(service: SupabaseClient, branchId: string, day: string) {
  const { data: calendar } = await service
    .from('calendar_days')
    .select('day, is_holiday, name_zh')
    .gte('day', addDays(day, -120))
    .order('day')

  const { data: daily } = await service
    .from('footfall_daily')
    .select('day, in_count')
    .eq('branch_id', branchId)
    .gte('day', addDays(day, -400))
    .lte('day', day)

  const byDay = new Map((daily ?? []).map((row) => [row.day as string, row.in_count as number]))
  const holidayDays = (calendar ?? []).filter((row) => row.is_holiday)

  const lifts = holidayDays
    .map((row) => {
      const holidayIn = byDay.get(row.day as string)
      if (holidayIn == null) return null
      // Match the nearest normal day with the same weekday, so the comparison
      // is not confounded by day-of-week traffic differences.
      const weekday = new Date(`${row.day}T00:00:00Z`).getUTCDay()
      const normals: number[] = []
      for (let offset = 7; offset <= 56; offset += 7) {
        const candidateDay = addDays(row.day as string, -offset)
        const candidateHoliday = (calendar ?? []).find((entry) => entry.day === candidateDay)
        if (candidateHoliday?.is_holiday) continue
        const value = byDay.get(candidateDay)
        if (typeof value === 'number') normals.push(value)
      }
      if (normals.length === 0) return null
      const normalAverage = Math.round(sum(normals) / normals.length)
      return {
        day: row.day as string,
        name: row.name_zh as string,
        weekday,
        holidayInCount: holidayIn,
        matchedNormalAverageInCount: normalAverage,
        liftPercent:
          normalAverage > 0
            ? Math.round(((holidayIn - normalAverage) / normalAverage) * 1000) / 10
            : null,
      }
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((a, b) => (b.liftPercent ?? 0) - (a.liftPercent ?? 0))
    .slice(0, 12)

  return { day, holidays: lifts }
}

export async function fetchTabAggregates(
  service: SupabaseClient,
  tabKey: TabKey,
  branchId: string,
  day: string,
): Promise<unknown> {
  switch (tabKey) {
    case 'overview':
      return await overview(service, branchId, day)
    case 'journey':
      return await journey(service, branchId, day)
    case 'entrances':
      return await entrances(service, branchId, day)
    case 'audience':
      return await audience(service, branchId, day)
    case 'compare':
      return await compare(service, branchId, day)
    case 'holidays':
      return await holidays(service, branchId, day)
  }
}

export { addDays }
