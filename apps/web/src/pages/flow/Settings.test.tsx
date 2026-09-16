import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { SettingsPage } from './Settings'

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => ({
    profile: { display_name: 'Pilot Manager', role: 'branch_manager' },
  }),
}))

afterEach(() => {
  localStorage.removeItem('flow-theme')
  localStorage.removeItem('ifmp_flow_locale')
})

function renderPage() {
  return render(
    <FlowLocaleProvider>
      <FlowThemeProvider>
        <SettingsPage />
      </FlowThemeProvider>
    </FlowLocaleProvider>,
  )
}

test('theme radios write flow-theme and keep branch read-only', async () => {
  const user = userEvent.setup()
  renderPage()
  expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument()
  expect(screen.getByText('I.T. 銅鑼灣')).toBeInTheDocument()
  await user.click(screen.getByRole('radio', { name: '夜間' }))
  expect(localStorage.getItem('flow-theme')).toBe('night')
  expect(screen.getByTestId('settings-honesty')).toBeInTheDocument()
})

test('language toggle switches copy to English', async () => {
  const user = userEvent.setup()
  renderPage()
  await user.click(screen.getByTestId('settings-locale-toggle'))
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  expect(screen.getByText('I.T. Causeway Bay')).toBeInTheDocument()
  expect(localStorage.getItem('ifmp_flow_locale')).toBe('en')
})
