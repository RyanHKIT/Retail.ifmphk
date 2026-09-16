import { useFlowLocale } from '@/context/FlowLocaleContext'
import type { Conflict } from '@/lib/roster/conflicts'
import type { EmployeeRow } from '@/lib/roster/types'

/**
 * Conflict badge row (spec §5): hard (red) blocks publish, soft (amber) warns,
 * green when clean. `understaffed` never appears here — display-only cell counter.
 */
export function ConflictBadges({
  conflicts,
  employees,
  hasAssignments,
}: {
  conflicts: Conflict[]
  employees: EmployeeRow[]
  hasAssignments: boolean
}) {
  const { t, locale } = useFlowLocale()
  if (conflicts.length === 0) {
    return hasAssignments ? (
      <span className="roster-badge conflict-clean" data-testid="conflict-badge-clean">
        ✓ {t('roster.noConflicts')}
      </span>
    ) : null
  }

  const nameOf = (id: string) => {
    const e = employees.find((x) => x.id === id)
    return e ? (locale === 'zh-HK' ? e.name_zh : e.name_en || e.name_zh) : id
  }
  const dateOf = (d: string) => (locale === 'zh-HK' ? d : d.slice(5))

  const label = (c: Conflict) => {
    const kind = t(`roster.conflict.${c.kind}`)
    const who = nameOf(c.employeeId)
    const when = c.kind === 'double_booking' || c.kind === 'availability' ? dateOf(c.workDate) : ''
    return when ? `${who} · ${kind} · ${when}` : `${who} · ${kind}`
  }

  const hard = conflicts.filter((c) => c.severity === 'hard')
  const soft = conflicts.filter((c) => c.severity === 'soft')

  return (
    <>
      {hard.map((c, i) => (
        <span key={`h${i}`} className="roster-badge conflict-hard" data-testid="conflict-badge-hard">
          ⚠ {label(c)}
        </span>
      ))}
      {soft.map((c, i) => (
        <span key={`s${i}`} className="roster-badge conflict-soft" data-testid="conflict-badge-soft">
          ⚠ {label(c)}
        </span>
      ))}
    </>
  )
}
