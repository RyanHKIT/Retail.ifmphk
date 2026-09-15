import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { test, expect } from 'vitest'
import { FlowLocaleProvider, useFlowLocale } from './FlowLocaleContext'

function Probe() {
  const { t, setLocale } = useFlowLocale()
  return (
    <div>
      <span>{t('nav.overview')}</span>
      <button type="button" onClick={() => setLocale('en')}>
        EN
      </button>
    </div>
  )
}

test('toggles overview label to English', async () => {
  render(
    <FlowLocaleProvider>
      <Probe />
    </FlowLocaleProvider>,
  )
  expect(screen.getByText('主控台')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'EN' }))
  expect(screen.getByText('Overview')).toBeInTheDocument()
})

test('falls back to key when translation missing', () => {
  function MissingProbe() {
    const { t } = useFlowLocale()
    return <span>{t('missing.key')}</span>
  }
  render(
    <FlowLocaleProvider>
      <MissingProbe />
    </FlowLocaleProvider>,
  )
  expect(screen.getByText('missing.key')).toBeInTheDocument()
})
