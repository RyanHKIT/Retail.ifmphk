import { useCallback, useEffect, useState } from 'react'
import { CompareChart } from '@/components/footfall/OverviewWidgets'
import { InsightBlock } from '@/components/flow/InsightBlock'
import { WidgetCard } from '@/components/footfall/WidgetCard'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  fetchCompare,
  hkToday,
  type CompareSeries,
} from '@/lib/footfall/api'
import { fetchManagedBranchId } from '@/lib/roster/api'

type CardState = {
  data: CompareSeries | null
  loading: boolean
  error: string | null
}

/**
 * /flow/compare — selected / last-week-same-weekday / YoY (Phase 3 Task T6).
 */
export function ComparePage() {
  const { profile } = useFlowAuth()
  const { t } = useFlowLocale()

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
      const data = await fetchCompare(branchId, hkToday())
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
      <div className="compare-page">
        <div className="roster-error-banner">
          <span>{t('roster.error.FORBIDDEN')}</span>
        </div>
      </div>
    )
  }

  const waitingBranch = !branchResolved || !branchId
  const loading = waitingBranch || card.loading
  const empty =
    !loading &&
    !card.error &&
    card.data != null &&
    card.data.selected.length === 0 &&
    card.data.lastWeek.length === 0 &&
    card.data.yoy.length === 0

  return (
    <div className="compare-page" data-testid="compare-page">
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
        {t('compare.title')}
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--flow-muted)' }}>
        {t('compare.subtitle')}
      </p>

      <InsightBlock tabKey="compare" />

      <WidgetCard
        testId="compare-widget"
        title={t('overview.widget.compare')}
        loading={loading}
        error={card.error}
        empty={empty}
        onRetry={load}
        wide
      >
        {card.data ? (
          <>
            <CompareChart data={card.data} />
            <ul
              data-testid="compare-series"
              style={{
                listStyle: 'none',
                margin: '12px 0 0',
                padding: 0,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                fontSize: 12,
                color: 'var(--flow-muted)',
              }}
            >
              <li>
                {t('overview.compare.selected')}: {card.data.selected.length}
              </li>
              <li>
                {t('overview.compare.lastWeek')}: {card.data.lastWeek.length}
              </li>
              <li>
                {t('overview.compare.yoy')}: {card.data.yoy.length}
              </li>
            </ul>
          </>
        ) : null}
      </WidgetCard>
    </div>
  )
}
