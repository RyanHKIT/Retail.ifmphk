// /flow/roster/swaps — manager swap-approval list (Phase 2 Task 9).
// Default filter = pending; approve/reject share one review dialog and one API
// call: reviewSwap(id, approve, notes). The server RPC `review_swap_request`
// performs the targeted assignment exchange; approving an open bid only closes
// the request (no swap). Reviewed rows show reviewed_at + review_notes.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  fetchEmployees,
  fetchManagedBranchId,
  fetchSwaps,
  RosterError,
  reviewSwap,
} from '@/lib/roster/api'
import type { EmployeeRow, SwapRequestRow, SwapStatus } from '@/lib/roster/types'

type Filter = 'pending' | 'all'

interface ReviewTarget {
  row: SwapRequestRow
  approve: boolean
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

export function SwapsPage() {
  const { profile } = useFlowAuth()
  const { t, locale } = useFlowLocale()
  const zh = locale === 'zh-HK'

  const [filter, setFilter] = useState<Filter>('pending')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [swaps, setSwaps] = useState<SwapRequestRow[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [review, setReview] = useState<ReviewTarget | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const empName = useCallback(
    (id: string | null | undefined) => {
      if (!id) return ''
      const e = employees.find((x) => x.id === id)
      return e ? (zh ? e.name_zh : e.name_en || e.name_zh) : id
    },
    [employees, zh],
  )

  const loadData = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    setLoadError(null)
    try {
      const [sw, emps] = await Promise.all([
        fetchSwaps(),
        fetchEmployees(branchId),
      ])
      setSwaps(sw)
      setEmployees(emps)
    } catch (err) {
      setLoadError(
        err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
      )
    } finally {
      setLoading(false)
    }
  }, [branchId, t])

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

  useEffect(() => {
    void loadData()
  }, [loadData])

  const filtered = useMemo(
    () => (filter === 'all' ? swaps : swaps.filter((s) => s.status === 'pending')),
    [swaps, filter],
  )

  function openReview(row: SwapRequestRow, approve: boolean) {
    setNotes('')
    setActionError(null)
    setReview({ row, approve })
  }

  async function confirmReview() {
    if (!review || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await reviewSwap(review.row.id, review.approve, notes)
      setReview(null)
      await loadData()
    } catch (err) {
      setActionError(
        err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
      )
    } finally {
      setBusy(false)
    }
  }

  const statusBadge = (status: SwapStatus) => (
    <span className="roster-badge" data-testid="swap-status">
      {t(`roster.swaps.status.${status}`)}
    </span>
  )

  return (
    <div className="roster-board" data-testid="swaps-page">
      {/* toolbar */}
      <div className="roster-toolbar">
        <div className="roster-title">
          <h2>{t('roster.swaps.title')}</h2>
        </div>
        <div
          className="roster-segment"
          role="group"
          aria-label={t('roster.swaps.status')}
        >
          <button
            type="button"
            className={filter === 'pending' ? 'active' : undefined}
            onClick={() => setFilter('pending')}
          >
            {t('roster.swaps.status.pending')}
          </button>
          <button
            type="button"
            className={filter === 'all' ? 'active' : undefined}
            onClick={() => setFilter('all')}
          >
            {t('roster.audit.all')}
          </button>
        </div>
      </div>

      {/* Explains the approval model: what queued means, and the two different
          consequences of approving (shift exchange vs. bid close). */}
      <div className="roster-page-intro" data-testid="swaps-intro">
        <strong>{t('roster.intro.label')}</strong>
        {t('roster.swaps.intro')}
      </div>

      {/* error / loading */}
      {loadError && (
        <div className="roster-error-banner" role="alert">
          <span>{loadError}</span>
          <button type="button" className="roster-btn" onClick={() => void loadData()}>
            {t('common.retry')}
          </button>
        </div>
      )}
      {actionError && (
        <div className="roster-error-banner" role="alert">
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="roster-skeleton" aria-label={t('common.loading')}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bar" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="roster-empty-hint">{t('roster.swaps.empty')}</div>
      ) : (
        <div className="roster-table-wrap">
          <table className="roster-table" data-testid="swaps-table">
            <thead>
              <tr>
                <th scope="col">{t('roster.swaps.status')}</th>
                <th scope="col">{t('roster.swaps.requester')}</th>
                <th scope="col">{t('roster.swaps.target')}</th>
                <th scope="col">{t('roster.swaps.reason')}</th>
                {filter === 'all' && (
                  <th scope="col">{t('roster.swaps.reviewedAt')}</th>
                )}
                {filter === 'all' && (
                  <th scope="col">{t('roster.swaps.notes')}</th>
                )}
                <th scope="col" className="roster-table-actions-col">
                  {t('roster.table.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const pending = s.status === 'pending'
                return (
                  <tr key={s.id} data-testid="swap-row" data-id={s.id}>
                    <td>
                      <div className="roster-badges">
                        {statusBadge(s.status)}
                        {s.is_open_bid && (
                          <span className="roster-badge" data-testid="swap-open-bid">
                            {t('roster.swaps.openBid')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>{empName(s.requester_employee_id)}</td>
                    <td>
                      {s.is_open_bid
                        ? `— (${t('roster.swaps.openBid')})`
                        : empName(s.target_employee_id) || '—'}
                    </td>
                    <td className="roster-table-prose">{s.reason || '—'}</td>
                    {filter === 'all' && (
                      <td className="roster-table-nowrap">
                        {s.reviewed_at ? fmtDateTime(s.reviewed_at) : '—'}
                      </td>
                    )}
                    {filter === 'all' && (
                      <td className="roster-table-prose">{s.review_notes || '—'}</td>
                    )}
                    <td>
                      {pending ? (
                        <div className="roster-table-row-actions">
                          <button
                            type="button"
                            className="roster-btn primary"
                            onClick={() => openReview(s, true)}
                          >
                            {t('roster.swaps.approve')}
                          </button>
                          <button
                            type="button"
                            className="roster-btn danger"
                            onClick={() => openReview(s, false)}
                          >
                            {t('roster.swaps.reject')}
                          </button>
                        </div>
                      ) : (
                        <span className="roster-sub">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* review dialog — one path for approve + reject, targeted + open bid */}
      {review && (
        <div
          className="roster-dialog-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setReview(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              review.approve ? t('roster.swaps.approve') : t('roster.swaps.reject')
            }
            className="roster-dialog"
          >
            <h3>
              {review.approve
                ? t('roster.swaps.approve')
                : t('roster.swaps.reject')}
            </h3>
            <div className="field">
              <label htmlFor="swaps-review-notes">{t('roster.swaps.notes')}</label>
              <textarea
                id="swaps-review-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {review.approve && <p className="hint">{t('roster.swaps.approveHint')}</p>}
            <div className="roster-dialog-actions">
              <button
                type="button"
                className="roster-btn"
                onClick={() => setReview(null)}
                disabled={busy}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="roster-btn primary"
                onClick={() => void confirmReview()}
                disabled={busy}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SwapsPage
