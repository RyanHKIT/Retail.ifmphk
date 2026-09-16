import { useCallback, useEffect, useState } from 'react'
import { WidgetCard } from '@/components/footfall/WidgetCard'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { fetchDevices, type DeviceRow } from '@/lib/footfall/api'
import { fetchManagedBranchId } from '@/lib/roster/api'

type CardState = {
  data: DeviceRow[] | null
  loading: boolean
  error: string | null
}

function statusKey(status: string): string {
  if (status === 'online' || status === 'offline' || status === 'degraded') {
    return `devices.status.${status}`
  }
  return 'devices.status.unknown'
}

/**
 * /flow/devices — read-only ETL device list (Phase 3 Task T7).
 */
export function DevicesPage() {
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
      const data = await fetchDevices(branchId)
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
      <div className="devices-page">
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
    <div className="devices-page" data-testid="devices-page">
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
        {t('devices.title')}
      </h2>

      <WidgetCard
        testId="devices-widget"
        title={t('devices.list')}
        loading={loading}
        error={card.error}
        empty={empty}
        onRetry={load}
        wide
      >
        {card.data && card.data.length > 0 ? (
          <ul
            data-testid="devices-list"
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              fontSize: 13,
              color: 'var(--flow-text)',
            }}
          >
            {card.data.map((d) => (
              <li
                key={d.name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: 12,
                  alignItems: 'baseline',
                  borderBottom: '1px solid var(--flow-line)',
                  paddingBottom: 8,
                }}
              >
                <span>{d.name}</span>
                <span style={{ color: 'var(--flow-muted)' }}>{t(statusKey(d.status))}</span>
                <span style={{ color: 'var(--flow-muted)', fontSize: 12 }}>
                  {d.lastSeenAt
                    ? `${t('devices.lastSeen')}: ${d.lastSeenAt}`
                    : t('devices.lastSeenNone')}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </WidgetCard>
    </div>
  )
}
