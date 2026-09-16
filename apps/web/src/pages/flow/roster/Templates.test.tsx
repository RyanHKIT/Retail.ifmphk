// Task 7 component contract (Phase 2 roster leaf page):
// list shows active templates with duration preview (+1d marker overnight);
// create dialog submits name/time/station/palette color/headcount via
// createTemplate; delete confirms then calls deleteTemplate with the row id.
// The api layer and auth context are mocked; locale provider is REAL.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import type { ShiftTemplateRow, Station } from '@/lib/roster/types'
import { TemplatesPage } from './Templates'

// ---- hoisted mock state (vi.mock factories are hoisted) ----

const h = vi.hoisted(() => {
  const state: {
    templates: any[]
    calls: { create: any[][]; update: any[][]; remove: string[] }
  } = {
    templates: [],
    calls: { create: [], update: [], remove: [] },
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

vi.mock('@/lib/roster/api', () => ({
  RosterError: class extends Error {
    code: string
    constructor(code: string) {
      super(code)
      this.code = code
    }
  },
  fetchManagedBranchId: vi.fn(async () => 'b1'),
  fetchTemplates: vi.fn(async () => h.state.templates),
  createTemplate: vi.fn(async (branchId: string, input: any) => {
    h.state.calls.create.push([branchId, input])
    const row = {
      id: `tpl-new-${h.state.templates.length + 1}`,
      branch_id: branchId,
      is_active: true,
      ...input,
    }
    h.state.templates = [...h.state.templates, row]
    return row
  }),
  updateTemplate: vi.fn(async (id: string, patch: any) => {
    h.state.calls.update.push([id, patch])
  }),
  deleteTemplate: vi.fn(async (id: string) => {
    h.state.calls.remove.push(id)
    // server-side soft delete: list hides inactive rows on reload
    h.state.templates = h.state.templates.map((t) =>
      t.id === id ? { ...t, is_active: false } : t,
    )
  }),
}))

// ---- fixtures ----

function tmpl(
  id: string,
  name: string,
  start: string,
  end: string,
  station: Station,
  target = 1,
  isActive = true,
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
    is_active: isActive,
  }
}

function resetState() {
  h.state.templates = [
    tmpl('t1', '早更', '09:00:00', '13:00:00', '樓面', 2),
    tmpl('t2', '通宵更', '22:00:00', '06:00:00', '收銀', 1),
  ]
  h.state.calls = { create: [], update: [], remove: [] }
}

beforeEach(() => {
  localStorage.removeItem('ifmp_flow_locale')
  resetState()
})

// ---- harness ----

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <TemplatesPage />
    </FlowLocaleProvider>,
  )
}

function findCard(id: string): HTMLElement {
  const el = screen
    .getAllByTestId('template-card')
    .find((n) => n.dataset.id === id)
  if (!el) throw new Error(`template card ${id} not found`)
  return el
}

// ---- tests ----

describe('Templates (Task 7 contract)', () => {
  it('renders active templates with duration preview and +1d overnight marker', async () => {
    renderPage()
    expect(await screen.findByText('早更')).toBeInTheDocument()
    expect(screen.getByText('通宵更')).toBeInTheDocument()
    expect(screen.getByText('22:00–06:00')).toBeInTheDocument()

    expect(within(findCard('t1')).getByText('4h')).toBeInTheDocument()
    const t2 = findCard('t2')
    expect(within(t2).getByText('8h')).toBeInTheDocument()
    expect(within(t2).getByText('+1d')).toBeInTheDocument()
    expect(within(t2).getByText(/收銀/)).toBeInTheDocument()
  })

  it('create dialog submits name/time/station/palette color/headcount via createTemplate', async () => {
    renderPage()
    await screen.findByText('早更')

    await userEvent.click(screen.getByRole('button', { name: '新增模板' }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.type(within(dialog).getByLabelText('名稱'), '夜更')
    const times = within(dialog).getAllByLabelText(/時間/) as HTMLInputElement[]
    fireEvent.change(times[0], { target: { value: '18:00' } })
    fireEvent.change(times[1], { target: { value: '22:00' } })
    await userEvent.selectOptions(within(dialog).getByLabelText('崗位'), '收銀')
    await userEvent.click(
      within(dialog).getByRole('button', { name: '#2f81f7' }),
    )
    fireEvent.change(within(dialog).getByLabelText('目標人數'), {
      target: { value: '2' },
    })

    const save = within(dialog).getByRole('button', { name: '儲存' })
    expect(save).toBeEnabled()
    await userEvent.click(save)

    await waitFor(() => expect(h.state.calls.create).toHaveLength(1))
    expect(h.state.calls.create[0][0]).toBe('b1')
    expect(h.state.calls.create[0][1]).toEqual({
      name: '夜更',
      start_time: '18:00',
      end_time: '22:00',
      station: '收銀',
      color: '#2f81f7',
      headcount_target: 2,
    })
    expect(await screen.findByText('夜更')).toBeInTheDocument()
  })

  it('delete asks for confirmation then calls deleteTemplate with the row id', async () => {
    renderPage()
    await screen.findByText('早更')

    await userEvent.click(
      within(findCard('t1')).getByRole('button', { name: '刪除' }),
    )
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('刪除此模板？現有更段不受影響。')

    await userEvent.click(within(dialog).getByRole('button', { name: '刪除' }))
    await waitFor(() => expect(h.state.calls.remove).toEqual(['t1']))
    expect(await screen.findByText('通宵更')).toBeInTheDocument()
    expect(screen.queryByText('早更')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hides inactive templates from the list', async () => {
    h.state.templates = [
      tmpl('t1', '早更', '09:00', '13:00', '樓面'),
      tmpl('t9', '舊更', '10:00', '14:00', '試衣', 1, false),
    ]
    renderPage()
    expect(await screen.findByText('早更')).toBeInTheDocument()
    expect(screen.queryByText('舊更')).toBeNull()
    expect(screen.getAllByTestId('template-card')).toHaveLength(1)
  })
})
