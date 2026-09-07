import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DemoSpineProvider } from '@/context/DemoSpineContext'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { RetailThemeProvider } from '@/context/RetailThemeContext'
import { JourneyPage } from './Journey'

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

function renderJourney() {
  return render(
    <MemoryRouter initialEntries={['/retail/journey']}>
      <RetailLocaleProvider>
        <RetailThemeProvider>
          <RetailFilterProvider>
            <DemoSpineProvider>
              <Routes>
                <Route path="/retail/journey" element={<JourneyPage />} />
                <Route path="/retail/service-gap" element={<div>gap-landing</div>} />
              </Routes>
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

test('heatmap zones are buttons and click navigates to service-gap?zone=', async () => {
  renderJourney()
  const zone = await screen.findByRole('button', { name: '試衣間' })
  expect(zone).toHaveClass('is-clickable')
  expect(document.querySelector('.floor-plan--hero')).toBeTruthy()
  expect(document.querySelector('.journey-click-hint')).toHaveTextContent('點選區域進入該區服務缺口')
  fireEvent.click(zone)
  expect(await screen.findByText('gap-landing')).toBeInTheDocument()
})

test('SpineNav on Journey still points at the next beat', async () => {
  renderJourney()
  const next = await screen.findByRole('link', { name: '下一步' })
  expect(next).toHaveAttribute('href', '/retail/service-gap')
})
