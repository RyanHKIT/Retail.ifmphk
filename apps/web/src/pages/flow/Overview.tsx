import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  AudienceCharts,
  CompareChart,
  EntranceFootfallChart,
  HolidayAnalysisTable,
  MonthDailyChart,
  TodayHourlyChart,
  TodayUniqueKpi,
  WeekdayDistributionChart,
} from '@/components/footfall/OverviewWidgets'
import { WidgetCard } from '@/components/footfall/WidgetCard'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  fetchAudience,
  fetchCompare,
  fetchEntranceHourly,
  fetchHolidayAnalysis,
  fetchMonthDaily,
  fetchTodayHourly,
  fetchTodayUnique,
  fetchWeekdayDistribution,
  hkToday,
  type AudienceRow,
  type CompareSeries,
  type EntranceHourly,
  type HolidayRow,
  type HourlyPoint,
  type MonthDayPoint,
  type UniqueKpi,
  type WeekdayAvg,
} from '@/lib/footfall/api'
import { fetchManagedBranchId } from '@/lib/roster/api'

type CardState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

function initialCard<T>(): CardState<T> {
  return { data: null, loading: true, error: null }
}

function isEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length === 0
}

/**
 * /flow — manager 主控台 (Phase 3 Task T4).
 * Eight footfall widgets with per-card load/error/retry + honesty footnote.
 */
