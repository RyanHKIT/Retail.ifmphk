import { useState } from 'react'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import type { AssignmentRow } from '@/lib/roster/types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${pad(m)}-${pad(d)}`
}

/** Confirm dialog for delete + the copy-day picker (within current week only). */
export function DeleteConfirmDialog({
  label,
  busy,
  onCancel,
  onConfirm,
}: {
  label: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useFlowLocale()
  return (
    <div
      className="roster-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={t('roster.deleteDialog.title')} className="roster-dialog">
        <h3>{t('roster.deleteDialog.title')}</h3>
        <p className="hint" style={{ fontSize: 13 }}>
          {label}
        </p>
        <p className="hint">{t('roster.deleteDialog.undoHint')}</p>
        <div className="roster-dialog-actions">
          <button type="button" className="roster-btn" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className="roster-btn danger" onClick={onConfirm} disabled={busy}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Copy-day dialog: duplicate one date's assignments onto another date in the same week. */
export function CopyDayDialog({
  fromDate,
  weekDates,
  busy,
  onCancel,
  onConfirm,
}: {
  fromDate: string
  weekDates: string[]
  busy: boolean
  onCancel: () => void
  onConfirm: (toDate: string) => void
}) {
  const { t } = useFlowLocale()
  const [toDate, setToDate] = useState('')
  const canConfirm = toDate !== '' && toDate !== fromDate && !busy
  return (
    <div
      className="roster-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={t('roster.copyDay.title')} className="roster-dialog">
        <h3>{t('roster.copyDay.title').replace('{{date}}', fromDate)}</h3>
        <div className="field">
          <label htmlFor="copy-day-to">{t('roster.copyDay.to')}</label>
          <select
            id="copy-day-to"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          >
            <option value="">—</option>
            {weekDates
              .filter((d) => d !== fromDate)
              .map((d) => (
                <option key={d} value={d}>
                  {fmtDate(d)}
                </option>
              ))}
          </select>
          <p className="hint">
            {t('roster.copyDay.range')
              .replace('{{from}}', fmtDate(weekDates[0]))
              .replace('{{to}}', fmtDate(weekDates[6]))}
          </p>
        </div>
        <div className="roster-dialog-actions">
          <button type="button" className="roster-btn" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="roster-btn primary"
            disabled={!canConfirm}
            onClick={() => onConfirm(toDate)}
          >
            {t('roster.copyDay.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Copy-week dialog: review source-week shift count before RPC copy. */
export function CopyWeekDialog({
  sourceWeekStart,
  sourceCount,
  busy,
  onCancel,
  onConfirm,
}: {
  sourceWeekStart: string
  sourceCount: number
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useFlowLocale()
  return (
    <div
      className="roster-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={t('roster.copyDialog.title')} className="roster-dialog">
        <h3>{t('roster.copyDialog.title')}</h3>
        <p className="hint" style={{ fontSize: 13 }}>
          {t('roster.copyDialog.source')}: {sourceWeekStart}
        </p>
        {sourceCount === 0 ? (
          <p className="hint">{t('roster.copyDialog.none')}</p>
        ) : (
          <p className="hint">
            {t('roster.copyDialog.confirm').replace('{{count}}', String(sourceCount))}
          </p>
        )}
        <div className="roster-dialog-actions">
          <button type="button" className="roster-btn" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="roster-btn primary"
            disabled={busy || sourceCount === 0}
            onClick={onConfirm}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Publish flow confirm: plain confirm, or soft-warning list when soft conflicts exist. */
export function PublishConfirmDialog({
  softList,
  busy,
  onCancel,
  onConfirm,
}: {
  softList: string[] | null // null → clean week, plain confirm
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const { t } = useFlowLocale()
  return (
    <div
      className="roster-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div role="dialog" aria-modal="true" aria-label={t('roster.publish')} className="roster-dialog">
        <h3>
          {softList === null
            ? t('roster.publishConfirm')
            : t('roster.publishSoftTitle')}
        </h3>
        {softList !== null && softList.length > 0 && (
          <div className="warn-list">{softList.join('\n')}</div>
        )}
        {softList !== null && softList.length === 0 && (
          <p className="hint">{t('roster.publishSoftConfirm')}</p>
        )}
        <div className="roster-dialog-actions">
          <button type="button" className="roster-btn" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className="roster-btn primary" onClick={onConfirm} disabled={busy}>
            {softList === null ? t('roster.publish') : t('roster.publishSoftKeep')}
          </button>
        </div>
      </div>
    </div>
  )
}

export type AssignmentLike = AssignmentRow
