// Task 10 (plan docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md):
// audit viewer — 50/page load-more, action filter, client-side text search
// (api fetchAudit({ limit, offset, action }) has no search param), actor +
// time + table + notes table, old/new jsonb diff expand. Behavior ported from
// _reference/hk-roster-planner/src/pages/AuditLogPage.tsx with fixes:
// - load-more hidden when a page returns < PAGE_SIZE (reference always shows it)
// - hasMore tracked from the last page length, not rows.length modulo
// - no hardcoded zh copy — strings via existing roster.* keys (flowMessages.ts
//   has no audit search/notes/all keys; closest existing keys reused, see
//   task report leftovers)
// - actor rendered as short id (no profiles join available)
// - searchable fields limited to notes / table_name / action

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { fetchAudit, fetchManagedBranchId, RosterError } from '@/lib/roster/api'
import type { AuditAction, AuditLogRow } from '@/lib/roster/types'

const PAGE_SIZE = 50

/** Every AuditAction enum value (migration 20260915000001) + the "all" filter. */
const AUDIT_ACTIONS: AuditAction[] = [
  'create',
  'update',
  'delete',
  'publish',
  'copy_week',
  'approve_swap',
  'reject_swap',
]

/** Badge tone per action, reusing roster conflict badge palettes. */
const ACTION_BADGE_KIND: Partial<Record<AuditAction, string>> = {
  delete: 'conflict-hard',
  reject_swap: 'conflict-hard',
  publish: 'conflict-clean',
  approve_swap: 'conflict-clean',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--flow-bg)',
  border: '1px solid var(--flow-line)',
  borderRadius: 6,
  color: 'var(--flow-text)',
  padding: '6px 9px',
  fontSize: 12,
}

function actionBadgeClass(action: AuditAction): string {
  const kind = ACTION_BADGE_KIND[action]
  return kind ? `roster-badge ${kind}` : 'roster-badge'
}

function shortActor(actorId: string | null): string {
  if (!actorId) return '—'
  return actorId.length > 8 ? actorId.slice(0, 8) : actorId
}

function pretty(value: Record<string, unknown> | null): string {
  return value == null ? '—' : JSON.stringify(value, null, 2)
}

/**
 * /flow/roster/audit — read-only audit log viewer (Phase 2 Task 10, spec §5).
 * 50 rows per page with load-more; action filter re-fetches page 0 server-side;
 * text search filters the loaded rows client-side (notes/table/action).
 */
