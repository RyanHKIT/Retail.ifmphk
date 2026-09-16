// Task 5 component contract (plan docs/superpowers/plans/2026-09-16-ifmp-flow-roster.md):
// board renders 7 Mon-start day columns; add dialog batch-selects 2 employees;
// double-booking shows red badge; publish disabled with reason; undo restores.
// The api layer and auth context are mocked; conflicts engine is REAL (parity fixture).

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import type {
  AssignmentRow,
  EmployeeRow,
  RosterWeekRow,
  ShiftTemplateRow,
} from '@/lib/roster/types'
import { WeekBoardPage } from './WeekBoard'

const WEEK_START = '2026-09-14' // Monday, ISO week 38

// ---- hoisted mock state (vi.mock factories are hoisted) ----

const h = vi.hoisted(() => {
  const state: {
    week: any
    assignments: any[]
    employees: any[]
    templates: any[]
    policies: any[]
    availability: any[]
    calls: {
      add: any[][]
      remove: string[]
      publish: string[]
      copy: [string, string][]
    }
  } = {
    week: null,
    assignments: [],
    employees: [],
    templates: [],
    policies: [],
    availability: [],
    calls: { add: [], remove: [], publish: [], copy: [] },
  }
  return { state }
})

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => ({
    session: { user: { id: 'p1' } },
    profile: {
      id: 'p1',
      email: 'manager@ifmphk.com',
      display_name: 'Pilot Manager',
      role: 'branch_manager',
    },
    loading: false,
    resolvingProfile: false,
    signIn: async () => ({ error: null }),
    signOut: async () => {},
  }),
}))

