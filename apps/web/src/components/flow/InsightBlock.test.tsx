// InsightBlock states.
//
// The block is the one place in the app where machine-written text is presented
// as a conclusion, so the states matter as much as the happy path: a manager
// must not see a confident-looking claim when generation failed, and the block
// must vanish entirely when the deployment has no AI configured.

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { InsightBlock } from './InsightBlock'
import { AiRequestError, AiUnavailableError, type InsightResponse } from '@/lib/ai/api'

const h = vi.hoisted(() => ({
  enabled: true,
  calls: [] as { tabKey: string; force: boolean }[],
  response: null as InsightResponse | null,
  error: null as Error | null,
}))

vi.mock('@/lib/footfall/api', () => ({
  hkToday: () => '2026-09-16',
  FLOW_DEMO_DAY: '2026-09-16',
}))

vi.mock('@/lib/ai/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ai/api')>('@/lib/ai/api')
  return {
    ...actual,
    isAiEnabled: () => h.enabled,
    fetchInsight: vi.fn(async (options: { tabKey: string; force?: boolean }) => {
      h.calls.push({ tabKey: options.tabKey, force: options.force === true })
      if (h.error) throw h.error
      return h.response
    }),
  }
})

function insightResponse(overrides: Partial<InsightResponse['insight']> = {}): InsightResponse {
  return {
    insight: {
      headline: '最旺時段為 14:00，佔全日 18.5%。',
      observations: ['14:00 較上週同日高出 12%。', '客流集中於午後。'],
      action: '考慮於 14:00 前後加派人手。',
      confidence: 'normal',
      ...overrides,
    },
    model: 'qwen3.7-flash-2026-07-15',
    generatedAt: '2026-09-16T10:00:00Z',
    cached: true,
  }
}

function renderBlock(tabKey: 'overview' | 'journey' = 'overview') {
  return render(
    <FlowLocaleProvider>
      <InsightBlock tabKey={tabKey} />
    </FlowLocaleProvider>,
  )
}

beforeEach(() => {
  localStorage.removeItem('ifmp_flow_locale')
  h.enabled = true
  h.calls = []
  h.response = insightResponse()
  h.error = null
})

test('renders headline, observations, action and the model label', async () => {
  renderBlock()

  expect(await screen.findByTestId('ai-insight-body')).toBeInTheDocument()
  expect(screen.getByText('最旺時段為 14:00，佔全日 18.5%。')).toBeInTheDocument()
  expect(screen.getByText('14:00 較上週同日高出 12%。')).toBeInTheDocument()
  expect(screen.getByText('考慮於 14:00 前後加派人手。')).toBeInTheDocument()
  expect(screen.getByText('qwen3.7-flash-2026-07-15')).toBeInTheDocument()
})

test('carries the not-measured disclaimer alongside the text', async () => {
  renderBlock()
  await screen.findByTestId('ai-insight-body')

  const block = screen.getByTestId('ai-insight')
  // The wording that stops the prose being read as a measurement reading.
  expect(block).toHaveTextContent('此段文字由系統自動生成，並非量測數據')
})

test('flags low confidence visibly rather than hiding it', async () => {
  h.response = insightResponse({ confidence: 'low' })
  renderBlock()

  expect(await screen.findByTestId('ai-insight-low-confidence')).toBeInTheDocument()
})

test('no low-confidence marker on a normal-confidence insight', async () => {
  renderBlock()
  await screen.findByTestId('ai-insight-body')
  expect(screen.queryByTestId('ai-insight-low-confidence')).toBeNull()
})

test('regenerate bypasses the server cache', async () => {
  const user = userEvent.setup()
  renderBlock()
  await screen.findByTestId('ai-insight-body')

  // First load is a cache-eligible read; the explicit regenerate must not be,
  // otherwise the control does nothing.
  expect(h.calls).toEqual([{ tabKey: 'overview', force: false }])

  await user.click(screen.getByTestId('ai-insight-refresh'))

  await waitFor(() => {
    expect(h.calls.at(-1)).toEqual({ tabKey: 'overview', force: true })
  })
})

test('shows an error with retry on failure, not a stale claim', async () => {
  h.error = new AiRequestError('UPSTREAM', 'boom')
  renderBlock()

  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('暫時無法產生分析。')
  expect(screen.queryByTestId('ai-insight-body')).toBeNull()
})

test('hides entirely when the deployment has no AI configured', async () => {
  h.enabled = false
  renderBlock()

  await waitFor(() => {
    expect(screen.queryByTestId('ai-insight')).toBeNull()
  })
})

test('hides when the server reports AI_NOT_CONFIGURED', async () => {
  h.error = new AiUnavailableError()
  renderBlock()

  await waitFor(() => {
    expect(screen.queryByTestId('ai-insight')).toBeNull()
  })
})

test('tagged with its tab so six blocks on one screen stay distinguishable', async () => {
  renderBlock('journey')
  const block = await screen.findByTestId('ai-insight')
  expect(block.dataset.tab).toBe('journey')
})
