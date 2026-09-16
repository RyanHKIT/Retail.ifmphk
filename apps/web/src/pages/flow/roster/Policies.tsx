import { useCallback, useEffect, useState } from 'react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  fetchEmployees,
  fetchManagedBranchId,
  fetchPolicies,
  RosterError,
  upsertPolicy,
} from '@/lib/roster/api'
import type { EmployeeRow, HourPolicyRow } from '@/lib/roster/types'

/**
 * /flow/roster/policies — per-employee hour policies (Phase 2 Task 8).
 * One row per active employee showing policy values or registry defaults
 * (fix vs reference page: no-policy rows are marked "default", not "soft");
 * edit dialog prefills policy values, else registry defaults; validates
 * min <= max; saves via upsertPolicy (server handles onConflict employee_id).
 */
export function PoliciesPage() {
  const { profile } = useFlowAuth()
  const { t, locale } = useFlowLocale()
  const zh = locale === 'zh-HK'

  const [branchId, setBranchId] = useState<string | null>(null)
  /** False until fetchManagedBranchId resolves — distinguishes "resolving" from "no branch". */
  const [branchResolved, setBranchResolved] = useState(false)
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [policies, setPolicies] = useState<HourPolicyRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [editEmp, setEditEmp] = useState<EmployeeRow | null>(null)
  const [form, setForm] = useState({ min: 0, max: 0, hard: false })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const policyOf = useCallback(
    (employeeId: string) => policies.find((p) => p.employee_id === employeeId),
    [policies],
  )

  const nameOf = useCallback(
    (e: EmployeeRow) => (zh ? e.name_zh : e.name_en || e.name_zh),
    [zh],
  )

  /** Display values: policy overrides, else registry defaults. */
  const hoursOf = useCallback(
    (e: EmployeeRow) => {
      const p = policyOf(e.id)
      return {
        min: p ? p.min_hours_per_week : e.min_hours_per_week,
        max: p ? p.max_hours_per_week : e.max_hours_per_week,
        policy: p,
      }
    },
    [policyOf],
  )

  const load = useCallback(async () => {
    if (!branchId) return
    setLoading(true)
    setLoadError(null)
    try {
      const [emps, pols] = await Promise.all([
        fetchEmployees(branchId),
        fetchPolicies(branchId),
      ])
      setEmployees(emps)
      setPolicies(pols)
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
      try {
        const id = await fetchManagedBranchId(profile.id)
        if (!cancelled) {
          setBranchId(id)
          setBranchResolved(true)
        }
      } catch (err) {
        if (!cancelled) {
          setBranchResolved(true)
          setLoadError(
            err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile, t])

  useEffect(() => {
    void load()
  }, [load])

  function openEdit(e: EmployeeRow) {
    // Prefill policy values; fall back to the employee registry defaults.
    const p = policyOf(e.id)
    setForm({
      min: p ? p.min_hours_per_week : e.min_hours_per_week,
      max: p ? p.max_hours_per_week : e.max_hours_per_week,
      hard: p ? p.hard_block_overtime : false,
    })
    setFormError(null)
    setEditEmp(e)
  }

  function validate(min: number, max: number): string | null {
    if (min > max) return `${t('roster.policies.min')} > ${t('roster.policies.max')}`
    return null
  }

  const liveError = editEmp ? validate(form.min, form.max) : null
  const dialogError = formError ?? liveError

  async function handleSave() {
    if (!editEmp || saving) return
    const err = validate(form.min, form.max)
    if (err) {
      setFormError(err)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await upsertPolicy({
        employee_id: editEmp.id,
        min_hours_per_week: form.min,
        max_hours_per_week: form.max,
        hard_block_overtime: form.hard,
      })
      setEditEmp(null)
      await load()
    } catch (err) {
      setFormError(
        err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'),
      )
    } finally {
      setSaving(false)
    }
  }

  if (branchId === null && branchResolved && profile && !loading && !loadError) {
    return (
      <div className="roster-board">
        <div className="roster-error-banner">
          <span>{t('roster.error.FORBIDDEN')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="roster-board">
      <div className="roster-toolbar">
        <div className="roster-title">
          <h2>{t('roster.policies.title')}</h2>
        </div>
      </div>

      {loadError && (
        <div className="roster-error-banner" role="alert">
          <span>{loadError}</span>
          <button type="button" className="roster-btn" onClick={() => void load()}>
            {t('common.retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="roster-skeleton" aria-label={t('common.loading')}>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bar" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <p className="roster-empty-hint" data-testid="policy-empty">
          {t('roster.policies.empty')}
        </p>
      ) : (
        <div className="roster-grid-scroll">
          <table className="roster-grid" data-testid="policy-table">
            <thead>
              <tr>
                <th>{t('roster.policies.employee')}</th>
                <th>{t('roster.policies.min')}</th>
                <th>{t('roster.policies.max')}</th>
                <th>{t('roster.policies.hardBlock')}</th>
                <th>{t('roster.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const { min, max, policy } = hoursOf(e)
                return (
                  <tr key={e.id} data-testid="policy-row" data-employee={e.id}>
                    <td>
                      {nameOf(e)}
                      <span className="roster-row-sub">{e.station}</span>
                    </td>
                    <td>{t('roster.cellHours').replace('{{hours}}', String(min))}</td>
                    <td>{t('roster.cellHours').replace('{{hours}}', String(max))}</td>
                    <td>
                      {policy ? (
                        policy.hard_block_overtime ? (
                          <span
                            className="roster-badge conflict-hard"
                            data-testid="policy-rule-hard"
                          >
                            {t('roster.policies.hardBlock')}
                          </span>
                        ) : (
                          <span
                            className="roster-badge conflict-soft"
                            data-testid="policy-rule-soft"
                          >
                            {t('roster.conflict.overtime')}
                          </span>
                        )
                      ) : (
                        <span className="roster-badge" data-testid="policy-default">
                          {t('roster.policies.empty')}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="roster-btn"
                        data-testid={`policy-edit-${e.id}`}
                        aria-label={`${t('roster.actions')} · ${nameOf(e)}`}
                        onClick={() => openEdit(e)}
                      >
                        ✎
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editEmp && (
        <div className="roster-dialog-backdrop">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={nameOf(editEmp)}
            className="roster-dialog"
          >
            <h3>
              {t('roster.policies.title')} · {nameOf(editEmp)}
            </h3>

            <div className="field">
              <label htmlFor="policy-min">{t('roster.policies.min')}</label>
              <input
                id="policy-min"
                type="number"
                min={0}
                max={168}
                value={form.min}
                onChange={(e) =>
                  setForm((f) => ({ ...f, min: Number(e.target.value) }))
                }
              />
            </div>

            <div className="field">
              <label htmlFor="policy-max">{t('roster.policies.max')}</label>
              <input
                id="policy-max"
                type="number"
                min={0}
                max={168}
                value={form.max}
                onChange={(e) =>
                  setForm((f) => ({ ...f, max: Number(e.target.value) }))
                }
              />
            </div>

            <div className="field">
              <label className="roster-policy-checkbox" htmlFor="policy-hard">
                <input
                  id="policy-hard"
                  type="checkbox"
                  checked={form.hard}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hard: e.target.checked }))
                  }
                />
                <span>{t('roster.policies.hardBlock')}</span>
              </label>
              <span className="hint">{t('roster.policies.hardBlockHint')}</span>
            </div>

            {dialogError && (
              <p className="roster-policy-form-error" role="alert" data-testid="policy-error">
                {dialogError}
              </p>
            )}

            <div className="roster-dialog-actions">
              <button
                type="button"
                className="roster-btn"
                onClick={() => setEditEmp(null)}
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="roster-btn primary"
                disabled={saving || !!validate(form.min, form.max)}
                onClick={() => void handleSave()}
              >
                {saving ? t('roster.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PoliciesPage
