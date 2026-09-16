import { useFlowLocale } from '@/context/FlowLocaleContext'
import type {
  AssignmentRow,
  EmployeeRow,
  ShiftTemplateRow,
  Station,
} from '@/lib/roster/types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${pad(m)}-${pad(d)}`
}

/**
 * Week grid: 7 Mon-start columns; rows grouped by station (default) or employee.
 * Chips carry template colors; cell counter shows x/target (amber when under);
 * draft-only editing controls (add / remove) hidden when published.
 */
export function BoardGrid({
  weekDates,
  groupBy,
  stations,
  employees,
  templates,
  assignments,
  isDraft,
  onAdd,
  onRemove,
  onCopyDay,
}: {
  weekDates: string[]
  groupBy: 'station' | 'employee'
  stations: Station[]
  employees: EmployeeRow[]
  templates: ShiftTemplateRow[]
  assignments: AssignmentRow[]
  isDraft: boolean
  onAdd: (date: string, station?: Station) => void
  onRemove: (assignment: AssignmentRow) => void
  onCopyDay?: (fromDate: string) => void
}) {
  const { t, locale } = useFlowLocale()
  const tmplById = new Map(templates.map((x) => [x.id, x]))
  const empById = new Map(employees.map((e) => [e.id, e]))

  const rowKeys: string[] = groupBy === 'station' ? stations : employees.map((e) => e.id)

  const nameOf = (e: EmployeeRow | undefined) =>
    e ? (locale === 'zh-HK' ? e.name_zh : e.name_en || e.name_zh) : ''

  const rowLabel = (key: string) =>
    groupBy === 'station' ? key : nameOf(empById.get(key))

  const rowSublabel = (key: string) => {
    if (groupBy === 'station') {
      return templates
        .filter((x) => x.station === key)
        .map((x) => x.name)
        .join(' · ')
    }
    const e = empById.get(key)
    return e ? `${e.station} · ${t(`roster.staff.type.${e.employment_type}`)}` : ''
  }

  function cellAssignments(rowKey: string, date: string): AssignmentRow[] {
    return assignments.filter((a) => {
      if (a.work_date !== date) return false
      if (groupBy === 'employee') return a.employee_id === rowKey
      return tmplById.get(a.shift_template_id)?.station === rowKey
    })
  }

  /** Headcount target per station-cell = Σ headcount_target of that station's templates. */
  function targetOf(rowKey: string): number {
    if (groupBy !== 'station') return 0
    return templates
      .filter((x) => x.station === rowKey)
      .reduce((s, x) => s + x.headcount_target, 0)
  }

  return (
    <table className="roster-grid">
      <thead>
        <tr>
          <th style={{ width: 120 }}>
            {groupBy === 'station' ? t('roster.station') : t('roster.employee')}
          </th>
          {weekDates.map((d, i) => (
            <th key={d} data-testid="board-day-col">
              <div className="roster-day-label">{t(`roster.weekday.${i}`)}</div>
              <div className="roster-day-date">{fmtDate(d)}</div>
              {isDraft && onCopyDay && (
                <button
                  type="button"
                  className="roster-cell-add"
                  onClick={() => onCopyDay(d)}
                  title={t('roster.copyDay.title').replace('{{date}}', fmtDate(d))}
                >
                  ⇄ {t('roster.copyDay')}
                </button>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowKeys.map((key) => {
          const weekCount = assignments.filter((a) =>
            groupBy === 'employee'
              ? a.employee_id === key
              : tmplById.get(a.shift_template_id)?.station === key,
          ).length
          return (
            <tr key={key}>
              <th scope="row">
                {rowLabel(key)}
                <span className="roster-row-sub">
                  {rowSublabel(key)}
                  {weekCount > 0 ? ` · ${t('roster.rowTotal').replace('{{count}}', String(weekCount))}` : ''}
                </span>
              </th>
              {weekDates.map((d) => {
                const cell = cellAssignments(key, d)
                const target = targetOf(key)
                const under = target > 0 && cell.length < target
                return (
                  <td key={d} data-testid="board-cell" data-row={key} data-date={d}>
                    <div className={cell.length === 0 ? 'roster-cell-empty' : undefined}>
                      {cell.map((a) => {
                        const tmpl = tmplById.get(a.shift_template_id)
                        const color = tmpl?.color ?? '#2f81f7'
                        const emp = empById.get(a.employee_id)
                        const name = nameOf(emp)
                        return (
                          <div
                            key={a.id}
                            className="roster-chip"
                            style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
                            title={`${name} · ${tmpl?.name ?? ''} ${fmtTime(tmpl?.start_time ?? '')}–${fmtTime(tmpl?.end_time ?? '')}`}
                          >
                            <span className="chip-name">{name}</span>
                            {isDraft && (
                              <button
                                type="button"
                                className="chip-remove"
                                data-testid="chip-remove"
                                aria-label={`${t('common.delete')} ${name}`}
                                onClick={() => onRemove(a)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {isDraft && (
                        <button
                          type="button"
                          className="roster-cell-add"
                          data-testid="cell-add"
                          data-row={key}
                          data-date={d}
                          onClick={() => onAdd(d, groupBy === 'station' ? (key as Station) : undefined)}
                        >
                          + {t('roster.addShift')}
                        </button>
                      )}
                    </div>
                    {target > 0 && (
                      <div className={`roster-cell-target${under ? ' under' : ''}`}>
                        {cell.length}/{target}
                        {under ? ` ${t('roster.understaffed')}` : ''}
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          )
        })}
        {rowKeys.length === 0 && (
          <tr>
            <td colSpan={8} className="roster-cell-empty" style={{ textAlign: 'center', padding: 24 }}>
              {employees.length === 0 ? t('roster.noEmployees') : t('roster.noTemplates')}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

function fmtTime(hhmm: string): string {
  return hhmm.slice(0, 5)
}