vi.mock('@/lib/roster/api', () => {
  // pure helpers the board imports must behave like the real ones
  const addDays = (isoDate: string, days: number) => {
    const d = new Date(`${isoDate}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }
  const isoWeekInfo = (isoDate: string) => {
    const d = new Date(`${isoDate}T00:00:00Z`)
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const year = d.getUTCFullYear()
    const yearStart = new Date(Date.UTC(year, 0, 1))
    const weekNumber = Math.ceil(
      ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    )
    return { year, weekNumber }
  }
  return {
    addDays,
    isoWeekInfo,
    RosterError: class extends Error {
      code: string
      constructor(code: string) {
        super(code)
        this.code = code
      }
    },
    fetchManagedBranchId: vi.fn(async () => 'b1'),
    fetchWeekData: vi.fn(async () => ({
      week: h.state.week,
      assignments: h.state.assignments,
      templates: h.state.templates,
      employees: h.state.employees,
      policies: h.state.policies,
      availability: h.state.availability,
    })),
    fetchMonthAssignments: vi.fn(async () => h.state.assignments),
    addAssignments: vi.fn(async (_weekId: string, rows: any[]) => {
      h.state.calls.add.push(rows)
      const created = rows.map((r, i) => ({
        id: `new-${h.state.assignments.length}-${i}`,
        roster_week_id: h.state.week.id,
        notes: r.notes ?? '',
        ...r,
      }))
      h.state.assignments = [...h.state.assignments, ...created]
      return created
    }),
    removeAssignment: vi.fn(async (id: string) => {
      h.state.calls.remove.push(id)
      h.state.assignments = h.state.assignments.filter((a) => a.id !== id)
    }),
    publishWeek: vi.fn(async (weekId: string) => {
      h.state.calls.publish.push(weekId)
      h.state.week = { ...h.state.week, status: 'published' }
    }),
    unpublishWeek: vi.fn(async () => {
      h.state.week = { ...h.state.week, status: 'draft' }
    }),
    copyWeek: vi.fn(async (src: string, dst: string) => {
      h.state.calls.copy.push([src, dst])
      return 2
    }),
  }
})

// ---- fixtures ----

const WEEK: RosterWeekRow = {
  id: 'w1',
  branch_id: 'b1',
  year: 2026,
  week_number: 38,
  week_start: WEEK_START,
  status: 'draft',
  published_at: null,
  published_by: null,
}

function emp(
  id: string,
  name: string,
  station: EmployeeRow['station'],
): EmployeeRow {
  return {
    id,
    branch_id: 'b1',
    name_zh: name,
    name_en: '',
    station,
    employment_type: 'full_time',
    min_hours_per_week: 0,
    max_hours_per_week: 48,
    is_active: true,
  }
}

function tmpl(
  id: string,
  name: string,
  start: string,
  end: string,
  station: ShiftTemplateRow['station'],
  target = 1,
): ShiftTemplateRow {
  return {
    id,
    branch_id: 'b1',
    name,
    start_time: start,
    end_time: end,
    color: '#2f81f7',
    station,
    headcount_target: target,
    is_active: true,
  }
}

function asg(
  id: string,
  employeeId: string,
  templateId: string,
  date: string,
): AssignmentRow {
  return {
    id,
    roster_week_id: 'w1',
    employee_id: employeeId,
    shift_template_id: templateId,
    work_date: date,
    notes: '',
  }
}

function resetState() {
  h.state.week = { ...WEEK }
  h.state.employees = [
    emp('e1', '陳大文', '樓面'),
    emp('e2', '李小美', '樓面'),
    emp('e3', '王強', '收銀'),
  ]
  h.state.templates = [
    tmpl('s1', '早更', '09:00', '13:00', '樓面', 2),
    tmpl('s2', '午更', '12:00', '16:00', '樓面', 1),
    tmpl('s3', '收銀更', '10:00', '18:00', '收銀', 1),
  ]
  h.state.assignments = [asg('a1', 'e1', 's1', WEEK_START)]
  h.state.policies = []
  h.state.availability = []
  h.state.calls = { add: [], remove: [], publish: [], copy: [] }
}

beforeEach(() => {
  localStorage.removeItem('ifmp_flow_locale')
  resetState()
})

// ---- harness ----

function renderBoard() {
  return render(
    <FlowLocaleProvider>
      <WeekBoardPage />
    </FlowLocaleProvider>,
  )
}

async function awaitBoard() {
  // wait for fully-rendered board: cells AND draft-only add buttons
  await screen.findAllByTestId('cell-add')
}

function findCell(row: string, date: string) {
  const el = screen
    .getAllByTestId('board-cell')
    .find((n) => n.dataset.row === row && n.dataset.date === date)
  expect(el).toBeTruthy()
  return within(el as HTMLElement)
}

function findAdd(row: string, date: string) {
  const el = screen
    .getAllByTestId('cell-add')
    .find((n) => n.dataset.row === row && n.dataset.date === date)
  expect(el).toBeTruthy()
  return el as HTMLElement
}

// ---- tests ----

describe('WeekBoard (Task 5 contract)', () => {
  it('renders 7 Monday-start day columns with weekday labels', async () => {
    renderBoard()
    const cols = await screen.findAllByTestId('board-day-col')
    expect(cols).toHaveLength(7)
    expect(cols[0]).toHaveTextContent('週一')
    expect(cols[6]).toHaveTextContent('週日')
    expect(cols[0]).toHaveTextContent('09-14')
  })

  it('add dialog batch-selects 2 employees and inserts both', async () => {
    renderBoard()
    await awaitBoard()
    await userEvent.click(findAdd('樓面', WEEK_START))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('加更')

    // template list filtered to the row's station (no 收銀更 option)
    const select = within(dialog).getByLabelText(
      '更段模板',
    ) as HTMLSelectElement
    const optionValues = Array.from(select.options).map((o) => o.value)
    expect(optionValues).toContain('s1')
    expect(optionValues).toContain('s2')
    expect(optionValues).not.toContain('s3')

    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: /陳大文/ }),
    )
    await userEvent.click(
      within(dialog).getByRole('checkbox', { name: /李小美/ }),
    )
    await userEvent.selectOptions(select, 's1')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '加入 2 人' }),
    )

    const cell = findCell('樓面', WEEK_START)
    expect(await cell.findByText('李小美')).toBeInTheDocument()
    expect(cell.getAllByText('陳大文').length).toBeGreaterThanOrEqual(2)

    expect(h.state.calls.add.at(-1)).toHaveLength(2)
    expect(h.state.calls.add.at(-1)![0]).toMatchObject({
      employee_id: 'e1',
      shift_template_id: 's1',
      work_date: WEEK_START,
    })
    expect(h.state.calls.add.at(-1)![1]).toMatchObject({
      employee_id: 'e2',
      shift_template_id: 's1',
      work_date: WEEK_START,
    })
    expect(screen.getByRole('button', { name: '復原' })).toBeEnabled()
  })

  it('double booking renders a hard (red) conflict badge', async () => {
    h.state.assignments = [
      asg('a1', 'e1', 's1', WEEK_START),
      asg('a2', 'e1', 's2', WEEK_START), // 09–13 vs 12–16 overlap
    ]
    renderBoard()
    const badge = await screen.findByTestId('conflict-badge-hard')
    expect(badge).toHaveTextContent('雙更衝突')
    expect(badge).toHaveTextContent('陳大文')
  })

  it('publish disabled with reason while hard conflicts exist', async () => {
    h.state.assignments = [
      asg('a1', 'e1', 's1', WEEK_START),
      asg('a2', 'e1', 's2', WEEK_START),
    ]
    renderBoard()
    const publish = await screen.findByRole('button', { name: '發佈' })
    expect(publish).toBeDisabled()
    const reason = await screen.findByTestId('publish-blocked')
    expect(reason).toHaveTextContent('存在硬性衝突')
    expect(reason).toHaveTextContent('雙更衝突')
  })

  it('delete confirm then undo restores the shift', async () => {
    renderBoard()
    await awaitBoard()
    const cell = findCell('樓面', WEEK_START)
    await userEvent.click(cell.getByTestId('chip-remove'))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('刪除此更段？')
    await userEvent.click(within(dialog).getByRole('button', { name: '刪除' }))

    expect(h.state.calls.remove).toEqual(['a1'])
    expect(findCell('樓面', WEEK_START).queryByText('陳大文')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: '復原' }))
    expect(h.state.calls.add.at(-1)).toHaveLength(1)
    expect(h.state.calls.add.at(-1)![0]).toMatchObject({
      employee_id: 'e1',
      shift_template_id: 's1',
      work_date: WEEK_START,
    })
    expect(findCell('樓面', WEEK_START).getByText('陳大文')).toBeInTheDocument()
  })

  it('publishes a clean week and turns the board read-only', async () => {
    renderBoard()
    const publish = await screen.findByRole('button', { name: '發佈' })
    expect(publish).toBeEnabled()
    await userEvent.click(publish)
    // publish opens a confirm dialog (softList === null → plain confirm)
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: '發佈' }))
    await waitFor(() => expect(h.state.calls.publish).toEqual(['w1']))
    expect(await screen.findByText('已發佈')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收回草稿' })).toBeInTheDocument()
    expect(screen.queryByTestId('cell-add')).toBeNull()
  })
})
