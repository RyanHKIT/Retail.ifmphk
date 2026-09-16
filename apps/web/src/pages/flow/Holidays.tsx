import { useCallback, useEffect, useState } from 'react'
import { HolidayAnalysisTable } from '@/components/footfall/OverviewWidgets'
import { WidgetCard } from '@/components/footfall/WidgetCard'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  fetchHolidayAnalysis,
  type HolidayRow,
} from '@/lib/footfall/api'
import { fetchManagedBranchId } from '@/lib/roster/api'

type CardState = {
  data: HolidayRow[] | null
  loading: boolean
  error: string | null
}

/**
 * /flow/holidays — holiday vs normal-day traffic (Phase 3 Task T6).
 */
export function HolidaysPage() {
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
      const data = await fetchHolidayAnalysis(branchId)
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
      <div className="holidays-page">
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
    <div className="holidays-page" data-testid="holidays-page">
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
        {t('holidays.title')}
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--flow-muted)' }}>
        {t('holidays.note')}
      </p>

      <WidgetCard
        testId="holidays-widget"
        title={t('overview.widget.holiday')}
        loading={loading}
        error={card.error}
        empty={empty}
        onRetry={load}
        wide
      >
        {card.data ? <HolidayAnalysisTable data={card.data} locale={locale} /> : null}
      </WidgetCard>
    </div>
  )
}
