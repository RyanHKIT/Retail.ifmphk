import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { RetailThemeProvider } from '@/context/RetailThemeContext'
import { isDispatched, listDispatched } from '@/lib/dispatchStore'
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
    <RetailLocaleProvider>
      <RetailThemeProvider>
        <RetailFilterProvider>
          <ServiceGapPage />
        </RetailFilterProvider>
      </RetailThemeProvider>
    </RetailLocaleProvider>,
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
})
