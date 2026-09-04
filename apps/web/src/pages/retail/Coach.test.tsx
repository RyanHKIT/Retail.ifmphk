import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { RetailFilterProvider } from '@/context/RetailFilterContext'
import { RetailLocaleProvider } from '@/context/RetailLocaleContext'
import { saveRuleOverrides } from '@/lib/settingsStore'
import { CoachPage } from './Coach'

const mockDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../public/mock/retail',
)

function stubRetailFetch() {
  vi.stubGlobal('fetch', async (input: RequestInfo) => {
    const file = String(input).split('/').pop() ?? ''
    const body = readFileSync(resolve(mockDir, file), 'utf-8')
    return { ok: true, json: async () => JSON.parse(body) } as Response
  })
}

function renderCoach() {
  return render(
    <RetailLocaleProvider>
      <RetailFilterProvider>
        <CoachPage />
      </RetailFilterProvider>
    </RetailLocaleProvider>,
  )
}

beforeEach(() => {
  sessionStorage.clear()
  stubRetailFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('zone filter and VL summary list', async () => {
  renderCoach()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '服務教練' })).toBeInTheDocument()
  })
  const select = screen.getByLabelText('區域')
  expect(select).toHaveTextContent('全部')
  expect(select).toHaveTextContent('試衣間')
  expect(document.querySelectorAll('.vl-summary-list li').length).toBeGreaterThan(0)
  expect(screen.getByText('2 位顧客在試衣間外等候超過 2 分鐘，無員工接近')).toBeInTheDocument()

  fireEvent.change(select, { target: { value: 'fitting_room' } })
  const cards = [...document.querySelectorAll('.coach-card')]
  expect(cards.length).toBeGreaterThan(0)
  expect(cards.every((c) => c.textContent?.includes('試衣間'))).toBe(true)
  expect(cards.some((c) => c.textContent?.includes('貨架 A'))).toBe(false)
})

test('subtitle reads dwell and first_contact from settingsStore', async () => {
  saveRuleOverrides({
    dwell_threshold_sec: 180,
    staff_proximity_m: 3,
    first_contact_sec: 45,
    overstaff_multiplier: 1.5,
  })
  renderCoach()
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: '服務教練' })).toBeInTheDocument()
  })
  expect(screen.getByText(/≥180s/)).toBeInTheDocument()
  expect(screen.getByText(/首次接觸 45s/)).toBeInTheDocument()
})

test('failed fetch shows 繁中 retry instead of hanging', async () => {
  vi.stubGlobal('fetch', async () => {
    throw new Error('network')
  })
  renderCoach()
  expect(await screen.findByRole('button', { name: '重試' })).toBeInTheDocument()
  expect(screen.getByText('暫時無法載入，請稍後再試')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: '服務教練' })).not.toBeInTheDocument()
})
