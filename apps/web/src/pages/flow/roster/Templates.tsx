// /flow/roster/templates — shift template CRUD (Phase 2 Task 7).
// Port of _reference ShiftTemplatesPage behaviour with fixes: no hardcoded zh
// copy (all strings via existing i18n keys), soft-delete via deleteTemplate,
// server truth reloaded after every mutation, active-only list, 9-colour
// palette + free picker, duration preview with +1d marker for overnight
// shifts (end <= start ⇒ +24h).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  createTemplate,
  deleteTemplate,
  fetchManagedBranchId,
  fetchTemplates,
  RosterError,
  updateTemplate,
  type NewTemplate,
} from '@/lib/roster/api'
import type { ShiftTemplateRow, Station } from '@/lib/roster/types'

const STATIONS: Station[] = ['樓面', '試衣', '收銀']

const PALETTE = [
  '#B45309',
  '#2f81f7',
  '#1a7f37',
  '#9a6700',
  '#8250df',
  '#cf222e',
  '#0550ae',
  '#116329',
  '#702459',
]

const EMPTY_FORM = {
  name: '',
  start_time: '09:00',
  end_time: '17:00',
  station: '樓面' as Station,
  headcount_target: 1,
  color: PALETTE[0],
}

interface TemplateForm {
  name: string
  start_time: string
  end_time: string
  station: Station
  headcount_target: number
  color: string
}

/** "HH:MM[:SS]" → minutes since midnight. */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Duration preview: end − start, +24h when end <= start (overnight). */
function durationHours(start: string, end: string): number {
  let mins = toMinutes(end) - toMinutes(start)
  if (mins <= 0) mins += 24 * 60
  return Math.round((mins / 60) * 100) / 100
}

function fmtHours(start: string, end: string): string {
  const h = durationHours(start, end)
  return Number.isInteger(h) ? `${h}h` : `${h}h`
}

