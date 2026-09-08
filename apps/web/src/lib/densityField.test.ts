import { expect, test } from 'vitest'
import { accumulateGaussians, colorizeDensity, paintDensityField } from './densityField'

test('accumulateGaussians peaks near the anchor and is near-zero far away', () => {
  const w = 40
  const h = 40
  const out = new Float32Array(w * h)
  accumulateGaussians(w, h, [{ x: 50, y: 50, r: 20, intensity: 1 }], out)
  const mid = out[20 * w + 20]
  const corner = out[0]
  expect(mid).toBeGreaterThan(corner)
  expect(mid).toBeGreaterThan(0.2)
  expect(corner).toBeLessThan(0.05)
})

test('colorizeDensity writes transparent where intensity is ~0', () => {
  const w = 4
  const h = 4
  const intensity = new Float32Array(w * h)
  intensity[0] = 0
  intensity[1] = 1
  const rgba = new Uint8ClampedArray(w * h * 4)
  colorizeDensity(intensity, w, h, rgba, { maxAlpha: 180 })
  expect(rgba[3]).toBe(0)
  expect(rgba[7]).toBeGreaterThan(0)
})

test('paintDensityField returns ImageData of requested size', () => {
  const img = paintDensityField(16, 12, [{ x: 30, y: 40, r: 25, intensity: 0.8 }])
  expect(img.width).toBe(16)
  expect(img.height).toBe(12)
  expect(img.data.length).toBe(16 * 12 * 4)
})
