import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { FloorHeatmap } from './FloorHeatmap'
import type { ZonesData, HeatmapData } from '@/api/retail'

const fixtureZones: ZonesData['zones'] = [
  {
    zone_id: 'fitting_room',
    name: '試衣間',
    type: 'fitting',
    bbox: { x: 75, y: 25, w: 20, h: 30 },
    anchor: { x: 82, y: 28, r: 12 },
    area_sqm: 12,
  },
  {
    zone_id: 'entrance',
    name: '入口',
    type: 'entrance',
    bbox: { x: 40, y: 85, w: 20, h: 10 },
    anchor: { x: 50, y: 92, r: 12 },
    area_sqm: 8,
  },
]

const fixtureHeat: HeatmapData['zones'] = [
  {
    zone_id: 'fitting_room',
    name: '試衣間',
    visit_count: 68,
    avg_dwell_sec: 495,
    intensity: 0.85,
  },
]

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
  } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('renders floorplan image and clickable zone hits', () => {
  const onZoneClick = vi.fn()
  render(
    <FloorHeatmap
      floorPlanUrl="/assets/floor-plans/it-demo-fashion.png"
      floorPlanLabel="示範平面圖（樣本）"
      zones={fixtureZones}
      heat={fixtureHeat}
      hero
      onZoneClick={onZoneClick}
    />,
  )
  expect(screen.getByRole('img', { name: '示範平面圖（樣本）' })).toHaveAttribute(
    'src',
    '/assets/floor-plans/it-demo-fashion.png',
  )
  expect(screen.getByRole('button', { name: '試衣間' })).toBeInTheDocument()
  expect(document.querySelector('.floor-zone')).toBeNull()
  expect(document.querySelector('.floor-plan--hero')).toBeTruthy()
})
