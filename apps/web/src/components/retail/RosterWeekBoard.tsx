import { useMemo, useState } from 'react'
import { HourBar } from '@/components/retail/HourBar'
import {
  STATIONS,
  assignmentHours,
  detectConflicts,
  loadBoard,
  removeAssignment,
  upsertAssignment,
  weekDates,
  type BoardConflict,
  type BoardState,
  type BoardTemplate,
} from '@/lib/rosterBoardStore'

function formatDayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const wd = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()] ?? ''
  return `${d.getMonth() + 1}/${d.getDate()} 週${wd}`
}

function ShiftChip({
  template,
  employeeName,
  onRemove,
}: {
  template?: BoardTemplate
  employeeName: string
  onRemove: () => void
}) {
  const color = template?.color ?? '#0c6f6a'
  return (
    <div
      className="roster-shift-chip"
      style={{
        backgroundColor: `${color}22`,
        borderColor: `${color}66`,
        color,
      }}
      title={`${employeeName} · ${template?.name ?? ''} ${template?.startTime ?? ''}–${template?.endTime ?? ''}`}
    >
      <span className="roster-shift-chip__label">{employeeName.slice(0, 2)}</span>
      <button
        type="button"
        className="roster-shift-chip__remove"
        aria-label={`移除 ${employeeName}`}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        ×
      </button>
    </div>
  )
}

export function RosterWeekBoard() {
  const [tick, setTick] = useState(0)
  const state: BoardState = useMemo(() => loadBoard(), [tick])
  const dates = useMemo(() => weekDates(state.weekStart), [state.weekStart])
  const conflicts: BoardConflict[] = useMemo(() => detectConflicts(state), [state])

  const [addCell, setAddCell] = useState<{ date: string; station: string } | null>(null)
  const [pickEmp, setPickEmp] = useState('')
  const [pickTmpl, setPickTmpl] = useState('')

  const refresh = () => setTick((n) => n + 1)

  const openAdd = (date: string, station: string) => {
    const tmpls = state.templates.filter((t) => t.station === station)
    const emps = state.employees.filter((e) => e.station === station)
    setAddCell({ date, station })
    setPickEmp(emps[0]?.id ?? '')
    setPickTmpl(tmpls[0]?.id ?? '')
  }

  const confirmAdd = () => {
    if (!addCell || !pickEmp || !pickTmpl) return
    const id = `asg-${Date.now()}`
    upsertAssignment({
      id,
      employeeId: pickEmp,
      station: addCell.station,
      workDate: addCell.date,
      templateId: pickTmpl,
    })
    setAddCell(null)
    refresh()
  }

  const hard = conflicts.filter((c) => c.severity === 'hard')
  const soft = conflicts.filter((c) => c.severity === 'soft')

  return (
    <div className="roster-week-board">
      <div className="roster-week-board__meta">
        <div>
          <div className="roster-week-board__title">週更表</div>
          <p className="roster-week-board__sub">
            週起 {state.weekStart} · 目標人手（需求高峰）{state.targetHeadcount} 人/日
          </p>
        </div>
        <div className="roster-week-board__badges" role="status">
          {hard.map((c, i) => (
            <span key={`h-${i}`} className="roster-badge roster-badge--hard">
              {c.message}
            </span>
          ))}
          {soft.slice(0, 4).map((c, i) => (
            <span key={`s-${i}`} className="roster-badge roster-badge--soft">
              {c.message}
            </span>
          ))}
          {soft.length > 4 && (
            <span className="roster-badge roster-badge--soft">+{soft.length - 4} 則提示</span>
          )}
          {conflicts.length === 0 && (
            <span className="roster-badge roster-badge--ok">無衝突</span>
          )}
        </div>
      </div>

      <div className="roster-week-board__legend">
        <span className="roster-week-board__legend-label">更次：</span>
        {state.templates.map((t) => (
          <span key={t.id} className="roster-legend-item">
            <span
              className="roster-legend-swatch"
              style={{ backgroundColor: `${t.color}33`, borderColor: `${t.color}88` }}
            />
            <span style={{ color: t.color }}>{t.name}</span>
            <span className="roster-legend-time">
              {t.startTime}–{t.endTime}
            </span>
          </span>
        ))}
      </div>

      <div className="roster-week-board__layout">
        <div className="roster-week-board__grid-wrap">
          <table className="roster-week-table">
            <thead>
              <tr>
                <th>崗位</th>
                {dates.map((d) => (
                  <th key={d}>
                    <div>{formatDayLabel(d)}</div>
                    <div className="roster-week-table__target">
                      目標 {state.targetHeadcount}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIONS.map((station) => (
                <tr key={station}>
                  <td className="roster-week-table__station">
                    <strong>{station}</strong>
                    <div className="roster-week-table__station-sub">
                      {state.templates
                        .filter((t) => t.station === station)
                        .map((t) => t.name)
                        .join(' · ')}
                    </div>
                  </td>
                  {dates.map((date) => {
                    const cell = state.assignments.filter(
                      (a) => a.station === station && a.workDate === date,
                    )
                    return (
                      <td key={date}>
                        <div className="roster-week-cell">
                          {cell.map((a) => {
                            const emp = state.employees.find((e) => e.id === a.employeeId)
                            const tmpl = state.templates.find((t) => t.id === a.templateId)
                            return (
                              <ShiftChip
                                key={a.id}
                                template={tmpl}
                                employeeName={emp?.nameZh ?? a.employeeId}
                                onRemove={() => {
                                  removeAssignment(a.id)
                                  refresh()
                                }}
                              />
                            )
                          })}
                          <button
                            type="button"
                            className="roster-week-cell__add"
                            onClick={() => openAdd(date, station)}
                          >
                            + 加
                          </button>
                          <div
                            className={
                              cell.length < Math.ceil(state.targetHeadcount / STATIONS.length)
                                ? 'roster-week-cell__count roster-week-cell__count--low'
                                : 'roster-week-cell__count'
                            }
                          >
                            {cell.length}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="roster-hours-sidebar" aria-label="員工工時">
          <div className="roster-hours-sidebar__title">員工工時</div>
          <div className="roster-hours-sidebar__list">
            {state.employees.map((emp) => (
              <HourBar
                key={emp.id}
                name={emp.nameZh}
                hours={assignmentHours(state, emp.id)}
                min={emp.minHoursPerWeek}
                max={emp.maxHoursPerWeek}
              />
            ))}
          </div>
        </aside>
      </div>

      {addCell && (
        <div className="roster-add-dialog" role="dialog" aria-modal="true" aria-labelledby="roster-add-title">
          <div className="roster-add-dialog__panel">
            <h3 id="roster-add-title">
              新增排班 — {addCell.date} · {addCell.station}
            </h3>
            <label className="roster-add-dialog__field">
              <span>員工</span>
              <select value={pickEmp} onChange={(e) => setPickEmp(e.target.value)}>
                {state.employees
                  .filter((e) => e.station === addCell.station)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nameZh}
                    </option>
                  ))}
              </select>
            </label>
            <label className="roster-add-dialog__field">
              <span>更次</span>
              <select value={pickTmpl} onChange={(e) => setPickTmpl(e.target.value)}>
                {state.templates
                  .filter((t) => t.station === addCell.station)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.startTime}–{t.endTime})
                    </option>
                  ))}
              </select>
            </label>
            <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAddCell(null)}>
                取消
              </button>
              <button type="button" className="btn btn-primary" onClick={confirmAdd}>
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
