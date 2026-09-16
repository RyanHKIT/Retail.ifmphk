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

test('roster keys round-trip zh-HK ↔ en', async () => {
  // Prior tests may have persisted 'en' (localStorage is shared across tests
  // in the same jsdom file); this test asserts the zh-HK defaults first.
  localStorage.removeItem('ifmp_flow_locale')
  function RosterProbe() {
    const { t, setLocale } = useFlowLocale()
    return (
      <div>
        <span>{t('roster.publish')}</span>
        <span>{t('roster.conflict.double_booking')}</span>
        <button type="button" onClick={() => setLocale('en')}>
          EN
        </button>
      </div>
    )
  }
  render(
    <FlowLocaleProvider>
      <RosterProbe />
    </FlowLocaleProvider>,
  )
  expect(screen.getByText('發佈')).toBeInTheDocument()
  expect(screen.getByText('雙更衝突')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'EN' }))
  expect(screen.getByText('Publish')).toBeInTheDocument()
  expect(screen.getByText('Double booking')).toBeInTheDocument()
})
