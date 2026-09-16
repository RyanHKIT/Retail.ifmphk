import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import { FlowThemeProvider, useFlowTheme } from './FlowThemeContext'

afterEach(() => {
  localStorage.removeItem('flow-theme')
})

function Probe() {
  const { theme, setTheme } = useFlowTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme('night')}>
        night
      </button>
    </div>
  )
}

test('defaults to light and persists night', async () => {
  const user = userEvent.setup()
  render(
    <FlowThemeProvider>
      <Probe />
    </FlowThemeProvider>,
  )
  expect(screen.getByTestId('theme')).toHaveTextContent('light')
  await user.click(screen.getByText('night'))
  expect(screen.getByTestId('theme')).toHaveTextContent('night')
  expect(localStorage.getItem('flow-theme')).toBe('night')
})

test('reads persisted light and ignores invalid values', async () => {
  localStorage.setItem('flow-theme', 'invalid')
  render(
    <FlowThemeProvider>
      <Probe />
    </FlowThemeProvider>,
  )
  expect(screen.getByTestId('theme')).toHaveTextContent('light')
})
