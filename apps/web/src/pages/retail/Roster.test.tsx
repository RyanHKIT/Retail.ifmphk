import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { RetailThemeProvider } from '@/context/RetailThemeContext'
import { loadSuggestedOverride } from '@/lib/rosterStore'
import { RosterPage } from './Roster'

function renderRoster() {
  return render(
    <RetailLocaleProvider>
      <RetailThemeProvider>
        <RetailFilterProvider>
          <RosterPage />
        </RetailFilterProvider>
      </RetailThemeProvider>
    </RetailLocaleProvider>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
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

test('shows 依門禁客流建議人手 and 繁中 series labels', async () => {
  renderRoster()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '排班建議' })).toBeInTheDocument()
  })
  expect(screen.getByText('依門禁客流建議人手')).toBeInTheDocument()
  expect(document.querySelector('[data-source="counter"]')).toHaveTextContent('門禁計數')
  expect(screen.getByRole('columnheader', { name: '建議' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: '應到' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: '實測' })).toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: '進店' })).toBeInTheDocument()
})

test('bump plus/minus, save, and reset persist via rosterStore', async () => {
  renderRoster()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '排班建議' })).toBeInTheDocument()
  })

  const firstRow = screen.getAllByRole('row')[1]
  expect(firstRow).toBeTruthy()
  const plus = within(firstRow!).getByRole('button', { name: '+' })
  fireEvent.click(plus)
  expect(within(firstRow!).getAllByRole('cell')[4]).toHaveTextContent('6')

  fireEvent.click(screen.getByRole('button', { name: '儲存至本機' }))
  expect(loadSuggestedOverride()?.[0]).toBe(6)
  expect(screen.getByRole('button', { name: '已儲存' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '重置' }))
  expect(loadSuggestedOverride()).toBeNull()
  expect(within(firstRow!).getAllByRole('cell')[4]).toHaveTextContent('5')
})

test('shows 需求 and 週更表 section tabs', async () => {
  renderRoster()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '排班建議' })).toBeInTheDocument()
  })
  expect(screen.getByRole('tab', { name: '需求' })).toBeInTheDocument()
  expect(screen.getByRole('tab', { name: '週更表' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('tab', { name: '週更表' }))
  expect(screen.getByText(/週起 2026-09-01/)).toBeInTheDocument()
  expect(screen.getByText('樓面')).toBeInTheDocument()
  expect(screen.getByText('試衣')).toBeInTheDocument()
  expect(screen.getByText('收銀')).toBeInTheDocument()
})
