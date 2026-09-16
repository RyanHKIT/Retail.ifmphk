import { useMemo, useState } from 'react'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import type { EmployeeRow, ShiftTemplateRow, Station } from '@/lib/roster/types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${pad(m)}-${pad(d)}`
}

/**
 * Per-cell add dialog: multi-employee batch select (search, select-all,
 * per-station quick-select) + template picker filtered to the row station.
 */
export function CellDialog({
  date,
  station,
  employees,
  templates,
  busy,
  onCancel,
  onConfirm,
}: {
  date: string
  station?: Station
  employees: EmployeeRow[]
  templates: ShiftTemplateRow[]
  busy: boolean
  onCancel: () => void
  onConfirm: (rows: { employeeId: string; templateId: string; notes: string }[]) => void
}) {
  const { t, locale } = useFlowLocale()
  const [selected, setSelected] = useState<string[]>([])
  const [templateId, setTemplateId] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')

  const nameOf = (e: EmployeeRow) =>
    locale === 'zh-HK' ? e.name_zh : e.name_en || e.name_zh

  const availableTemplates = useMemo(
    () => templates.filter((x) => (station ? x.station === station : true)),
    [templates, station],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (e) =>
        e.name_zh.toLowerCase().includes(q) ||
        (e.name_en || '').toLowerCase().includes(q) ||
        e.station.toLowerCase().includes(q),
    )
  }, [employees, search])

  const stationList = useMemo(
    () => Array.from(new Set(employees.map((e) => e.station))),
    [employees],
  )

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selected.includes(e.id))

  function toggle(ids: string[]) {
    setSelected((prev) => {
      const allIn = ids.every((id) => prev.includes(id))
      return allIn ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    })
  }

  const canSubmit = selected.length > 0 && templateId !== '' && !busy

  return (
    <div
      className="roster-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('roster.addDialog.title').replace('{{date}}', fmtDate(date))}
        className="roster-dialog"
      >
        <h3>
          {t('roster.addDialog.title').replace(
            '{{date}}',
            date,
          )}
          {station ? ` · ${station}` : ''}
        </h3>

        <div className="field">
          <label htmlFor="cell-dialog-template">{t('roster.addDialog.template')}</label>
          <select
            id="cell-dialog-template"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">—</option>
            {availableTemplates.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} · {x.start_time.slice(0, 5)}–{x.end_time.slice(0, 5)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{t('roster.addDialog.employees')}</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('roster.addDialog.search')}
          />
          <div className="quick-row">
            <button type="button" onClick={() => toggle(filtered.map((e) => e.id))}>
              {allFilteredSelected
                ? t('roster.addDialog.deselectAll')
                : t('roster.addDialog.selectAll')}
            </button>
            {stationList.length > 1 && <span className="sep">|</span>}
            {stationList.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() =>
                  toggle(employees.filter((e) => e.station === st).map((e) => e.id))
                }
              >
                {st}
              </button>
            ))}
            {selected.length > 0 && (
              <span className="sep">· {t('roster.addDialog.selected').replace('{{count}}', String(selected.length))}</span>
            )}
          </div>
          <div className="roster-emp-list">
            {filtered.length === 0 && (
              <label>{t('roster.addDialog.noMatch')}</label>
            )}
            {filtered.map((e) => {
              const checked = selected.includes(e.id)
              return (
                <label key={e.id} className={checked ? 'checked' : undefined}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle([e.id])}
                    aria-label={nameOf(e)}
                  />
                  <span>{nameOf(e)}</span>
                  <span className="emp-station">{e.station}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="field">
          <label htmlFor="cell-dialog-notes">{t('roster.addDialog.notes')}</label>
          <textarea
            id="cell-dialog-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {!canSubmit && !busy && (
          <p className="roster-empty-hint">{t('roster.addDialog.empty')}</p>
        )}

        <div className="roster-dialog-actions">
          <button type="button" className="roster-btn" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="roster-btn primary"
            disabled={!canSubmit}
            onClick={() =>
              onConfirm(
                selected.map((employeeId) => ({ employeeId, templateId, notes })),
              )
            }
          >
            {busy
              ? t('roster.addDialog.adding')
              : t('roster.addDialog.confirm').replace(
                  '{{count}}',
                  String(selected.length),
                )}
          </button>
        </div>
      </div>
    </div>
  )
}
