import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FlowFloorHeatmap, type HeatMetric } from '@/components/flow/FlowFloorHeatmap'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  fetchJourney,
  type JourneyPayload,
  type ZoneKey,
} from '@/lib/footfall/api'
import { fetchManagedBranchId } from '@/lib/roster/api'

const ZONE_KEYS = new Set<ZoneKey>([
  'entrance',
  'shelf_a',
  'shelf_b',
  'fitting_room',
  'cashier',
])

function parseZoneKey(raw: string | null): ZoneKey | null {
  if (!raw || !ZONE_KEYS.has(raw as ZoneKey)) return null
  return raw as ZoneKey
}

type JourneyState = {
  data: JourneyPayload | null
  loading: boolean
  error: string | null
}

/**
 * /flow/journey — floor heatmap hero with metric toggle and zone focus (Phase 4 T4).
 */
export function JourneyPage() {
  const { profile } = useFlowAuth()
  const { t, locale } = useFlowLocale()
  const [params, setParams] = useSearchParams()

  const [branchId, setBranchId] = useState<string | null>(null)
  const [branchResolved, setBranchResolved] = useState(false)
  const [metric, setMetric] = useState<HeatMetric>('composite')
  const [journey, setJourney] = useState<JourneyState>({
    data: null,
    loading: true,
    error: null,
  })

  const focusedKey = parseZoneKey(params.get('zone'))

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
    setJourney({ data: null, loading: true, error: null })
    try {
      const data = await fetchJourney(branchId)
      setJourney({ data, loading: false, error: null })
    } catch {
      setJourney({ data: null, loading: false, error: t('common.error') })
    }
  }, [branchId, t])

  useEffect(() => {
    if (!branchId) return
    void load()
  }, [branchId, load])

  const handleZoneClick = useCallback(
    (key: ZoneKey) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev)
        next.set('zone', key)
        return next
      })
    },
    [setParams],
  )

  const heatByKey = useMemo(() => {
    const map = new Map<ZoneKey, JourneyPayload['heat'][number]>()
    for (const row of journey.data?.heat ?? []) {
      map.set(row.zoneKey, row)
    }
    return map
  }, [journey.data?.heat])

  const zoneByKey = useMemo(() => {
    const map = new Map<ZoneKey, JourneyPayload['zones'][number]>()
    for (const z of journey.data?.zones ?? []) {
      map.set(z.zoneKey, z)
    }
    return map
  }, [journey.data?.zones])

  if (branchId === null && branchResolved && profile) {
    return (
      <div className="journey-page">
        <div className="roster-error-banner">
          <span>{t('roster.error.FORBIDDEN')}</span>
        </div>
      </div>
    )
  }

  const waitingBranch = !branchResolved || !branchId
  const loading = waitingBranch || journey.loading
  const empty =
    !loading &&
    !journey.error &&
    journey.data != null &&
    journey.data.heat.length === 0

  const focusedZone = focusedKey ? zoneByKey.get(focusedKey) : undefined
  const focusedHeat = focusedKey ? heatByKey.get(focusedKey) : undefined

  return (
    <div className="journey-page" data-testid="journey-page">
      <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>
        {t('journey.title')}
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--flow-muted)' }}>
        {t('journey.subtitle')}
      </p>

      <div
        role="group"
        aria-label={t('journey.heatmap')}
        data-testid="journey-metric-toggle"
        style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}
      >
        {(['composite', 'visits', 'dwell'] as const).map((m) => (
          <button
            key={m}
            type="button"
            className="roster-btn"
            aria-pressed={metric === m}
            onClick={() => setMetric(m)}
          >
            {t(`journey.${m}`)}
          </button>
        ))}
      </div>

      <section
        className="overview-widget"
        data-testid="journey-heatmap-widget"
        style={{
          background: 'var(--flow-panel)',
          border: '1px solid var(--flow-line)',
          borderRadius: 8,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t('journey.heatmap')}</h3>

        {loading ? (
          <div className="roster-skeleton" aria-label={t('common.loading')}>
            <div className="bar" />
            <div className="bar" />
            <div className="bar" />
          </div>
        ) : journey.error ? (
          <div className="roster-error-banner" role="alert">
            <span>{journey.error}</span>
            <button type="button" className="roster-btn" onClick={() => void load()}>
              {t('overview.retry')}
            </button>
          </div>
        ) : empty ? (
          <p className="roster-empty-hint" style={{ color: 'var(--flow-muted)', margin: 0 }}>
            {t('journey.empty')}
          </p>
        ) : journey.data ? (
          <>
            <FlowFloorHeatmap
              payload={journey.data}
              metric={metric}
              focusedKey={focusedKey}
              onZoneClick={handleZoneClick}
            />
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                fontSize: 12,
                color: 'var(--flow-muted)',
              }}
            >
              <span>{t('journey.low')}</span>
              <span>{t('journey.high')}</span>
              <span>{t('journey.click')}</span>
            </div>
            {focusedKey && focusedZone && focusedHeat ? (
              <aside
                data-testid="journey-focus"
                style={{
                  fontSize: 13,
                  color: 'var(--flow-text)',
                  borderTop: '1px solid var(--flow-line)',
                  paddingTop: 12,
                }}
              >
                <strong>{locale === 'zh-HK' ? focusedZone.nameZh : focusedZone.nameEn}</strong>
                <div>
                  {t('journey.focusVisits')}: {focusedHeat.visitCount}
                </div>
                <div>
                  {t('journey.focusDwell')}: {focusedHeat.avgDwellSec} {t('journey.sec')}
                </div>
              </aside>
            ) : null}
          </>
        ) : null}
      </section>

      <p
        data-testid="journey-honesty"
        style={{ margin: 0, fontSize: 12, color: 'var(--flow-muted)', lineHeight: 1.5 }}
      >
        {t('overview.honesty')} · {t('journey.demoPlan')}
      </p>
    </div>
  )
}
