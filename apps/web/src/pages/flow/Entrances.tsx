import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EntranceFootfallChart } from '@/components/footfall/OverviewWidgets'
import { WidgetCard } from '@/components/footfall/WidgetCard'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { CHART } from '@/lib/chartStyle'
import {
  fetchEntranceHourly,
  type EntranceHourly,
} from '@/lib/footfall/api'
import { fetchManagedBranchId } from '@/lib/roster/api'

type CardState = {
  data: EntranceHourly[] | null
  loading: boolean
  error: string | null
}

function todayTotals(g: EntranceHourly): { inCount: number; outCount: number } {
  return g.today.reduce(
    (acc, h) => ({
      inCount: acc.inCount + h.inCount,
      outCount: acc.outCount + h.outCount,
    }),
    { inCount: 0, outCount: 0 },
  )
}

function TodayEntranceBars({
  data,
  locale,
}: {
  data: EntranceHourly[]
  locale: string
}) {
  const { t } = useFlowLocale()
  const rows = data.map((g) => {
    const today = todayTotals(g)
    return {
      name: locale === 'zh-HK' ? g.nameZh : g.nameEn,
      in: today.inCount,
      out: today.outCount,
    }
  })
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows}>
        <CartesianGrid stroke="var(--flow-line)" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} width={36} />
        <Tooltip
          contentStyle={{
            background: 'var(--flow-panel-2)',
            border: '1px solid var(--flow-line)',
            borderRadius: 8,
            color: 'var(--flow-text)',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--flow-muted)' }} />
        <Bar dataKey="in" name={t('overview.series.in')} fill={CHART[1]} radius={[4, 4, 0, 0]} />
        <Bar dataKey="out" name={t('overview.series.out')} fill={CHART[4]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * /flow/entrances — per-gate today bars + 7-day totals (Phase 3 Task T5).
 */
export function EntrancesPage() {
  const { profile } = useFlowAuth()
  const { t, locale } = useFlowLocale()

  const [branchId, setBranchId] = useState<string | null>(null)
  const [branchResolved, setBranchResolved] = useState(false)
  const [card, setCard] = useState<CardState>({
    data: null,
    loading: true,
    error: null,
  })

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

  const load = useCallback(async () => {
    if (!branchId) return
    setCard({ data: null, loading: true, error: null })
    try {
      const data = await fetchEntranceHourly(branchId)
      setCard({ data, loading: false, error: null })
    } catch {
      setCard({ data: null, loading: false, error: t('common.error') })
    }
  }, [branchId, t])

  useEffect(() => {
    if (!branchId) return
    void load()
  }, [branchId, load])

  if (branchId === null && branchResolved && profile) {
    return (
      <div className="entrances-page">
        <div className="roster-error-banner">
          <span>{t('roster.error.FORBIDDEN')}</span>
        </div>
      </div>
    )
  }

  const waitingBranch = !branchResolved || !branchId
  const loading = waitingBranch || card.loading
  const empty = !loading && !card.error && Array.isArray(card.data) && card.data.length === 0

  return (
    <div className="entrances-page" data-testid="entrances-page">
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
        {t('entrances.title')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <WidgetCard
          testId="entrances-widget"
          title={t('entrances.today')}
          loading={loading}
          error={card.error}
          empty={empty}
          onRetry={load}
          wide
        >
          {card.data ? <TodayEntranceBars data={card.data} locale={locale} /> : null}
        </WidgetCard>

        <WidgetCard
          testId="entrances-widget-seven"
          title={t('entrances.sevenDay')}
          loading={loading}
          error={card.error}
          empty={empty}
          onRetry={load}
          wide
        >
          {card.data ? <EntranceFootfallChart data={card.data} locale={locale} /> : null}
        </WidgetCard>

        {card.data && card.data.length > 0 ? (
          <ul
            data-testid="entrances-totals"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 13,
              color: 'var(--flow-text)',
            }}
          >
            {card.data.map((g) => {
              const today = todayTotals(g)
              const name = locale === 'zh-HK' ? g.nameZh : g.nameEn
              return (
                <li key={g.entranceId}>
                  {name}
                  {' — '}
                  {t('entrances.todayIn')} {today.inCount}
                  {' / '}
                  {t('entrances.todayOut')} {today.outCount}
                  {' · '}
                  {t('entrances.sevenDayIn')} {g.sevenDayIn}
                  {' / '}
                  {t('entrances.sevenDayOut')} {g.sevenDayOut}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
