import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { RetailThemeProvider } from '@/context/RetailThemeContext'
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
    <MemoryRouter>
      <RetailLocaleProvider>
        <RetailThemeProvider>
          <RetailFilterProvider>
            <OverviewPage />
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
})