export function OverviewPage() {
  const { profile } = useFlowAuth()
  const { t, locale } = useFlowLocale()

  const [branchId, setBranchId] = useState<string | null>(null)
  const [branchResolved, setBranchResolved] = useState(false)

  const [hourly, setHourly] = useState<CardState<HourlyPoint[]>>(initialCard)
  const [entrance, setEntrance] = useState<CardState<EntranceHourly[]>>(initialCard)
  const [month, setMonth] = useState<CardState<MonthDayPoint[]>>(initialCard)
  const [weekday, setWeekday] = useState<CardState<WeekdayAvg[]>>(initialCard)
  const [holiday, setHoliday] = useState<CardState<HolidayRow[]>>(initialCard)
  const [unique, setUnique] = useState<CardState<UniqueKpi>>(initialCard)
  const [audience, setAudience] = useState<CardState<AudienceRow[]>>(initialCard)
  const [compare, setCompare] = useState<CardState<CompareSeries>>(initialCard)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    void (async () => {
      const id = await fetchManagedBranchId(profile.id)
      if (!cancelled) {
        setBranchId(id)
        setBranchResolved(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile])

  const loadCard = useCallback(
    async <T,>(
      setter: Dispatch<SetStateAction<CardState<T>>>,
      fetcher: () => Promise<T>,
    ) => {
      setter({ data: null, loading: true, error: null })
      try {
        const data = await fetcher()
        setter({ data, loading: false, error: null })
      } catch {
        setter({ data: null, loading: false, error: t('common.error') })
      }
    },
    [t],
  )

  const loadHourly = useCallback(() => {
    if (!branchId) return
    return loadCard(setHourly, () => fetchTodayHourly(branchId))
  }, [branchId, loadCard])

  const loadEntrance = useCallback(() => {
    if (!branchId) return
    return loadCard(setEntrance, () => fetchEntranceHourly(branchId))
  }, [branchId, loadCard])

  const loadMonth = useCallback(() => {
    if (!branchId) return
    const ym = hkToday().slice(0, 7)
    return loadCard(setMonth, () => fetchMonthDaily(branchId, ym))
  }, [branchId, loadCard])

  const loadWeekday = useCallback(() => {
    if (!branchId) return
    return loadCard(setWeekday, () => fetchWeekdayDistribution(branchId))
  }, [branchId, loadCard])

  const loadHoliday = useCallback(() => {
    if (!branchId) return
    return loadCard(setHoliday, () => fetchHolidayAnalysis(branchId))
  }, [branchId, loadCard])

  const loadUnique = useCallback(() => {
    if (!branchId) return
    return loadCard(setUnique, () => fetchTodayUnique(branchId))
  }, [branchId, loadCard])

  const loadAudience = useCallback(() => {
    if (!branchId) return
    const day = hkToday()
    return loadCard(setAudience, () =>
      fetchAudience(branchId, { start: day, end: day }),
    )
  }, [branchId, loadCard])

  const loadCompare = useCallback(() => {
    if (!branchId) return
    return loadCard(setCompare, () => fetchCompare(branchId, hkToday()))
  }, [branchId, loadCard])

  useEffect(() => {
    if (!branchId) return
    void loadHourly()
    void loadEntrance()
    void loadMonth()
    void loadWeekday()
    void loadHoliday()
    void loadUnique()
    void loadAudience()
    void loadCompare()
  }, [
    branchId,
    loadHourly,
    loadEntrance,
    loadMonth,
    loadWeekday,
    loadHoliday,
    loadUnique,
    loadAudience,
    loadCompare,
  ])

  if (branchId === null && branchResolved && profile) {
    return (
      <div className="overview-page">
        <div className="roster-error-banner">
          <span>{t('roster.error.FORBIDDEN')}</span>
        </div>
      </div>
    )
  }

  const waitingBranch = !branchResolved || !branchId

  return (
    <div className="overview-page" data-testid="overview-page">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 16,
        }}
      >
        <WidgetCard
          testId="overview-widget-hourly"
          title={t('overview.widget.hourly')}
          loading={waitingBranch || hourly.loading}
          error={hourly.error}
          empty={!hourly.loading && !hourly.error && isEmptyArray(hourly.data)}
          onRetry={loadHourly}
        >
          {hourly.data ? <TodayHourlyChart data={hourly.data} /> : null}
        </WidgetCard>

        <WidgetCard
          testId="overview-widget-entrance"
          title={t('overview.widget.entrance')}
          loading={waitingBranch || entrance.loading}
          error={entrance.error}
          empty={!entrance.loading && !entrance.error && isEmptyArray(entrance.data)}
          onRetry={loadEntrance}
        >
          {entrance.data ? (
            <EntranceFootfallChart data={entrance.data} locale={locale} />
          ) : null}
        </WidgetCard>

        <WidgetCard
          testId="overview-widget-month"
          title={t('overview.widget.month')}
          loading={waitingBranch || month.loading}
          error={month.error}
          empty={!month.loading && !month.error && isEmptyArray(month.data)}
          onRetry={loadMonth}
        >
          {month.data ? <MonthDailyChart data={month.data} /> : null}
        </WidgetCard>

        <WidgetCard
          testId="overview-widget-weekday"
          title={t('overview.widget.weekday')}
          loading={waitingBranch || weekday.loading}
          error={weekday.error}
          empty={!weekday.loading && !weekday.error && isEmptyArray(weekday.data)}
          onRetry={loadWeekday}
        >
          {weekday.data ? <WeekdayDistributionChart data={weekday.data} /> : null}
        </WidgetCard>

        <WidgetCard
          testId="overview-widget-holiday"
          title={t('overview.widget.holiday')}
          loading={waitingBranch || holiday.loading}
          error={holiday.error}
          empty={!holiday.loading && !holiday.error && isEmptyArray(holiday.data)}
          onRetry={loadHoliday}
        >
          {holiday.data ? (
            <HolidayAnalysisTable data={holiday.data} locale={locale} />
          ) : null}
        </WidgetCard>

        <WidgetCard
          testId="overview-widget-unique"
          title={t('overview.widget.unique')}
          loading={waitingBranch || unique.loading}
          error={unique.error}
          empty={
            !unique.loading &&
            !unique.error &&
            unique.data != null &&
            unique.data.today === 0 &&
            unique.data.spark.length === 0
          }
          onRetry={loadUnique}
          wide
        >
          {unique.data ? <TodayUniqueKpi data={unique.data} /> : null}
        </WidgetCard>

        <WidgetCard
          testId="overview-widget-audience"
          title={t('overview.widget.audience')}
          loading={waitingBranch || audience.loading}
          error={audience.error}
          empty={!audience.loading && !audience.error && isEmptyArray(audience.data)}
          onRetry={loadAudience}
        >
          {audience.data ? <AudienceCharts data={audience.data} /> : null}
        </WidgetCard>

        <WidgetCard
          testId="overview-widget-compare"
          title={t('overview.widget.compare')}
          loading={waitingBranch || compare.loading}
          error={compare.error}
          empty={
            !compare.loading &&
            !compare.error &&
            compare.data != null &&
            compare.data.selected.length === 0 &&
            compare.data.lastWeek.length === 0 &&
            compare.data.yoy.length === 0
          }
          onRetry={loadCompare}
        >
          {compare.data ? <CompareChart data={compare.data} /> : null}
        </WidgetCard>
      </div>

      <p
        data-testid="overview-honesty"
        style={{
          marginTop: 16,
          fontSize: 12,
          color: 'var(--flow-muted)',
          lineHeight: 1.5,
        }}
      >
        {t('overview.honesty')}
      </p>
    </div>
  )
}
