import { useFlowLocale } from '@/context/FlowLocaleContext'
import { effectiveLimits, type Conflict } from '@/lib/roster/conflicts'
import type {
  AssignmentRow,
  EmployeeRow,
  HourPolicyRow,
  ShiftTemplateRow,
  Station,
} from '@/lib/roster/types'

export type HourState = 'ok' | 'under' | 'warn' | 'exceeded' | 'hard'

/** 4 display states (spec §5): ok / under min / ≥90% max warn / exceeded (+hard tint). */
export function hourState(
  hours: number,
  min: number,
  max: number,
  hardBlock: boolean,
): HourState {
  if (hours > max) return hardBlock ? 'hard' : 'exceeded'
  if (max > 0 && hours >= max * 0.9) return 'warn'
  if (hours < min) return 'under'
  return 'ok'
}

export function weeklyHours(
  employeeId: string,
  assignments: AssignmentRow[],
  templates: ShiftTemplateRow[],
): number {
  const byId = new Map(templates.map((t) => [t.id, t]))
  let total = 0
  for (const a of assignments) {
    if (a.employee_id !== employeeId) continue
    const t = byId.get(a.shift_template_id)
    if (!t) continue
    const s = toMin(t.start_time)
    const e = toMin(t.end_time)
    const endEff = e <= s ? e + 1440 : e
    total += (endEff - s) / 60
  }
  return total
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Per-employee weekly hours bar (MeDo HourBar parity, dark ops tokens). */
export function HourSidebar({
  employees,
  assignments,
  templates,
  policies,
  conflicts,
}: {
  employees: EmployeeRow[]
  assignments: AssignmentRow[]
  templates: ShiftTemplateRow[]
  policies: HourPolicyRow[]
  conflicts: Conflict[]
}) {
  const { t, locale } = useFlowLocale()
  const policyByEmp = new Map(policies.map((p) => [p.employee_id, p]))
  const hardEmp = new Set(
    conflicts.filter((c) => c.severity === 'hard' && c.kind !== 'double_booking').map((c) => c.employeeId),
  )

  return (
    <aside className="roster-hours" aria-label={t('roster.hours')}>
      <h3>{t('roster.hours')}</h3>
      <div className="roster-hours-body">
        {employees.map((e) => {
          const hours = weeklyHours(e.id, assignments, templates)
          const lim = effectiveLimits(e, policyByEmp.get(e.id))
          const state = hourState(hours, lim.min, lim.max, lim.hardBlock)
          const pct = lim.max > 0 ? Math.min((hours / lim.max) * 100, 100) : 0
          const name = locale === 'zh-HK' ? e.name_zh : e.name_en || e.name_zh
          return (
            <div
              key={e.id}
              className={`roster-hour-row ${state}${hardEmp.has(e.id) ? ' hard' : ''}`}
              title={`${name} — ${t(`roster.hours.${state}`)} (min ${lim.min} / max ${lim.max})`}
            >
              <span className="hour-name">{name}</span>
              <span className="hour-track">
                <span className="hour-fill" style={{ width: `${pct}%` }} />
              </span>
              <span className="hour-value">{hours.toFixed(1)}</span>
            </div>
          )
        })}
        {employees.length === 0 && (
          <div className="hour-name">{t('roster.noEmployees')}</div>
        )}
      </div>
    </aside>
  )
}

export type { Station }
