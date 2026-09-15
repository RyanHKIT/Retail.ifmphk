import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { test, expect, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
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

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/flow']}>
      <FlowLocaleProvider>
        <FlowAuthProvider>
          <FlowShell />
        </FlowAuthProvider>
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