export function AuditPage() {
  const { profile } = useFlowAuth()
  const { t } = useFlowLocale()

  // data state
  const [branchId, setBranchId] = useState<string | null>(null)
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // filter state
  const [filterAction, setFilterAction] = useState<string>('all')
  const [search, setSearch] = useState('')

  const effectiveSearch = useMemo(() => search.trim().toLowerCase(), [search])

  const visible = useMemo(() => {
    return rows.filter((r) => {
      const matchAction = filterAction === 'all' || r.action === filterAction
      const matchSearch =
        effectiveSearch === '' ||
        (r.notes ?? '').toLowerCase().includes(effectiveSearch) ||
        r.table_name.toLowerCase().includes(effectiveSearch) ||
        r.action.toLowerCase().includes(effectiveSearch)
      return matchAction && matchSearch
    })
  }, [rows, filterAction, effectiveSearch])

  const loadPage = useCallback(
    async (offset: number) => {
      if (!branchId) return
      setLoading(true)
      setLoadError(null)
      try {
        const page = await fetchAudit({
          limit: PAGE_SIZE,
          offset,
          ...(filterAction === 'all' ? {} : { action: filterAction }),
        })
        setRows((prev) => (offset === 0 ? page : [...prev, ...page]))
        setHasMore(page.length === PAGE_SIZE)
      } catch (err) {
        setLoadError(
          err instanceof RosterError
            ? t(`roster.error.${err.code}`)
            : t('common.error'),
        )
      } finally {
        setLoading(false)
      }
    },
    [branchId, filterAction, t],
  )

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    void (async () => {
      const id = await fetchManagedBranchId(profile.id)
      if (!cancelled) setBranchId(id)
    })()
    return () => {
      cancelled = true
    }
  }, [profile])

  // Initial load and every action-filter change restart from page 0.
  useEffect(() => {
    if (branchId) void loadPage(0)
  }, [branchId, filterAction, loadPage])

  function handleLoadMore() {
    void loadPage(rows.length)
  }

  function handleRetry() {
    void loadPage(0)
  }

  return (
    <div className="roster-board" data-testid="audit-page">
      {/* toolbar */}
      <div className="roster-toolbar">
        <div className="roster-title">
          <h2>{t('roster.audit.title')}</h2>
        </div>
        <input
          type="text"
          style={inputStyle}
          aria-label={t('roster.audit.title')}
          placeholder={t('roster.audit.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={inputStyle}
          aria-label={t('roster.audit.action')}
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="all">{t('roster.audit.all')}</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {t(`roster.audit.action.${a}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="roster-btn"
          onClick={handleRetry}
          disabled={loading}
        >
          {t('roster.refresh')}
        </button>
      </div>

      {/* error / loading */}
      {loadError && (
        <div className="roster-error-banner" role="alert">
          <span>{loadError}</span>
          <button type="button" className="roster-btn" onClick={handleRetry}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="roster-skeleton" aria-label={t('common.loading')}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bar" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="roster-empty-hint" role="status">
          {t('roster.audit.empty')}
        </div>
      ) : (
        <table className="roster-audit" data-testid="audit-table" style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              {[
                t('roster.audit.time'),
                t('roster.audit.actor'),
                t('roster.audit.action'),
                t('roster.audit.table'),
                t('roster.audit.notes'),
                '',
              ].map((label, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: 'left',
                    background: 'var(--flow-panel-2)',
                    color: 'var(--flow-muted)',
                    border: '1px solid var(--flow-line)',
                    padding: '6px 8px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <AuditRow
                key={r.id}
                row={r}
                expanded={expandedId === r.id}
                onToggle={() =>
                  setExpandedId((cur) => (cur === r.id ? null : r.id))
                }
              />
            ))}
          </tbody>
        </table>
      )}

      {hasMore && !loading && (
        <div>
          <button type="button" className="roster-btn" onClick={handleLoadMore}>
            {t('roster.audit.loadMore')}
          </button>
        </div>
      )}
    </div>
  )
}

interface AuditRowProps {
  row: AuditLogRow
  expanded: boolean
  onToggle: () => void
}

const cellStyle: React.CSSProperties = {
  border: '1px solid var(--flow-line)',
  padding: '6px 8px',
  verticalAlign: 'top',
}

const mutedStyle: React.CSSProperties = {
  ...cellStyle,
  color: 'var(--flow-muted)',
}

function AuditRow({ row, expanded, onToggle }: AuditRowProps) {
  const { t } = useFlowLocale()
  const hasDiff = row.old_data != null || row.new_data != null
  return (
    <>
      <tr>
        <td {...{ style: { ...mutedStyle, whiteSpace: 'nowrap' } }}>
          {new Date(row.created_at).toLocaleString()}
        </td>
        <td style={{ ...mutedStyle, whiteSpace: 'nowrap' }}>
          {shortActor(row.actor_id)}
        </td>
        <td style={cellStyle}>
          <span className={actionBadgeClass(row.action)}>
            {t(`roster.audit.action.${row.action}`)}
          </span>
        </td>
        <td style={{ ...mutedStyle, whiteSpace: 'nowrap' }}>{row.table_name}</td>
        <td style={mutedStyle}>{row.notes || '—'}</td>
        <td style={cellStyle}>
          {hasDiff ? (
            <button type="button" className="roster-icon-btn" onClick={onToggle}>
              {t('roster.audit.details')}
            </button>
          ) : null}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} style={cellStyle} data-testid={`audit-diff-${row.id}`}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--flow-muted)', marginBottom: 4 }}>
                  old
                </div>
                <pre
                  style={{
                    margin: 0,
                    background: 'var(--flow-bg)',
                    border: '1px solid var(--flow-line)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {pretty(row.old_data)}
                </pre>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--flow-muted)', marginBottom: 4 }}>
                  new
                </div>
                <pre
                  style={{
                    margin: 0,
                    background: 'var(--flow-bg)',
                    border: '1px solid var(--flow-line)',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {pretty(row.new_data)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default AuditPage
