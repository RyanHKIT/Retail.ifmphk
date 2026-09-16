import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { BoardGrid } from '@/components/roster/BoardGrid'
import { CellDialog } from '@/components/roster/CellDialog'
import {
  CopyDayDialog,
  CopyWeekDialog,
  DeleteConfirmDialog,
  PublishConfirmDialog,
} from '@/components/roster/CopyDialog'
import { ConflictBadges } from '@/components/roster/ConflictBadges'
import { ExportMenu } from '@/components/roster/ExportMenu'
import { HourSidebar, weeklyHours } from '@/components/roster/HourSidebar'
import { MonthGrid, monthLabel } from '@/components/roster/MonthGrid'
import {
  addAssignments,
  addDays,
  copyWeek,
  fetchManagedBranchId,
  fetchMonthAssignments,
  fetchWeekData,
  isoWeekInfo,
  publishWeek,
  removeAssignment,
  unpublishWeek,
  RosterError,
  type WeekBundle,
} from '@/lib/roster/api'
import { detectConflicts, type Conflict } from '@/lib/roster/conflicts'
import type { AssignmentRow, Station } from '@/lib/roster/types'

type ViewMode = 'week' | 'month'
type GroupBy = 'station' | 'employee'

/** Client-side undo stack depth (spec: 20, no server-side undo). */
const UNDO_LIMIT = 20

interface UndoAction {
  kind: 'create' | 'delete'
  rows: { employeeId: string; templateId: string; workDate: string; notes: string }[]
  /** create-undo deletes these assignment ids; delete-undo ignores them. */
  ids?: string[]
}

function weekStartOfToday(): string {
  const now = new Date()
  const dow = (now.getUTCDay() + 6) % 7
  return addDays(now.toISOString().slice(0, 10), -dow)
}

function monthStartOfToday(): string {
  const now = new Date()
  return now.toISOString().slice(0, 8) + '01'
}

/**
 * /flow/roster — manager week board (Phase 2 Task 5, spec §5).
 * Draft-only editing; publish blocked on hard conflicts; soft-confirm dialog;
 * undo stack 20; copy prev-week (server RPC) / copy-day (batch insert).
 */
