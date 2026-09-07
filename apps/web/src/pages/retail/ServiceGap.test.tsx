import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DemoSpineProvider } from '@/context/DemoSpineContext'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { RetailThemeProvider } from '@/context/RetailThemeContext'
import { isDispatched, listDispatched } from '@/lib/dispatchStore'
import { saveRuleOverrides } from '@/lib/settingsStore'
import { ServiceGapPage } from './ServiceGap'

const mockDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../public/mock/retail',
)

function stubRetailFetch() {
  vi.stubGlobal('fetch', async (input: RequestInfo) => {
    const file = String(input).split('/').pop() ?? ''
    const body = readFileSync(resolve(mockDir, file), 'utf-8')
    return { ok: true, json: async () => JSON.parse(body) } as Response
  })
}

function renderGap() {
  return render(
    <MemoryRouter initialEntries={['/retail/service-gap']}>
      <RetailLocaleProvider>
        <RetailThemeProvider>
          <RetailFilterProvider>
            <DemoSpineProvider>
              <ServiceGapPage />
            </DemoSpineProvider>
          </RetailFilterProvider>
        </RetailThemeProvider>
      </RetailLocaleProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  stubRetailFetch()
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('shows ≥2 min rule and one-click 已調度', async () => {
  renderGap()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '服務缺口' })).toBeInTheDocument()
  })
  expect(screen.getByText(/規則：等候 ≥ 2 分鐘/)).toBeInTheDocument()

  const buttons = await screen.findAllByRole('button', { name: '調度' })
  expect(buttons.length).toBeGreaterThan(0)
  fireEvent.click(buttons[0])

  await waitFor(() => {
    expect(screen.getAllByRole('button', { name: '已調度' }).length).toBeGreaterThan(0)
  })
  const firstId = JSON.parse(readFileSync(resolve(mockDir, 'gap-events.json'), 'utf-8'))
    .data.items[0].gap_id as string
  expect(isDispatched(firstId)).toBe(true)
  expect(listDispatched()).toContain(firstId)

  const firstZone = JSON.parse(readFileSync(resolve(mockDir, 'gap-events.json'), 'utf-8'))
    .data.items[0].zone_id as string
  const coach = screen.getByRole('link', { name: '去教練' })
  const roster = screen.getByRole('link', { name: '去排班' })
  expect(coach).toHaveAttribute('href', `/retail/coach?gap=${firstId}&zone=${firstZone}`)
  expect(roster).toHaveAttribute('href', `/retail/roster?zone=${firstZone}`)
})

test('reads dwell and first_contact display copy from settingsStore', async () => {
  saveRuleOverrides({
    dwell_threshold_sec: 180,
    staff_proximity_m: 3,
    first_contact_sec: 45,
    overstaff_multiplier: 1.5,
  })
  renderGap()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '服務缺口' })).toBeInTheDocument()
  })
  expect(screen.getByText(/規則：等候 ≥ 3 分鐘/)).toBeInTheDocument()
  expect(screen.getByText(/首次接觸 SLA 45s/)).toBeInTheDocument()
})
