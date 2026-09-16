import type { ReactNode } from 'react'
import { useFlowLocale } from '@/context/FlowLocaleContext'

type WidgetCardProps = {
  title: string
  loading?: boolean
  error?: string | null
  empty?: boolean
  onRetry?: () => void
  children?: ReactNode
  testId: string
  /** KPI / wide card spans both columns on wide layouts */
  wide?: boolean
}

/**
 * Shared footfall widget shell: title, skeleton, error+retry, empty.
 * Per-card load state — not all-or-nothing.
 */
export function WidgetCard({
  title,
  loading = false,
  error = null,
  empty = false,
  onRetry,
  children,
  testId,
  wide = false,
}: WidgetCardProps) {
  const { t } = useFlowLocale()

  return (
    <section
      className="overview-widget"
      data-testid={testId}
      data-wide={wide ? 'true' : undefined}
      style={{
        background: 'var(--flow-panel)',
        border: '1px solid var(--flow-line)',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        minHeight: 220,
        gridColumn: wide ? '1 / -1' : undefined,
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--flow-text)',
        }}
      >
        {title}
      </h3>

      {loading ? (
        <div className="roster-skeleton" aria-label={t('common.loading')}>
          <div className="bar" />
          <div className="bar" />
          <div className="bar" />
        </div>
      ) : error ? (
        <div className="roster-error-banner" role="alert">
          <span>{error}</span>
          {onRetry ? (
            <button type="button" className="roster-btn" onClick={onRetry}>
              {t('overview.retry')}
            </button>
          ) : null}
        </div>
      ) : empty ? (
        <p className="roster-empty-hint" style={{ color: 'var(--flow-muted)', margin: 0 }}>
          {t('overview.empty')}
        </p>
      ) : (
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      )}
    </section>
  )
}
