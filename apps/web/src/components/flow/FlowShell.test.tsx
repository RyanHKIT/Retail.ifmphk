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

test('nav brand pairs the high-contrast mark with the product word', async () => {
  renderShell()

  // The rail uses the derivative mark, not the authentic emblem: against this
  // white panel the authentic artwork only gets 55.5% of its pixels past the
  // 3:1 bar, the derivative 99.8%. Asserting the filename is the point of the
  // test -- a silent revert to `mark.png` would otherwise pass unnoticed.
  const mark = await screen.findByTestId('brand-hc-mark')
  // Decorative, because the wordmark text beside it already names the product.
  expect(mark).toHaveAttribute('alt', '')
  expect(mark).toHaveAttribute('src', '/brand/mark-hc-light.png')
  expect(screen.getByText('零售營運主控台')).toBeInTheDocument()
})

test('rail mark swaps to the dark-surface variant with the theme', async () => {
  const userEvent = (await import('@testing-library/user-event')).default
  const user = userEvent.setup()
  renderShell()

  expect(await screen.findByTestId('brand-hc-mark')).toHaveAttribute(
    'src',
    '/brand/mark-hc-light.png',
  )

  await user.click(screen.getByTestId('flow-theme-toggle'))

  expect(screen.getByTestId('brand-hc-mark')).toHaveAttribute(
    'src',
    '/brand/mark-hc-dark.png',
  )
})

test('collapsing the rail keeps the mark and drops the words', async () => {
  const userEvent = (await import('@testing-library/user-event')).default
  const user = userEvent.setup()
  renderShell()

  await user.click(screen.getByTestId('flow-nav-collapse'))

  // The mark is the whole brand at 64px; the words would not fit, and the nav
  // element's aria-label carries the name instead.
  expect(screen.getByRole('navigation', { name: 'IFMP Retail' })).toBeInTheDocument()
  expect(screen.getByTestId('brand-hc-mark')).toBeInTheDocument()
  expect(screen.queryByText('IFMP Retail')).not.toBeInTheDocument()
  expect(screen.queryByText('零售營運主控台')).not.toBeInTheDocument()
})
