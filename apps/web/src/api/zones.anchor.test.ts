import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../public/mock/retail')

test('zones.json exposes floor_plan_url and anchors for all five spine zones', () => {
  const raw = JSON.parse(readFileSync(resolve(root, 'zones.json'), 'utf-8'))
  const data = raw.data
  expect(data.floor_plan_url).toBe('/assets/floor-plans/it-demo-fashion.png')
  expect(data.floor_plan_label).toMatch(/示範/)
  const ids = ['entrance', 'shelf_a', 'shelf_b', 'fitting_room', 'cashier']
  for (const id of ids) {
    const z = data.zones.find((x: { zone_id: string }) => x.zone_id === id)
    expect(z?.anchor).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        r: expect.any(Number),
      }),
    )
    expect(z.anchor.x).toBeGreaterThanOrEqual(0)
    expect(z.anchor.x).toBeLessThanOrEqual(100)
    expect(z.anchor.y).toBeGreaterThanOrEqual(0)
    expect(z.anchor.y).toBeLessThanOrEqual(100)
    expect(z.anchor.r).toBeGreaterThan(0)
  }
})
