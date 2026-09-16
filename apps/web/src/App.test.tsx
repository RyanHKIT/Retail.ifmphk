// The retail demo was removed in favour of /flow. Old /retail links must keep
// working by redirecting rather than rendering a blank page.

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, test, vi } from 'vitest'
import App from './App'

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

test('legacy /retail links redirect to /flow', async () => {
  render(
    <MemoryRouter initialEntries={['/retail']}>
      <App />
    </MemoryRouter>,
  )

  // /flow is gated by auth, so reaching the flow login screen proves the
  // redirect resolved to the flow surface rather than an empty route.
  expect(await screen.findByTestId('login-submit')).toBeInTheDocument()
})

test('the root path goes straight to the product, not the dev scaffold', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )

  // /flow is gated by auth, so the login screen proves the root resolved to the
  // product rather than rendering the internal scaffold page.
  expect(await screen.findByTestId('login-submit')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Frontend Next' })).not.toBeInTheDocument()
})

test('the retained scaffold page renders and no longer links to /retail', () => {
  render(
    <MemoryRouter initialEntries={['/home']}>
      <App />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Frontend Next' })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /零售營運分析 Demo/ })).not.toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: /pilot/ }).length).toBeGreaterThan(0)
})

test('an unmatched top-level path reaches the flow surface, not a blank page', async () => {
  render(
    <MemoryRouter initialEntries={['/flwo']}>
      <App />
    </MemoryRouter>,
  )

  // /flow is gated by auth, so the login screen proves the catch-all resolved
  // to the product rather than rendering an empty document.
  expect(await screen.findByTestId('login-submit')).toBeInTheDocument()
})
