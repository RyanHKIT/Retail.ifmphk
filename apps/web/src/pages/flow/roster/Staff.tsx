// Task 6: staff registry (plan docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md).
// Port of _reference/hk-roster-planner EmployeesPage behaviour: searchable
// table, create/edit dialog, soft delete (deactivate) behind confirm.
// Fixes over the reference: min ≤ max validation (MeDo gap fix), no custom
// stations (fixed 3), no hardcoded zh strings (all copy via useFlowLocale t).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  createEmployee,
  deactivateEmployee,
  fetchEmployees,
  fetchManagedBranchId,
  updateEmployee,
  RosterError,
  type NewEmployee,
} from '@/lib/roster/api'
import type { EmployeeRow, Station } from '@/lib/roster/types'

const STATIONS: Station[] = ['樓面', '試衣', '收銀']

interface StaffForm {
  name_zh: string
  name_en: string
  phone: string
  station: Station
  employment_type: 'full_time' | 'part_time'
  min_hours_per_week: number
  max_hours_per_week: number
}

const EMPTY_FORM: StaffForm = {
  name_zh: '',
  name_en: '',
  phone: '',
  station: '樓面',
  employment_type: 'full_time',
  min_hours_per_week: 0,
  max_hours_per_week: 48,
}

export function StaffPage() {
  const { profile } = useFlowAuth()
  const { t } = useFlowLocale()

  // data state
  const [branchId, setBranchId] = useState<string | null>(null)
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ui state
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [form, setForm] = useState<StaffForm>({ ...EMPTY_FORM })
  const [deactivateTarget, setDeactivateTarget] = useState<EmployeeRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // ---- data loading ----
  const load = useCallback(
    async (targetBranch: string) => {
      setLoading(true)
      setLoadError(null)
      try {
        setEmployees(await fetchEmployees(targetBranch))
      } catch (err) {
        setLoadError(
          err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
        )
      } finally {
        setLoading(false)
      }
    },
    [t],
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

  useEffect(() => {
    if (branchId) void load(branchId)
  }, [branchId, load])

  // ---- derived ----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(
      (e) =>
        e.name_zh.toLowerCase().includes(q) ||
        e.name_en.toLowerCase().includes(q),
    )
  }, [employees, search])

  // ---- dialog ----
  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setDialogOpen(true)
  }

  function openEdit(emp: EmployeeRow) {
    setEditing(emp)
    setForm({
      name_zh: emp.name_zh,
      name_en: emp.name_en,
      phone: emp.phone ?? '',
      station: emp.station,
      employment_type: emp.employment_type,
      min_hours_per_week: emp.min_hours_per_week,
      max_hours_per_week: emp.max_hours_per_week,
    })
    setDialogOpen(true)
  }

  // min ≤ max validation (MeDo gap fix): bilingual error blocks submit
  const hoursInvalid = form.min_hours_per_week > form.max_hours_per_week
  const hoursErrorText = hoursInvalid
    ? `${t('roster.staff.minHours')} ≤ ${t('roster.staff.maxHours')}`
    : null

  async function handleSave() {
    if (!branchId || busy) return
    if (!form.name_zh.trim() || hoursInvalid) return
    setBusy(true)
    setActionError(null)
    try {
      const input: NewEmployee = {
        name_zh: form.name_zh.trim(),
        name_en: form.name_en.trim(),
        phone: form.phone.trim(),
        station: form.station,
        employment_type: form.employment_type,
        min_hours_per_week: form.min_hours_per_week,
        max_hours_per_week: form.max_hours_per_week,
      }
      if (editing) await updateEmployee(editing.id, input)
      else await createEmployee(branchId, input)
      setDialogOpen(false)
      await load(branchId)
    } catch (err) {
      setActionError(
        err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivateTarget || !branchId || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await deactivateEmployee(deactivateTarget.id)
      setDeactivateTarget(null)
      await load(branchId)
    } catch (err) {
      setActionError(
        err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="roster-board">
      {/* toolbar */}
      <div className="roster-toolbar">
        <div className="roster-title">
          <h2>{t('roster.staff.title')}</h2>
        </div>
        <input
          type="text"
          data-testid="staff-search"
          aria-label={t('roster.staff.nameZh')}
          placeholder={t('roster.addDialog.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="roster-search"
        />
        <button type="button" className="roster-btn primary" data-testid="staff-add" onClick={openCreate}>
          {t('roster.staff.add')}
        </button>
      </div>

      {/* error / loading */}
      {loadError && (
        <div className="roster-error-banner" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            className="roster-btn"
            onClick={() => branchId && void load(branchId)}
          >
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
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bar" />
          ))}
        </div>
      ) : (
        <div className="roster-grid-scroll">
          {filtered.length === 0 ? (
            <p className="roster-sub" data-testid="staff-empty">
              {t('roster.staff.empty')}
            </p>
          ) : (
            <table className="roster-grid" data-testid="staff-table">
              <thead>
                <tr>
                  <th>{t('roster.staff.nameZh')}</th>
                  <th>{t('roster.staff.nameEn')}</th>
                  <th>{t('roster.staff.phone')}</th>
                  <th>{t('roster.station')}</th>
                  <th>{t('roster.staff.type')}</th>
                  <th>
                    {t('roster.staff.minHours')}–{t('roster.staff.maxHours')}
                  </th>
                  <th>{t('roster.status')}</th>
                  <th>{t('roster.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} data-testid={`staff-row-${emp.id}`}>
                    <td>{emp.name_zh}</td>
                    <td>{emp.name_en}</td>
                    <td>{emp.phone || '—'}</td>
                    <td>{emp.station}</td>
                    <td>{t(`roster.staff.type.${emp.employment_type}`)}</td>
                    <td>
                      {emp.min_hours_per_week}–{emp.max_hours_per_week}h
                    </td>
                    <td>
                      {emp.is_active ? t('roster.staff.active') : t('roster.staff.inactive')}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="roster-icon-btn"
                        onClick={() => openEdit(emp)}
                      >
                        {t('roster.actions')}
                      </button>
                      {emp.is_active && (
                        <button
                          type="button"
                          className="roster-icon-btn"
                          data-testid="staff-deactivate"
                          onClick={() => setDeactivateTarget(emp)}
                        >
                          {t('roster.staff.inactive')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* create / edit dialog */}
      {dialogOpen && (
        <div
          className="roster-dialog-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDialogOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={editing ? t('roster.staff.title') : t('roster.staff.add')}
            className="roster-dialog"
          >
            <h3>{editing ? t('roster.staff.title') : t('roster.staff.add')}</h3>

            <div className="field">
              <label htmlFor="staff-name-zh">{t('roster.staff.nameZh')}</label>
              <input
                id="staff-name-zh"
                type="text"
                value={form.name_zh}
                onChange={(e) => setForm((f) => ({ ...f, name_zh: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="staff-name-en">{t('roster.staff.nameEn')}</label>
              <input
                id="staff-name-en"
                type="text"
                value={form.name_en}
                onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="staff-phone">{t('roster.staff.phone')}</label>
              <input
                id="staff-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="staff-station">{t('roster.station')}</label>
              <select
                id="staff-station"
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
              <label htmlFor="staff-type">{t('roster.staff.type')}</label>
              <select
                id="staff-type"
                value={form.employment_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    employment_type: e.target.value as 'full_time' | 'part_time',
                  }))
                }
              >
                <option value="full_time">{t('roster.staff.type.full_time')}</option>
                <option value="part_time">{t('roster.staff.type.part_time')}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="staff-min-hours">{t('roster.staff.minHours')}</label>
              <input
                id="staff-min-hours"
                type="number"
                min={0}
                max={168}
                value={form.min_hours_per_week}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min_hours_per_week: Number(e.target.value) }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="staff-max-hours">{t('roster.staff.maxHours')}</label>
              <input
                id="staff-max-hours"
                type="number"
                min={0}
                max={168}
                value={form.max_hours_per_week}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max_hours_per_week: Number(e.target.value) }))
                }
              />
              {hoursErrorText && (
                <p className="hint" role="alert" data-testid="staff-hours-error" style={{ color: 'var(--flow-danger)' }}>
                  {hoursErrorText}
                </p>
              )}
            </div>

            <div className="roster-dialog-actions">
              <button
                type="button"
                className="roster-btn"
                onClick={() => setDialogOpen(false)}
                disabled={busy}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="roster-btn primary"
                onClick={() => void handleSave()}
                disabled={busy || !form.name_zh.trim() || hoursInvalid}
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* deactivate (soft delete) confirm */}
      {deactivateTarget && (
        <div
          className="roster-dialog-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setDeactivateTarget(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('roster.staff.deactivateConfirm')}
            className="roster-dialog"
          >
            <h3>{t('roster.staff.deactivateConfirm')}</h3>
            <p className="hint" style={{ fontSize: 13 }}>
              {deactivateTarget.name_zh}
            </p>
            <div className="roster-dialog-actions">
              <button
                type="button"
                className="roster-btn"
                onClick={() => setDeactivateTarget(null)}
                disabled={busy}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="roster-btn danger"
                data-testid="staff-deactivate-confirm"
                onClick={() => void handleDeactivate()}
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

export default StaffPage
