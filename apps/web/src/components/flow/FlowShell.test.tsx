import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, test, expect, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { FlowAuthProvider } from '@/context/FlowAuthContext'
import { FlowShell } from './FlowShell'

vi.mock('@/lib/supabase', () => ({
  createFlowSupabase: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}))

beforeEach(() => {
  localStorage.clear()
  localStorage.removeItem('flow-theme')
})

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/flow']}>
      <FlowLocaleProvider>
        <FlowThemeProvider>
          <FlowAuthProvider>
            <FlowShell />
          </FlowAuthProvider>
        </FlowThemeProvider>
      </FlowLocaleProvider>
    </MemoryRouter>,
  )
}

test('shell shows product name and roster link', async () => {
  renderShell()

  expect(screen.getAllByText('IFMP Retail').length).toBeGreaterThan(0)
  expect(await screen.findByRole('link', { name: '排班' })).toHaveAttribute('href', '/flow/roster')
  expect(screen.getByText('I.T. 銅鑼灣')).toBeInTheDocument()
})

test('top bar locale toggle switches site label to English', async () => {
  const userEvent = (await import('@testing-library/user-event')).default
  const user = userEvent.setup()
  renderShell()

  expect(screen.getByText('I.T. 銅鑼灣')).toBeInTheDocument()
  await user.click(screen.getByTestId('flow-locale-toggle'))
  expect(screen.getByText('I.T. Causeway Bay')).toBeInTheDocument()
})

test('settings link is labeled and points at /flow/settings', async () => {
  renderShell()
  expect(await screen.findByRole('link', { name: '設定' })).toHaveAttribute(
    'href',
    '/flow/settings',
  )
})

test('theme toggle sets data-theme night and localStorage', async () => {
  const userEvent = (await import('@testing-library/user-event')).default
  const user = userEvent.setup()
  renderShell()
  const root = await screen.findByTestId('flow-app')
  expect(root).toHaveAttribute('data-theme', 'light')
  await user.click(screen.getByTestId('flow-theme-toggle'))
  expect(root).toHaveAttribute('data-theme', 'night')
  expect(localStorage.getItem('flow-theme')).toBe('night')
})

test('nav brand pairs the IFMP mark with the product word', async () => {
  renderShell()

  // Decorative, because the wordmark text beside it already names the product.
  expect(await screen.findByTestId('brand-mark')).toHaveAttribute('alt', '')
  expect(screen.getByText('零售營運主控台')).toBeInTheDocument()
})

test('collapsing the rail keeps the mark and drops the words', async () => {
  const userEvent = (await import('@testing-library/user-event')).default
  const user = userEvent.setup()
  renderShell()

  await user.click(screen.getByTestId('flow-nav-collapse'))

  // The mark is the whole brand at 64px; the words would not fit, and the nav
  // element's aria-label carries the name instead.
  expect(screen.getByRole('navigation', { name: 'IFMP Retail' })).toBeInTheDocument()
  expect(screen.getByTestId('brand-mark')).toBeInTheDocument()
  expect(screen.queryByText('IFMP Retail')).not.toBeInTheDocument()
  expect(screen.queryByText('零售營運主控台')).not.toBeInTheDocument()
})
