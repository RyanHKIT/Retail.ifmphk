import { expect, test } from 'vitest'
import { renormalizeHeat } from './journeyMetrics'
import type { HeatmapDayRow } from './footfall/api'

const heat: HeatmapDayRow[] = [
  { zoneId: 'e', zoneKey: 'entrance', visitCount: 100, avgDwellSec: 20, intensity: 1 },
  { zoneId: 'f', zoneKey: 'fitting_room', visitCount: 50, avgDwellSec: 200, intensity: 0.5 },
]

test('visits peaks at max visitCount', () => {
  const m = renormalizeHeat(heat, 'visits')
  expect(m.get('e')).toBe(1)
  expect(m.get('f')).toBe(0.5)
})

test('dwell peaks at max avgDwellSec', () => {
  const m = renormalizeHeat(heat, 'dwell')
  expect(m.get('f')).toBe(1)
  expect(m.get('e')).toBe(0.1)
})

test('composite is 0.6 visits + 0.4 dwell then re-peaked', () => {
  const m = renormalizeHeat(heat, 'composite')
  // visits: e=1, f=0.5; dwell: e=0.1, f=1
  // raw: e=0.6*1+0.4*0.1=0.64; f=0.6*0.5+0.4*1=0.7; peak=0.7
  expect(m.get('f')).toBe(1)
  expect(m.get('e')).toBeCloseTo(0.64 / 0.7)
})
