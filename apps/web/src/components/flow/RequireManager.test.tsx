import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, vi } from 'vitest'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { RequireManager } from './RequireManager'

/**
 * The gate's loading state is a legitimate placement for the brand mark, and it
 * sits on the same light shell background as the nav rail. These tests pin that
 * it uses the high-contrast derivative rather than the authentic artwork, whose
 * 3:1 coverage on that background is 53.3%.
 */
const authState = {
  session: null as unknown,
  profile: null as unknown,
  loading: true,
  resolvingProfile: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
}

vi.mock('@/context/FlowAuthContext', () => ({
  useFlowAuth: () => authState,
}))

function renderGate() {
  return render(
    <MemoryRouter initialEntries={['/flow']}>
      <FlowLocaleProvider>
        <FlowThemeProvider>
          <RequireManager />
        </FlowThemeProvider>
      </FlowLocaleProvider>
    </MemoryRouter>,
  )
}

test('the loading gate shows the high-contrast mark, not the authentic artwork', () => {
  authState.loading = true
  renderGate()

  const mark = screen.getByTestId('brand-hc-mark')
  // Decorative: the product name is already in the document title.
  expect(mark).toHaveAttribute('alt', '')
  expect(mark).toHaveAttribute('src', '/brand/mark-hc-light.png')
  // The authentic emblem must not be rendered here.
  expect(screen.queryByTestId('brand-mark')).not.toBeInTheDocument()
  expect(screen.getByText('載入中…')).toBeInTheDocument()
})

test('the loading gate switches ink with the theme', () => {
  authState.loading = true
  localStorage.setItem('flow-theme', 'night')
  renderGate()

  expect(screen.getByTestId('brand-hc-mark')).toHaveAttribute(
    'src',
    '/brand/mark-hc-dark.png',
  )
  localStorage.removeItem('flow-theme')
})
