import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { expect, test } from 'vitest'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { RetailThemeProvider } from '@/context/RetailThemeContext'
import { RetailShell } from './RetailShell'

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/retail']}>
      <RetailLocaleProvider>
        <RetailThemeProvider>
          <RetailFilterProvider>
            <Routes>
              <Route path="/retail" element={<RetailShell />}>
                <Route index element={<div>outlet</div>} />
              </Route>
            </Routes>
          </RetailFilterProvider>
        </RetailThemeProvider>
      </RetailLocaleProvider>
    </MemoryRouter>,
  )
}

test('hides shared-sample banner on primary demo store', () => {
  renderShell()
  expect(screen.queryByText('示範數據共用樣本；切換門店僅切換標籤')).not.toBeInTheDocument()
})

test('shows 繁中 sample-sharing banner when store is not primary demo store', () => {
  renderShell()
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'it-tst' } })
  expect(screen.getByText('示範數據共用樣本；切換門店僅切換標籤')).toBeInTheDocument()
})

test('nav uses SVG glyphs instead of emoji or unicode icons', () => {
  const { container } = renderShell()
  const nav = container.querySelector('aside nav')
  expect(nav).toBeTruthy()
  expect(nav?.querySelectorAll('.nav-icon svg').length).toBe(9)
  expect(nav?.textContent).not.toMatch(/[◉⇄◎👤⚠☰★⚡⚙]/)
})

test('chrome copy has no zip emoji residue', () => {
  renderShell()
  expect(screen.getByText('3 條告警')).toBeInTheDocument()
  expect(screen.getByText('返回 IFMP 首頁')).toBeInTheDocument()
  expect(screen.queryByText(/🔔|🌙|☀️|←/)).not.toBeInTheDocument()
})

test('sidebar groups evidence and action nav', () => {
  renderShell()
  expect(screen.getByText('現場')).toBeInTheDocument()
  expect(screen.getByText('行動')).toBeInTheDocument()
  expect(screen.getByText('設施')).toBeInTheDocument()
})
