import { useFlowLocale } from '@/context/FlowLocaleContext'
import type {
  AssignmentRow,
  EmployeeRow,
  ShiftTemplateRow,
} from '@/lib/roster/types'

/** All calendar dates of a month view, Mon-start padded to whole weeks. */
export function monthCalendarDates(
  year: number,
  monthIndex0: number,
): { iso: string; day: number; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, monthIndex0, 1))
  const last = new Date(Date.UTC(year, monthIndex0 + 1, 0))
  const padStart = (first.getUTCDay() + 6) % 7
  const lastDow = (last.getUTCDay() + 6) % 7
  const padEnd = 6 - lastDow
  const out: { iso: string; day: number; inMonth: boolean }[] = []
  for (let i = -padStart; i <= last.getUTCDate() + padEnd - 1; i += 1) {
    const d = new Date(Date.UTC(year, monthIndex0, 1 + i))
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === monthIndex0,
    })
  }
  return out
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Month calendar view: aggregate chips per date, `+N` overflow (MeDo parity).
 * `monthAnchor` is any date inside the target month ("YYYY-MM-DD").
 */
export function MonthGrid({
  monthAnchor,
  monthAssignments,
  employees,
  templates,
  onPickDate,
}: {
  monthAnchor: string
  monthAssignments: AssignmentRow[]
  employees: EmployeeRow[]
  templates: ShiftTemplateRow[]
  onPickDate?: (iso: string) => void
}) {
  const { t, locale } = useFlowLocale()
  const [y, m] = monthAnchor.split('-').map(Number)
  const dates = monthCalendarDates(y, m - 1)
  const today = new Date().toISOString().slice(0, 10)

  const empById = new Map(employees.map((e) => [e.id, e]))
  const tmplById = new Map(templates.map((x) => [x.id, x]))

  const nameOf = (e: EmployeeRow | undefined) =>
    e ? (locale === 'zh-HK' ? e.name_zh : e.name_en || e.name_zh) : ''

  return (
    <div>
      <div className="roster-month-head">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i}>{t(`roster.weekday.${i}`)}</div>
        ))}
      </div>
      <div className="roster-month-grid" data-testid="month-grid">
        {dates.map((d) => {
          const dayAsgns = monthAssignments.filter((a) => a.work_date === d.iso)
          return (
            <div
              key={d.iso}
              className={`roster-month-cell${d.inMonth ? '' : ' out'}`}
              onClick={d.inMonth && onPickDate ? () => onPickDate(d.iso) : undefined}
              role={d.inMonth && onPickDate ? 'button' : undefined}
              aria-label={d.iso}
            >
              <div className="month-date">
                <span className={d.iso === today ? 'today' : undefined}>{d.day}</span>
              </div>
              {dayAsgns.slice(0, 3).map((a) => {
                const tmpl = tmplById.get(a.shift_template_id)
                const color = tmpl?.color ?? '#2f81f7'
                const label = nameOf(empById.get(a.employee_id)).slice(0, 2)
                const title = `${nameOf(empById.get(a.employee_id))} · ${tmpl?.name ?? ''}`
                return (
                  <div
                    key={a.id}
                    className="roster-month-chip"
                    style={{ background: `${color}22`, color }}
                    title={title}
                  >
                    {label} {tmpl?.name ?? ''}
                  </div>
                )
              })}
              {dayAsgns.length > 3 && (
                <div className="roster-month-more">
                  {t('roster.monthMore').replace('{{count}}', String(dayAsgns.length - 3))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function monthLabel(year: number, monthIndex0: number, locale: string): string {
  return locale === 'zh-HK'
    ? `${year} 年 ${monthIndex0 + 1} 月`
    : `${new Date(Date.UTC(year, monthIndex0, 1)).toLocaleString('en', { month: 'long', timeZone: 'UTC' })} ${year}`
}

export { pad }
