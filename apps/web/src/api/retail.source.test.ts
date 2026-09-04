import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, vi } from 'vitest'
import { fetchMockWithMeta } from './retail'

const footfallPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../public/mock/retail/footfall-hourly.json',
)

test('footfall mock meta.source is counter', async () => {
  const envelope = JSON.parse(readFileSync(footfallPath, 'utf-8')) as {
    meta: { source: string }
  }
  expect(envelope.meta.source).toBe('counter')

  vi.stubGlobal(
    'fetch',
    async () =>
      ({
        ok: true,
        json: async () => envelope,
      }) as Response,
  )

  const { meta } = await fetchMockWithMeta('footfall-hourly.json')
  expect(meta?.source).toBe('counter')
})
