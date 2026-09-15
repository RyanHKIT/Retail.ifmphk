import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { test, expect, vi, beforeEach } from 'vitest'
import { FlowAuthProvider, useFlowAuth } from '@/context/FlowAuthContext'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { RequireManager } from '@/components/flow/RequireManager'
import { LoginPage } from './Login'

const signInWithPassword = vi.fn()
const signOutMock = vi.fn()
const getSession = vi.fn()
const onAuthStateChange = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createFlowSupabase: () => ({
    auth: {
      getSession,
      onAuthStateChange,
      signInWithPassword,
      signOut: signOutMock,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: 'p1',
              email: 'manager.cwb@ifmphk.com',
              display_name: 'CWB Manager',
              role: 'branch_manager',
            },
            error: null,
          }),
        }),
      }),
    }),
  }),
}))

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/flow/login']}>
      <FlowLocaleProvider>
        <FlowAuthProvider>
          <Routes>
            <Route path="/flow/login" element={<LoginPage />} />
            <Route path="/flow" element={<RequireManager />}>
              <Route index element={<div>FLOW HOME</div>} />
            </Route>
          </Routes>
        </FlowAuthProvider>
      </FlowLocaleProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  signInWithPassword.mockReset()
  getSession.mockResolvedValue({ data: { session: null } })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
})

test('successful sign-in navigates to /flow', async () => {
  signInWithPassword.mockResolvedValue({
    data: { session: { user: { id: 'p1' } } },
    error: null,
  })

  renderLogin()

  await userEvent.type(screen.getByTestId('login-email'), 'manager.cwb@ifmphk.com')
  await userEvent.type(screen.getByTestId('login-password'), 'secret123')
  await userEvent.click(screen.getByTestId('login-submit'))

  expect(signInWithPassword).toHaveBeenCalledWith({
    email: 'manager.cwb@ifmphk.com',
    password: 'secret123',
  })
  expect(await screen.findByText('FLOW HOME')).toBeInTheDocument()
})

test('failed sign-in shows bilingual error and stays on login', async () => {
  signInWithPassword.mockResolvedValue({
    data: { session: null },
    error: { message: 'Invalid login credentials' },
  })

  renderLogin()

  await userEvent.type(screen.getByTestId('login-email'), 'manager.cwb@ifmphk.com')
  await userEvent.type(screen.getByTestId('login-password'), 'wrong')
  await userEvent.click(screen.getByTestId('login-submit'))

  expect(await screen.findByRole('alert')).toHaveTextContent('電郵或密碼不正確，請重試。')
  expect(screen.queryByText('FLOW HOME')).not.toBeInTheDocument()
})

test('empty submit shows required error without calling supabase', async () => {
  renderLogin()

  await userEvent.click(screen.getByTestId('login-submit'))

  expect(await screen.findByRole('alert')).toHaveTextContent('請輸入電郵及密碼。')
  expect(signInWithPassword).not.toHaveBeenCalled()
})

test('RequireManager redirects unauthenticated users to login', async () => {
  render(
    <MemoryRouter initialEntries={['/flow']}>
      <FlowLocaleProvider>
        <FlowAuthProvider>
          <Routes>
            <Route path="/flow/login" element={<div>LOGIN PAGE</div>} />
            <Route path="/flow" element={<RequireManager />}>
              <Route index element={<div>FLOW HOME</div>} />
            </Route>
          </Routes>
        </FlowAuthProvider>
      </FlowLocaleProvider>
    </MemoryRouter>,
  )

  expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
})
