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
import { markDispatched } from '@/lib/dispatchStore'
import { OverviewPage } from './Overview'

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

function renderOverview() {
  return render(
    <MemoryRouter initialEntries={['/retail']}>
      <RetailLocaleProvider>
        <RetailThemeProvider>
          <RetailFilterProvider>
            <DemoSpineProvider>
              <OverviewPage />
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

test('Overview shows dual-source hint strip with counter and camera chips', async () => {
  renderOverview()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '總覽看板' })).toBeInTheDocument()
  })
  const strip = document.querySelector('.source-hint-strip')
  expect(strip).toBeTruthy()
  expect(strip).toHaveTextContent('雙源證據')
  expect(strip?.querySelector('[data-source="counter"]')).toHaveTextContent('門禁計數')
  expect(strip?.querySelector('[data-source="camera"]')).toHaveTextContent('店內攝像')
})

test('pending dispatch CTA links to /retail/service-gap', async () => {
  renderOverview()
  const cta = await screen.findByRole('link', { name: '去服務缺口' })
  expect(cta).toHaveAttribute('href', '/retail/service-gap')
  expect(screen.getByText('待調度服務缺口')).toBeInTheDocument()
  expect(screen.getByText(/尚有 7 則未標記調度/)).toBeInTheDocument()
  expect(document.querySelector('.overview-next-action')).toBeTruthy()
  expect(document.querySelector('.overview-situation')).toBeTruthy()
  expect(document.querySelector('.situation-cell--lead')).toBeTruthy()
  expect(document.querySelectorAll('.overview-situation .kpi-card').length).toBe(0)
  expect(document.querySelector('.overview-kicker')).toBeNull()
})

test('hides dispatch CTA when every gap is already dispatched', async () => {
  const envelope = JSON.parse(
    readFileSync(resolve(mockDir, 'gap-events.json'), 'utf-8'),
  ) as { data: { items: { gap_id: string; zone_name: string }[] } }
  const map: Record<string, { gap_id: string; zone_name: string; dispatched_at: string }> = {}
  for (const gap of envelope.data.items) {
    map[gap.gap_id] = {
      gap_id: gap.gap_id,
      zone_name: gap.zone_name,
      dispatched_at: '2026-09-02T15:00:00+08:00',
    }
  }
  sessionStorage.setItem('ifmp_retail_dispatches', JSON.stringify(map))

  renderOverview()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '總覽看板' })).toBeInTheDocument()
  })
  expect(screen.queryByRole('link', { name: '去服務缺口' })).not.toBeInTheDocument()
  expect(document.querySelector('.overview-next-action')).toBeNull()
  const next = screen.getByRole('link', { name: '下一步' })
  expect(next).toHaveAttribute('href', '/retail/footfall')
})

test('retail-dispatch event recomputes pending count without reload', async () => {
  renderOverview()
  expect(await screen.findByText(/尚有 7 則未標記調度/)).toBeInTheDocument()
  markDispatched('gap_20260902_142215_001', '試衣間')
  await waitFor(() => {
    expect(screen.getByText(/尚有 6 則未標記調度/)).toBeInTheDocument()
  })
})

test('failed fetch shows 繁中 retry and recovers on click', async () => {
  let fail = true
  vi.stubGlobal('fetch', async (input: RequestInfo) => {
    if (fail) throw new Error('network')
    const file = String(input).split('/').pop() ?? ''
    const body = readFileSync(resolve(mockDir, file), 'utf-8')
    return { ok: true, json: async () => JSON.parse(body) } as Response
  })
  renderOverview()
  expect(await screen.findByRole('button', { name: '重試' })).toBeInTheDocument()
  expect(screen.getByText('暫時無法載入，請稍後再試')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '總覽看板' })).not.toBeInTheDocument()
  fail = false
  fireEvent.click(screen.getByRole('button', { name: '重試' }))
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '總覽看板' })).toBeInTheDocument()
  })
})