export function TemplatesPage() {
  const { profile } = useFlowAuth()
  const { t } = useFlowLocale()

  const [branchId, setBranchId] = useState<string | null>(null)
  /** False until fetchManagedBranchId resolves — distinguishes "resolving" from "no branch". */
  const [branchResolved, setBranchResolved] = useState(false)
  const [templates, setTemplates] = useState<ShiftTemplateRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ShiftTemplateRow | null>(null)
  const [form, setForm] = useState<TemplateForm>({ ...EMPTY_FORM })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ShiftTemplateRow | null>(null)

  // ---- data loading ----
  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const rows = await fetchTemplates(branchId as string)
      setTemplates(rows)
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
      if (!cancelled) {
        setBranchId(id)
        setBranchResolved(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile])

  useEffect(() => {
    if (branchId) void load()
  }, [branchId, load])

  // ---- derived ----
  const activeTemplates = useMemo(
    () => templates.filter((x) => x.is_active),
    [templates],
  )

  // ---- dialog plumbing ----
  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setActionError(null)
    setDialogOpen(true)
  }

  function openEdit(row: ShiftTemplateRow) {
    setEditing(row)
    setForm({
      name: row.name,
      start_time: row.start_time.slice(0, 5),
      end_time: row.end_time.slice(0, 5),
      station: row.station,
      headcount_target: row.headcount_target,
      color: row.color,
    })
    setActionError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!branchId || busy) return
    if (!form.name.trim()) {
      setActionError(t('roster.templates.name') + ' — ' + t('common.error'))
      return
    }
    const payload: NewTemplate = {
      name: form.name.trim(),
      start_time: form.start_time,
      end_time: form.end_time,
      station: form.station,
      color: form.color,
      headcount_target: Math.max(1, Math.floor(form.headcount_target) || 1),
    }
    setBusy(true)
    setActionError(null)
    try {
      if (editing) await updateTemplate(editing.id, payload)
      else await createTemplate(branchId, payload)
      setDialogOpen(false)
      await load()
    } catch (err) {
      setActionError(
        err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await deleteTemplate(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setActionError(
        err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
      )
      setDeleteTarget(null)
    } finally {
      setBusy(false)
    }
  }

  if (branchId === null && branchResolved && profile) {
    return (
      <div className="roster-board">
        <div className="roster-error-banner">
          <span>{t('roster.error.FORBIDDEN')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="roster-board" data-testid="templates-page">
      {/* toolbar */}
      <div className="roster-toolbar">
        <div className="roster-title">
          <h2>{t('roster.templates.title')}</h2>
        </div>
        <button
          type="button"
          className="roster-btn primary"
          onClick={openCreate}
          disabled={loading}
        >
          {t('roster.templates.add')}
        </button>
        <button
          type="button"
          className="roster-icon-btn"
          onClick={() => void load()}
          disabled={loading}
        >
          {t('roster.refresh')}
        </button>
      </div>

      {/* error / loading */}
      {loadError && (
        <div className="roster-error-banner" role="alert">
          <span>{loadError}</span>
          <button type="button" className="roster-btn" onClick={() => void load()}>
            {t('common.retry')}
          </button>
        </div>
      )}
      {actionError && !dialogOpen && (
        <div className="roster-error-banner" role="alert">
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="roster-skeleton" aria-label={t('common.loading')}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bar" />
          ))}
        </div>
      ) : activeTemplates.length === 0 ? (
        <div className="roster-empty-hint" data-testid="templates-empty">
          {t('roster.templates.empty')}
        </div>
      ) : (
        <div className="roster-templates-grid" data-testid="templates-list">
          {activeTemplates.map((row) => {
            const overnight = toMinutes(row.end_time) <= toMinutes(row.start_time)
            return (
              <div
                key={row.id}
                className="roster-template-card"
                data-testid="template-card"
                data-id={row.id}
              >
                <div className="roster-template-head">
                  <span
                    className="swatch"
                    style={{ background: `${row.color}55`, borderColor: row.color }}
                  />
                  <span className="roster-template-name">{row.name}</span>
                  <span className="roster-template-actions">
                    <button
                      type="button"
                      className="roster-icon-btn"
                      onClick={() => openEdit(row)}
                      aria-label={t('roster.audit.action.update')}
                    >
                      {t('roster.audit.action.update')}
                    </button>
                    <button
                      type="button"
                      className="roster-btn danger"
                      onClick={() => setDeleteTarget(row)}
                      aria-label={t('common.delete')}
                    >
                      {t('common.delete')}
                    </button>
                  </span>
                </div>
                <div className="roster-template-meta">
                  <span>
                    {row.start_time.slice(0, 5)}–{row.end_time.slice(0, 5)}
                  </span>
                  <span className="roster-badge">{fmtHours(row.start_time, row.end_time)}</span>
                  {overnight && <span className="roster-badge">+1d</span>}
                </div>
                <div className="roster-template-meta muted">
                  <span>{t('roster.station')}: {row.station}</span>
                  <span>
                    {t('roster.templates.headcount')}: {row.headcount_target}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* create / edit dialog */}
      {dialogOpen && (
        <div className="roster-dialog-backdrop">
          <div role="dialog" aria-modal="true" className="roster-dialog">
            <h3>{editing ? t('roster.audit.action.update') : t('roster.templates.add')}</h3>
            <div className="field">
              <label htmlFor="tpl-name">{t('roster.templates.name')}</label>
              <input
                id="tpl-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="roster-template-times">
              <div className="field">
                <label htmlFor="tpl-start">{t('roster.templates.time')}</label>
                <input
                  id="tpl-start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="tpl-end">{t('roster.templates.time')}</label>
                <input
                  id="tpl-end"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                />
              </div>
              <span className="hint">{fmtHours(form.start_time, form.end_time)}</span>
            </div>
            <div className="field">
              <label htmlFor="tpl-station">{t('roster.station')}</label>
              <select
                id="tpl-station"
                value={form.station}
                onChange={(e) =>
                  setForm((f) => ({ ...f, station: e.target.value as Station }))
                }
              >
                {STATIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tpl-headcount">{t('roster.templates.headcount')}</label>
              <input
                id="tpl-headcount"
                type="number"
                min={1}
                value={form.headcount_target}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headcount_target: Number(e.target.value) }))
                }
              />
            </div>
            <div className="field">
              <label>{t('roster.templates.color')}</label>
              <div className="roster-palette">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    name={c}
                    aria-label={c}
                    title={c}
                    aria-pressed={form.color.toLowerCase() === c.toLowerCase()}
                    className="roster-palette-swatch"
                    style={{ background: c }}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                  />
                ))}
                <input
                  type="color"
                  aria-label={t('roster.templates.color')}
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
              </div>
            </div>
            {actionError && (
              <div className="warn-list" role="alert">
                {actionError}
              </div>
            )}
            <div className="roster-dialog-actions">
              <button
                type="button"
                className="roster-btn"
                onClick={() => setDialogOpen(false)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="roster-btn primary"
                onClick={() => void handleSave()}
                disabled={busy}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* delete confirm (soft delete) */}
      {deleteTarget && (
        <div className="roster-dialog-backdrop">
          <div role="dialog" aria-modal="true" className="roster-dialog">
            <h3>{t('common.delete')}</h3>
            <p>{t('roster.templates.deleteConfirm')}</p>
            <div className="roster-dialog-actions">
              <button
                type="button"
                className="roster-btn"
                onClick={() => setDeleteTarget(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="roster-btn danger"
                onClick={() => void handleDelete()}
                disabled={busy}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TemplatesPage
