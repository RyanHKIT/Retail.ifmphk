import { useFlowLocale } from '@/context/FlowLocaleContext'
import type {
  AssignmentRow,
  EmployeeRow,
  ShiftTemplateRow,
} from '@/lib/roster/types'

/**
 * Exports (MeDo algorithms, bilingual labels): week-grid CSV + employee-hours
 * CSV (both BOM-prefixed) and print-to-PDF via a print window. Client-side only.
 */

function csvEscape(v: string): string {
  return `"${v.replace(/"/g, '""')}"`
}

function download(filename: string, csv: string) {
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function fmtTime(hhmm: string): string {
  return hhmm.slice(0, 5)
}

export function ExportMenu({
  weekNumber,
  year,
  weekDates,
  assignments,
  employees,
  templates,
  stationRows,
  groupBy,
  hoursOf,
}: {
  weekNumber: number
  year: number
  weekDates: string[]
  assignments: AssignmentRow[]
  employees: EmployeeRow[]
  templates: ShiftTemplateRow[]
  stationRows: string[]
  groupBy: 'station' | 'employee'
  hoursOf: (employeeId: string) => number
}) {
  const { t, locale } = useFlowLocale()
  const zh = locale === 'zh-HK'

  const empById = new Map(employees.map((e) => [e.id, e]))
  const tmplById = new Map(templates.map((x) => [x.id, x]))

  const rowKeys: string[] =
    groupBy === 'station' ? stationRows : employees.map((e) => e.id)
  const rowLabel = (key: string) =>
    groupBy === 'station'
      ? key
      : (() => {
          const e = empById.get(key)
          return e ? (zh ? e.name_zh : e.name_en || e.name_zh) : key
        })()

  function cellAssignments(rowKey: string, date: string): AssignmentRow[] {
    return assignments.filter((a) => {
      if (a.work_date !== date) return false
      if (groupBy === 'employee') return a.employee_id === rowKey
      const tmpl = tmplById.get(a.shift_template_id)
      return tmpl?.station === rowKey
    })
  }

  function exportWeekCsv() {
    const header = zh ? '崗位/員工' : 'Station/Employee'
    const rows: string[][] = [
      [header, ...weekDates.map((d, i) => `${t(`roster.weekday.${i}`)} ${d}`)],
    ]
    for (const key of rowKeys) {
      const row = [rowLabel(key)]
      for (const d of weekDates) {
        const cell = cellAssignments(key, d)
        row.push(
          cell
            .map((a) => {
              const e = empById.get(a.employee_id)
              const tmpl = tmplById.get(a.shift_template_id)
              const name = e ? (zh ? e.name_zh : e.name_en || e.name_zh) : ''
              return `${name}(${tmpl?.name ?? ''} ${fmtTime(tmpl?.start_time ?? '')}–${fmtTime(tmpl?.end_time ?? '')})`
            })
            .join(' | '),
        )
      }
      rows.push(row)
    }
    download(
      `${zh ? '排更表' : 'roster'}_${year}-${zh ? '第' : 'w'}${weekNumber}.csv`,
      rows.map((r) => r.map(csvEscape).join(',')).join('\n'),
    )
  }

  function exportHoursCsv() {
    const rows: string[][] = [
      [
        t('roster.staff.nameZh'),
        t('roster.station'),
        t('roster.staff.type'),
        zh ? '本週時數' : 'Weekly hours',
        t('roster.staff.minHours'),
        t('roster.staff.maxHours'),
        t('roster.hours'),
      ],
    ]
    for (const e of employees) {
      const hrs = hoursOf(e.id)
      rows.push([
        zh ? e.name_zh : e.name_en || e.name_zh,
        e.station,
        t(`roster.staff.type.${e.employment_type}`),
        hrs.toFixed(1),
        String(e.min_hours_per_week),
        String(e.max_hours_per_week),
        t('roster.hours'),
      ])
    }
    download(
      `${zh ? '員工工時' : 'staff_hours'}_${year}-${zh ? '第' : 'w'}${weekNumber}.csv`,
      rows.map((r) => r.map(csvEscape).join(',')).join('\n'),
    )
  }

  function exportPrintPdf() {
    const w = window.open('', '_blank')
    if (!w) return
    const th = (label: string) =>
      `<th style="border:1px solid #ccc;padding:6px 8px;background:#f5f5f5;white-space:nowrap">${label}</th>`
    const headerRow = `<tr>${th(
      groupBy === 'station' ? t('roster.station') : t('roster.employee'),
    )}${weekDates
      .map((d, i) => th(`${t(`roster.weekday.${i}`)}<br/>${d}`))
      .join('')}</tr>`
    const bodyRows = rowKeys
      .map((key) => {
        const cells = weekDates
          .map((d) => {
            const chips = cellAssignments(key, d)
              .map((a) => {
                const e = empById.get(a.employee_id)
                const tmpl = tmplById.get(a.shift_template_id)
                const color = tmpl?.color ?? '#B45309'
                const name = e ? (zh ? e.name_zh : e.name_en || e.name_zh) : ''
                return `<div style="background:${color}22;color:${color};border:1px solid ${color}88;border-radius:3px;padding:2px 5px;margin:1px 0;font-size:11px;white-space:nowrap">${name.slice(0, 2)} ${tmpl?.name ?? ''}</div>`
              })
              .join('')
            return `<td style="border:1px solid #ccc;padding:4px 6px;vertical-align:top;min-width:80px">${
              chips || '<span style="color:#aaa;font-size:11px">—</span>'
            }</td>`
          })
          .join('')
        return `<tr><td style="border:1px solid #ccc;padding:6px 10px;font-weight:600;background:#fafafa">${rowLabel(key)}</td>${cells}</tr>`
      })
      .join('')
    const title = zh ? '排更表' : 'Roster'
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} ${year} ${zh ? '第' : 'w'}${weekNumber}</title><style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}@media print{@page{size:landscape}}</style></head><body><h2 style="margin:0 0 4px">${title}</h2><p style="margin:0 0 12px;color:#666">${year} ${zh ? '第' : 'w'}${weekNumber} (${weekDates[0]} ~ ${weekDates[6]})</p><table>${headerRow}${bodyRows}</table><p style="margin:12px 0 0;color:#999;font-size:12px">${new Date().toLocaleString()}</p></body></html>`,
    )
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  const disabled = assignments.length === 0

  return (
    <div className="roster-segment" role="group" aria-label={t('roster.export')}>
      <button type="button" onClick={exportWeekCsv} disabled={disabled} title={t('roster.export.csvWeek')}>
        {t('roster.export.csvWeek')}
      </button>
      <button type="button" onClick={exportHoursCsv} title={t('roster.export.csvDay')}>
        {t('roster.export.csvDay')}
      </button>
      <button type="button" onClick={exportPrintPdf} disabled={disabled} title={t('roster.export.printPdf')}>
        {t('roster.export.printPdf')}
      </button>
    </div>
  )
}

export { fmtTime }