export function WeekBoardPage() {
  const { profile } = useFlowAuth()
  const { t, locale } = useFlowLocale()
  const zh = locale === 'zh-HK'

  // view state
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [groupBy, setGroupBy] = useState<GroupBy>('station')
  const [weekStart, setWeekStart] = useState<string>(weekStartOfToday)

  // data state
  const [branchId, setBranchId] = useState<string | null>(null)
  /** False until fetchManagedBranchId resolves — distinguishes "resolving" from "no branch". */
  const [branchResolved, setBranchResolved] = useState(false)
  const [bundle, setBundle] = useState<WeekBundle | null>(null)
  const [monthAssignments, setMonthAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // dialog state
  const [addOpen, setAddOpen] = useState<{ date: string; station?: Station } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<AssignmentRow | null>(null)
  const [copyDay, setCopyDay] = useState<string | null>(null)
  const [copyWeekOpen, setCopyWeekOpen] = useState<{ srcCount: number; srcStart: string } | null>(null)
  const [publishOpen, setPublishOpen] = useState<{ softList: string[] | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // undo stack
  const [undoStack, setUndoStack] = useState<UndoAction[]>([])
  const lastLoadedKey = useRef<string | null>(null)

  // ---- derived ----
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  const { year, weekNumber } = useMemo(() => isoWeekInfo(weekStart), [weekStart])
  const prevWeekStart = useMemo(() => addDays(weekStart, -7), [weekStart])
  const monthAnchor = weekStart.slice(0, 8) + '01'

  const stations = useMemo<Station[]>(() => {
    const s = new Set<Station>(['樓面', '試衣', '收銀'])
    for (const tmpl of bundle?.templates ?? []) s.add(tmpl.station)
    return Array.from(s)
  }, [bundle])

  const assignments = bundle?.assignments ?? []
  const employees = bundle?.employees ?? []
  const templates = bundle?.templates ?? []
  const isDraft = bundle?.week.status === 'draft' || bundle == null

  const conflicts = useMemo<Conflict[]>(() => {
    if (!bundle) return []
    return detectConflicts({
      weekStart,
      assignments,
      templates,
      employees,
      policies: bundle.policies,
      availability: bundle.availability,
    })
  }, [bundle, weekStart, assignments, templates, employees])

  const hardConflicts = conflicts.filter((c) => c.severity === 'hard')
  const softConflicts = conflicts.filter((c) => c.severity === 'soft')

  const empName = useCallback(
    (id: string) => {
      const e = employees.find((x) => x.id === id)
      return e ? (zh ? e.name_zh : e.name_en || e.name_zh) : id
    },
    [employees, zh],
  )

  const conflictText = useCallback(
    (c: Conflict) => {
      const kind = t(`roster.conflict.${c.kind}`)
      return `${empName(c.employeeId)} · ${kind} · ${c.workDate}`
    },
    [empName, t],
  )

  // ---- data loading ----
  const loadWeek = useCallback(
    async (targetWeek: string) => {
      if (!branchId) return
      setLoading(true)
      setLoadError(null)
      try {
        const b = await fetchWeekData(branchId, targetWeek)
        setBundle(b)
      } catch (err) {
        setLoadError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
      } finally {
        setLoading(false)
      }
    },
    [branchId, t],
  )

  const loadMonth = useCallback(
    async (anchor: string) => {
      if (!branchId) return
      setLoading(true)
      setLoadError(null)
      try {
        setMonthAssignments(await fetchMonthAssignments(branchId, anchor))
      } catch (err) {
        setLoadError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
      } finally {
        setLoading(false)
      }
    },
    [branchId, t],
  )

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
    // Clear undo only when the viewed week/month actually changes — mutations
    // refresh via loadWeek() directly and must keep the undo stack.
    const key = viewMode === 'week' ? `w:${weekStart}` : `m:${monthAnchor}`
    if (lastLoadedKey.current !== key) {
      lastLoadedKey.current = key
      setUndoStack([]) // week switch clears undo (assignments belong to week)
    }
    if (viewMode === 'week') void loadWeek(weekStart)
    else void loadMonth(monthAnchor)
  }, [viewMode, weekStart, monthAnchor, loadWeek, loadMonth])

  // ---- undo plumbing ----
  function pushUndo(a: UndoAction) {
    setUndoStack((s) => [...s.slice(-(UNDO_LIMIT - 1)), a])
  }

  async function handleUndo() {
    const last = undoStack.at(-1)
    if (!last || !bundle || busy) return
    setBusy(true)
    setActionError(null)
    try {
      if (last.kind === 'create' && last.ids && last.ids.length > 0) {
        for (const id of last.ids) await removeAssignment(id)
      } else if (last.kind === 'delete') {
        await addAssignments(
          bundle.week.id,
          last.rows.map((r) => ({
            employee_id: r.employeeId,
            shift_template_id: r.templateId,
            work_date: r.workDate,
            notes: r.notes,
          })),
        )
      }
      setUndoStack((s) => s.slice(0, -1))
      await loadWeek(weekStart)
    } catch (err) {
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  // ---- mutations ----
  async function handleAdd(rows: { employeeId: string; templateId: string; notes: string }[]) {
    if (!addOpen || !bundle || rows.length === 0) return
    setBusy(true)
    setActionError(null)
    try {
      const created = await addAssignments(
        bundle.week.id,
        rows.map((r) => ({
          employee_id: r.employeeId,
          shift_template_id: r.templateId,
          work_date: addOpen.date,
          notes: r.notes,
        })),
      )
      pushUndo({
        kind: 'create',
        ids: created.map((c) => c.id),
        rows: rows.map((r) => ({ ...r, workDate: addOpen.date })),
      })
      setAddOpen(null)
      await loadWeek(weekStart)
    } catch (err) {
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || !bundle || busy) return
    const a = deleteConfirm
    setBusy(true)
    setActionError(null)
    try {
      await removeAssignment(a.id)
      pushUndo({
        kind: 'delete',
        rows: [
          {
            employeeId: a.employee_id,
            templateId: a.shift_template_id,
            workDate: a.work_date,
            notes: a.notes,
          },
        ],
      })
      setDeleteConfirm(null)
      await loadWeek(weekStart)
    } catch (err) {
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function doPublish() {
    if (!bundle || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await publishWeek(bundle.week.id)
      setPublishOpen(null)
      await loadWeek(weekStart)
    } catch (err) {
      setPublishOpen(null)
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function handleUnpublish() {
    if (!bundle || busy) return
    setBusy(true)
    setActionError(null)
    try {
      await unpublishWeek(bundle.week.id)
      await loadWeek(weekStart)
    } catch (err) {
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function openCopyWeek() {
    if (!branchId || !bundle || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const prev = await fetchWeekData(branchId, prevWeekStart)
      setCopyWeekOpen({ srcCount: prev.assignments.length, srcStart: prevWeekStart })
    } catch (err) {
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function doCopyWeek() {
    if (!branchId || !bundle || busy) return
    setBusy(true)
    setActionError(null)
    try {
      const prev = await fetchWeekData(branchId, prevWeekStart)
      await copyWeek(prev.week.id, bundle.week.id)
      setCopyWeekOpen(null)
      await loadWeek(weekStart)
    } catch (err) {
      setCopyWeekOpen(null)
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  async function doCopyDay(toDate: string) {
    if (!copyDay || !bundle || busy) return
    const src = assignments.filter((a) => a.work_date === copyDay)
    if (src.length === 0) {
      setActionError(t('roster.copyDay.noSource'))
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      const created = await addAssignments(
        bundle.week.id,
        src.map((a) => ({
          employee_id: a.employee_id,
          shift_template_id: a.shift_template_id,
          work_date: toDate,
          notes: a.notes,
        })),
      )
      pushUndo({
        kind: 'create',
        ids: created.map((c) => c.id),
        rows: src.map((a) => ({
          employeeId: a.employee_id,
          templateId: a.shift_template_id,
          workDate: toDate,
          notes: a.notes,
        })),
      })
      setCopyDay(null)
      await loadWeek(weekStart)
    } catch (err) {
      setActionError(err instanceof RosterError ? t(`roster.error.${err.code}`) : t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  // ---- render helpers ----
  const publishDisabledReason = hardConflicts.length > 0
    ? `${t('roster.publishTooltip.hard')}\n${hardConflicts.map(conflictText).join('\n')}`
    : null

  const monthLabelText = useMemo(() => {
    const [y, m] = monthAnchor.split('-').map(Number)
    return monthLabel(y, m - 1, locale)
  }, [monthAnchor, locale])

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
    <div className="roster-board">
      {/* toolbar */}
      <div className="roster-toolbar">
        <div className="roster-title">
          <h2>{t('roster.title')}</h2>
          <span className="roster-sub">
            {viewMode === 'month'
              ? monthLabelText
              : t('roster.weekNumber')
                  .replace('{{year}}', String(year))
                  .replace('{{week}}', String(weekNumber))}
            {viewMode === 'week' && bundle ? ` · ${weekStart}` : ''}
          </span>
        </div>

        {viewMode === 'week' && (
          <div className="roster-segment" role="group" aria-label={t('roster.groupBy')}>
            <button
              type="button"
              className={groupBy === 'station' ? 'active' : undefined}
              onClick={() => setGroupBy('station')}
            >
              {t('roster.groupByStation')}
            </button>
            <button
              type="button"
              className={groupBy === 'employee' ? 'active' : undefined}
              onClick={() => setGroupBy('employee')}
            >
              {t('roster.groupByEmployee')}
            </button>
          </div>
        )}

        <div className="roster-segment" role="group" aria-label={t('roster.viewMode')}>
          <button
            type="button"
            className={viewMode === 'week' ? 'active' : undefined}
            onClick={() => setViewMode('week')}
          >
            {t('roster.week')}
          </button>
          <button
            type="button"
            className={viewMode === 'month' ? 'active' : undefined}
            onClick={() => setViewMode('month')}
          >
            {t('roster.month')}
          </button>
        </div>

        <div className="roster-segment" role="group" aria-label="navigate">
          <button
            type="button"
            onClick={() =>
              viewMode === 'week'
                ? setWeekStart(prevWeekStart)
                : setWeekStart(shiftMonth(weekStart, -1))
            }
            aria-label={t('roster.prevWeek')}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() =>
              viewMode === 'month'
                ? setWeekStart(monthStartOfToday())
                : setWeekStart(weekStartOfToday())
            }
          >
            {viewMode === 'month' ? t('roster.thisMonth') : t('roster.thisWeek')}
          </button>
          <button
            type="button"
            onClick={() =>
              viewMode === 'week'
                ? setWeekStart(addDays(weekStart, 7))
                : setWeekStart(shiftMonth(weekStart, 1))
            }
            aria-label={t('roster.nextWeek')}
          >
            ›
          </button>
        </div>

        {viewMode === 'week' && bundle && (
          <>
            {isDraft && (
              <>
                <button
                  type="button"
                  className="roster-icon-btn"
                  onClick={handleUndo}
                  disabled={busy || undoStack.length === 0}
                  title={undoStack.length === 0 ? t('roster.undoEmpty') : t('roster.undo')}
                >
                  {t('roster.undo')}
                </button>
                <button type="button" className="roster-icon-btn" onClick={openCopyWeek} disabled={busy}>
                  {t('roster.copyPrevWeek')}
                </button>
              </>
            )}
            <button
              type="button"
              className="roster-icon-btn"
              onClick={() => void loadWeek(weekStart)}
              disabled={loading}
            >
              {t('roster.refresh')}
            </button>
            <ExportMenu
              weekNumber={weekNumber}
              year={year}
              weekDates={weekDates}
              assignments={assignments}
              employees={employees}
              templates={templates}
              stationRows={stations}
              groupBy={groupBy}
              hoursOf={(id) => weeklyHours(id, assignments, templates)}
            />
            {isDraft ? (
              <button
                type="button"
                className="roster-btn primary"
                disabled={busy || hardConflicts.length > 0}
                title={publishDisabledReason ?? t('roster.publishTooltip.clean')}
                onClick={() =>
                  setPublishOpen({
                    softList: softConflicts.length > 0 ? softConflicts.map(conflictText) : null,
                  })
                }
              >
                {t('roster.publish')}
              </button>
            ) : (
              <button
                type="button"
                className="roster-btn"
                onClick={handleUnpublish}
                disabled={busy}
                title={t('roster.unpublishConfirm')}
              >
                {t('roster.unpublish')}
              </button>
            )}
          </>
        )}
      </div>

      {/* error / loading */}
      {loadError && (
        <div className="roster-error-banner" role="alert">
          <span>{loadError}</span>
          <button
            type="button"
            className="roster-btn"
            onClick={() =>
              viewMode === 'week' ? void loadWeek(weekStart) : void loadMonth(monthAnchor)
            }
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

      {(!branchResolved || loading || (viewMode === 'week' && !bundle)) ? (
        <div className="roster-skeleton" aria-label={t('common.loading')}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bar" />
          ))}
        </div>
      ) : viewMode === 'week' ? (
        <>
          {/* status + conflicts */}
          <div className="roster-badges">
            {bundle && (
              <span
                className={`roster-badge${isDraft ? '' : ' status-published'}`}
                data-testid="week-status"
              >
                {isDraft ? t('roster.status.draft') : t('roster.status.published')}
              </span>
            )}
            <ConflictBadges
              conflicts={conflicts}
              employees={employees}
              hasAssignments={assignments.length > 0}
            />
          </div>

          {/* publish blocked reason */}
          {publishDisabledReason && (
            <div className="roster-publish-blocked" data-testid="publish-blocked">
              {t('roster.publishBlocked').replace(
                '{{list}}',
                hardConflicts.map(conflictText).join('\n'),
              )}
            </div>
          )}

          {/* legend */}
          {templates.length > 0 && (
            <div className="roster-legend">
              <span>{t('roster.legend')}:</span>
              {templates.map((x) => (
                <span key={x.id}>
                  <span className="swatch" style={{ background: `${x.color}55`, borderColor: x.color }} />
                  <span style={{ color: x.color }}>{x.name}</span>
                  <span>
                    {x.start_time.slice(0, 5)}–{x.end_time.slice(0, 5)}
                  </span>
                </span>
              ))}
            </div>
          )}

          <div className="roster-grid-wrap">
            <div className="roster-grid-scroll">
              <BoardGrid
                weekDates={weekDates}
                groupBy={groupBy}
                stations={stations}
                employees={employees}
                templates={templates}
                assignments={assignments}
                isDraft={isDraft}
                onAdd={(date, station) => setAddOpen({ date, station })}
                onRemove={(a) => setDeleteConfirm(a)}
                onCopyDay={isDraft ? (d) => setCopyDay(d) : undefined}
              />
            </div>
            {employees.length > 0 && (
              <HourSidebar
                employees={employees}
                assignments={assignments}
                templates={templates}
                policies={bundle?.policies ?? []}
                conflicts={conflicts}
              />
            )}
          </div>
        </>
      ) : (
        <MonthGrid
          monthAnchor={monthAnchor}
          monthAssignments={monthAssignments}
          employees={employees}
          templates={templates}
          onPickDate={(iso) => {
            const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7
            setWeekStart(addDays(iso, -dow))
            setViewMode('week')
          }}
        />
      )}

      {/* dialogs */}
      {addOpen && (
        <CellDialog
          date={addOpen.date}
          station={addOpen.station}
          employees={employees}
          templates={templates}
          busy={busy}
          onCancel={() => setAddOpen(null)}
          onConfirm={(rows) => void handleAdd(rows)}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmDialog
          label={`${empName(deleteConfirm.employee_id)} · ${
            templates.find((x) => x.id === deleteConfirm.shift_template_id)?.name ?? ''
          } (${deleteConfirm.work_date})`}
          busy={busy}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
      {copyDay && (
        <CopyDayDialog
          fromDate={copyDay}
          weekDates={weekDates}
          busy={busy}
          onCancel={() => setCopyDay(null)}
          onConfirm={(to) => void doCopyDay(to)}
        />
      )}
      {copyWeekOpen && (
        <CopyWeekDialog
          sourceWeekStart={copyWeekOpen.srcStart}
          sourceCount={copyWeekOpen.srcCount}
          busy={busy}
          onCancel={() => setCopyWeekOpen(null)}
          onConfirm={() => void doCopyWeek()}
        />
      )}
      {publishOpen && (
        <PublishConfirmDialog
          softList={publishOpen.softList}
          busy={busy}
          onCancel={() => setPublishOpen(null)}
          onConfirm={() => void doPublish()}
        />
      )}
    </div>
  )

  function shiftMonth(anchorWeek: string, delta: number): string {
    // month view navigates by calendar month; weekStart state holds the anchor
    // week of the displayed month (its Monday fixes monthAnchor via weekStart).
    const [y, m] = anchorWeek.split('-').map(Number)
    const d = new Date(Date.UTC(y, m - 1 + delta, 1))
    return d.toISOString().slice(0, 10)
  }
}

export default WeekBoardPage
