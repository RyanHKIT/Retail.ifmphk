import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import * as retailApi from '@/api/retail'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { RetailThemeProvider } from '@/context/RetailThemeContext'
import { EnergyPage } from './Energy'

function renderEnergy() {
  return render(
    <RetailLocaleProvider>
      <RetailThemeProvider>
        <RetailFilterProvider>
          <EnergyPage />
        </RetailFilterProvider>
      </RetailThemeProvider>
    </RetailLocaleProvider>,
  )
}

beforeEach(() => {
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

test('shows IoT SourceChip and honesty banner when site has no control', async () => {
  renderEnergy()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'IoT 溫度與能源管理' })).toBeInTheDocument()
  })
  expect(document.querySelector('[data-source="iot"]')).toHaveTextContent('IoT')
  expect(screen.getByText('有場地控制權方可執行；示範僅顯示建議')).toBeInTheDocument()
  expect(screen.getByText('客流聯動節能規則')).toBeInTheDocument()
})

test('failed energy load shows 繁中 retry instead of hanging', async () => {
  const spy = vi.spyOn(retailApi, 'fetchMockWithMeta').mockRejectedValue(new Error('network'))
  try {
    renderEnergy()
    expect(await screen.findByRole('button', { name: '重試' })).toBeInTheDocument()
    expect(screen.getByText('暫時無法載入，請稍後再試')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'IoT 溫度與能源管理' })).not.toBeInTheDocument()
  } finally {
    spy.mockRestore()
  }
})
