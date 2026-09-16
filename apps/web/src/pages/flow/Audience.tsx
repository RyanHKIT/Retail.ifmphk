import { useCallback, useEffect, useState } from 'react'
import { AudienceCharts } from '@/components/footfall/OverviewWidgets'
import { WidgetCard } from '@/components/footfall/WidgetCard'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  fetchAudience,
  hkToday,
  type AudienceRow,
} from '@/lib/footfall/api'
import { fetchManagedBranchId } from '@/lib/roster/api'

const AGE_KEYS = [
  'toddler',
  'teenager',
  'youth',
  'middle_aged',
  'elderly',
  'unknown',
] as const

type CardState = {
  data: AudienceRow[] | null
  loading: boolean
  error: string | null
}

/**
 * /flow/audience — gender + age-group drill (Phase 3 Task T5).
 * Range: month-to-date (HK calendar).
 */
export function AudiencePage() {
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
      const end = hkToday()
      const start = `${end.slice(0, 7)}-01`
      const data = await fetchAudience(branchId, { start, end })
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
      <div className="audience-page">
        <div className="roster-error-banner">
          <span>{t('roster.error.FORBIDDEN')}</span>
        </div>
      </div>
    )
  }

  const waitingBranch = !branchResolved || !branchId
  const loading = waitingBranch || card.loading
  const empty = !loading && !card.error && Array.isArray(card.data) && card.data.length === 0

  const ageLabels =
    card.data?.filter((r) => r.gender === 'unknown' && r.ageGroup !== 'unknown') ?? []

  return (
    <div className="audience-page" data-testid="audience-page">
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
        {t('audience.title')}
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--flow-muted)' }}>
        {t('audience.range')}
      </p>

      <WidgetCard
        testId="audience-widget"
        title={t('overview.widget.audience')}
        loading={loading}
        error={card.error}
        empty={empty}
        onRetry={load}
        wide
      >
        {card.data ? (
          <>
            <AudienceCharts data={card.data} />
            {ageLabels.length > 0 ? (
              <ul
                data-testid="audience-age-labels"
                style={{
                  listStyle: 'none',
                  margin: '12px 0 0',
                  padding: 0,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  fontSize: 12,
                  color: 'var(--flow-muted)',
                }}
              >
                {AGE_KEYS.map((key) => {
                  const row = ageLabels.find((r) => r.ageGroup === key)
                  if (!row) return null
                  return (
                    <li key={key}>
                      {t(`overview.age.${key}`)}: {row.visitorCount.toLocaleString()}
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </>
        ) : null}
      </WidgetCard>
    </div>
  )
}
