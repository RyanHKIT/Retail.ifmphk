import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const mockDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../public/mock/retail')

function readMock<T>(file: string): T {
  return JSON.parse(readFileSync(resolve(mockDir, file), 'utf-8')) as T
}

type Envelope<T> = { data: T; meta: { store_id: string; source: string } }

const CANONICAL_ZONE_NAMES = new Set(['入口', '貨架', '貨架 A', '貨架 B', '試衣間', '收銀台'])
const ENGLISH_ZONE = /^(Entrance|Shelf|Fitting|Cashier)/i

test('funnel passby >= enter and enter_rate matches enter/passby', () => {
  const funnel = readMock<Envelope<{
    stages: { id: string; value: number; rate: number }[]
  }>>('footfall-funnel.json')
  const passby = funnel.data.stages.find((s) => s.id === 'passby')
  const enter = funnel.data.stages.find((s) => s.id === 'enter')
  const notEntered = funnel.data.stages.find((s) => s.id === 'not_entered')
  expect(passby).toBeTruthy()
  expect(enter).toBeTruthy()
  expect(notEntered).toBeTruthy()
  expect(passby!.value).toBeGreaterThanOrEqual(enter!.value)
  expect(enter!.rate).toBe(Number(((enter!.value / passby!.value) * 100).toFixed(1)))
  expect(notEntered!.value).toBe(passby!.value - enter!.value)
  expect(notEntered!.rate).toBe(Number(((notEntered!.value / passby!.value) * 100).toFixed(1)))
  expect(funnel.meta.store_id).toBe('it-cwb')
})

test('hourly passby >= enter each hour and totals match funnel', () => {
  const funnel = readMock<Envelope<{
    stages: { id: string; value: number }[]
  }>>('footfall-funnel.json')
  const hourly = readMock<Envelope<{
    hours: string[]
    series: { id: string; data: number[] }[]
  }>>('footfall-hourly.json')
  const passbyHourly = readMock<Envelope<{
    summary: { passby_total: number; enter_total: number; not_entered_total: number }
    not_entered_by_hour: number[]
  }>>('passby-hourly.json')
  const kpi = readMock<Envelope<{ kpis: { id: string; value: number }[] }>>('kpi.json')

  const passbySeries = hourly.data.series.find((s) => s.id === 'passby')!.data
  const enterSeries = hourly.data.series.find((s) => s.id === 'enter')!.data
  const funnelPassby = funnel.data.stages.find((s) => s.id === 'passby')!.value
  const funnelEnter = funnel.data.stages.find((s) => s.id === 'enter')!.value

  expect(passbySeries.length).toBe(enterSeries.length)
  passbySeries.forEach((p, i) => {
    expect(p).toBeGreaterThanOrEqual(enterSeries[i]!)
    expect(passbyHourly.data.not_entered_by_hour[i]).toBe(p - enterSeries[i]!)
  })

  const passbySum = passbySeries.reduce((a, b) => a + b, 0)
  const enterSum = enterSeries.reduce((a, b) => a + b, 0)
  expect(passbySum).toBe(funnelPassby)
  expect(enterSum).toBe(funnelEnter)
  expect(passbyHourly.data.summary.passby_total).toBe(funnelPassby)
  expect(passbyHourly.data.summary.enter_total).toBe(funnelEnter)
  expect(passbyHourly.data.summary.not_entered_total).toBe(funnelPassby - funnelEnter)
  expect(kpi.data.kpis.find((k) => k.id === 'passby')!.value).toBe(funnelPassby)
  expect(kpi.data.kpis.find((k) => k.id === 'enter')!.value).toBe(funnelEnter)
  expect(kpi.data.kpis.find((k) => k.id === 'enter_rate')!.value).toBe(
    Number(((funnelEnter / funnelPassby) * 100).toFixed(1)),
  )
})

test('zone display names are 繁中 with no English-only leftovers', () => {
  const files: { file: string; pick: (json: Envelope<unknown>) => { name?: string; label?: string }[] }[] = [
    {
      file: 'zones.json',
      pick: (json) => (json.data as { zones: { name: string }[] }).zones,
    },
    {
      file: 'heatmap.json',
      pick: (json) => (json.data as { zones: { name: string }[] }).zones,
    },
    {
      file: 'gap-by-zone.json',
      pick: (json) => (json.data as { zones: { name: string }[] }).zones,
    },
    {
      file: 'zone-dwell.json',
      pick: (json) => (json.data as { zones: { name: string }[] }).zones,
    },
    {
      file: 'dwell-trend.json',
      pick: (json) => (json.data as { series: { label: string }[] }).series.map((s) => ({ name: s.label })),
    },
    {
      file: 'journey-paths.json',
      pick: (json) =>
        (json.data as { paths: { path_labels: string[] }[] }).paths.flatMap((p) =>
          p.path_labels.map((label) => ({ name: label })),
        ),
    },
    {
      file: 'people-by-zone.json',
      pick: (json) => (json.data as { zones: { name: string }[] }).zones,
    },
  ]

  for (const { file, pick } of files) {
    const json = readMock<Envelope<unknown>>(file)
    expect(json.meta.store_id).toBe('it-cwb')
    for (const row of pick(json)) {
      const label = row.name ?? row.label ?? ''
      expect(ENGLISH_ZONE.test(label), `${file} leftover English zone "${label}"`).toBe(false)
      expect(CANONICAL_ZONE_NAMES.has(label), `${file} unexpected zone "${label}"`).toBe(true)
    }
  }
})

test('people-* mock meta.source is camera', () => {
  for (const file of ['people-summary.json', 'people-hourly.json', 'people-by-zone.json']) {
    const json = readMock<Envelope<unknown>>(file)
    expect(json.meta.source, file).toBe('camera')
  }
})
