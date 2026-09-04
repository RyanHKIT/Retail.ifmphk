import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { api } from '@/api/retail'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { loadRuleOverrides } from '@/lib/settingsStore'
import { SettingsPage } from './Settings'

function renderSettings() {
  return render(
    <RetailLocaleProvider>
      <RetailFilterProvider>
        <SettingsPage />
      </RetailFilterProvider>
    </RetailLocaleProvider>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
  vi.restoreAllMocks()
})

test('save and reset persist dwell_threshold_sec and first_contact_sec', async () => {
  renderSettings()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument()
  })
  fireEvent.change(screen.getByLabelText('服務缺口停留閾值（秒）'), { target: { value: '180' } })
  fireEvent.change(screen.getByLabelText('首次接觸 SLA（秒）'), { target: { value: '45' } })
  fireEvent.click(screen.getByRole('button', { name: '儲存至本機' }))
  expect(loadRuleOverrides()).toMatchObject({
    dwell_threshold_sec: 180,
    first_contact_sec: 45,
  })
  expect(screen.getByRole('button', { name: '已儲存' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '恢復預設' }))
  expect(loadRuleOverrides()).toBeNull()
  expect(screen.getByLabelText('服務缺口停留閾值（秒）')).toHaveValue(120)
  expect(screen.getByLabelText('首次接觸 SLA（秒）')).toHaveValue(90)
})

test('failed settings load shows 繁中 retry instead of hanging', async () => {
  vi.spyOn(api, 'settings').mockRejectedValue(new Error('network'))
  renderSettings()
  expect(await screen.findByRole('button', { name: '重試' })).toBeInTheDocument()
  expect(screen.getByText('暫時無法載入，請稍後再試')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '設定' })).not.toBeInTheDocument()
})
