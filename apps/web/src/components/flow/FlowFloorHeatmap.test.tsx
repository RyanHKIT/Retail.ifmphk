import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowFloorHeatmap, shopClipPx } from './FlowFloorHeatmap'
import type { JourneyPayload } from '@/lib/footfall/api'

const payload: JourneyPayload = {
  floorPlanUrl: '/assets/floor-plans/it-cwb-demo.png',
  floorPlanLabelZh: '示範平面圖（樣本）',
  floorPlanLabelEn: 'Demo floor plan (sample)',
  day: '2026-09-16',
  zones: [
    {
      id: 'e',
      zoneKey: 'entrance',
      nameZh: '入口',
      nameEn: 'Entrance',
      zoneType: 'entrance',
      anchorX: 50,
      anchorY: 92,
      anchorR: 12,
    },
    {
      id: 'f',
      zoneKey: 'fitting_room',
      nameZh: '試衣間',
      nameEn: 'Fitting room',
      zoneType: 'fitting',
      anchorX: 82,
      anchorY: 28,
      anchorR: 12,
    },
  ],
  heat: [
    { zoneId: 'e', zoneKey: 'entrance', visitCount: 100, avgDwellSec: 20, intensity: 1 },
    { zoneId: 'f', zoneKey: 'fitting_room', visitCount: 50, avgDwellSec: 200, intensity: 0.5 },
  ],
}

beforeEach(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', ResizeObserverMock)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    putImageData: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function renderHeat(opts?: { compact?: boolean; focusedKey?: 'entrance' | 'fitting_room' | null }) {
  const onZoneClick = vi.fn()
  const view = render(
    <FlowLocaleProvider>
      <FlowFloorHeatmap
        payload={payload}
        metric="composite"
        compact={opts?.compact}
        focusedKey={opts?.focusedKey ?? null}
        onZoneClick={onZoneClick}
      />
    </FlowLocaleProvider>,
  )
  return { ...view, onZoneClick }
}

test('renders floorplan img and a button per zone', () => {
  renderHeat()
  expect(screen.getByRole('img')).toHaveAttribute('src', payload.floorPlanUrl)
  expect(screen.getByTestId('flow-heat-zone-entrance')).toBeInTheDocument()
  expect(screen.getByTestId('flow-heat-zone-fitting_room')).toBeInTheDocument()
  expect(screen.getAllByRole('button')).toHaveLength(payload.zones.length)
  expect(screen.getByTestId('flow-heat-canvas')).toBeInTheDocument()
  expect(screen.getByTestId('flow-heat-legend')).toBeInTheDocument()
})

test('zone name is visible black text on the label box', () => {
  renderHeat()
  const btn = screen.getByTestId('flow-heat-zone-fitting_room')
  expect(btn).toHaveTextContent('試衣間')
  expect(btn.querySelector('.flow-heat-label-name')).toHaveTextContent('試衣間')
  expect(btn.style.width).toBe('')
  expect(btn.style.height).toBe('')
})

test('focused zone shows area details on the name box', () => {
  renderHeat({ focusedKey: 'fitting_room' })
  const btn = screen.getByTestId('flow-heat-zone-fitting_room')
  expect(btn).toHaveAttribute('aria-pressed', 'true')
  expect(btn).toHaveTextContent('到達人次')
  expect(btn).toHaveTextContent('50')
  expect(btn).toHaveTextContent('平均停留')
})

test('clicking a zone calls onZoneClick with zoneKey', async () => {
  const user = userEvent.setup()
  const { onZoneClick } = renderHeat()
  await user.click(screen.getByTestId('flow-heat-zone-fitting_room'))
  expect(onZoneClick).toHaveBeenCalledWith('fitting_room')
})

test('shop clip sits inside the floorplan, inset from the paper margin', () => {
  const plot = { left: 0, top: 0, width: 1000, height: 800 }
  const r = shopClipPx(plot)
  expect(r.x).toBeGreaterThan(50)
  expect(r.y).toBeGreaterThan(50)
  expect(r.x + r.w).toBeLessThan(950)
  expect(r.y + r.h).toBeLessThan(750)
})
