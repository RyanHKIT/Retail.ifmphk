import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadFixtureDir, run } from './footfall-etl.mjs'

test('fixture dry-run counts match mapped tables', async () => {
  const result = await run(['--from-fixture', 'scripts/fixtures', '--dry-run'])
  assert.equal(result.mode, 'dry-run')
  assert.deepEqual(result.counts, {
    footfall_hourly: 2,
    footfall_daily: 2,
    entrance_hourly: 4,
    audience_daily: 16,
    devices: 2,
  })
  const bundle = loadFixtureDir('scripts/fixtures')
  assert.equal(bundle.branchId, 'a0000000-0000-4000-8000-000000000001')
})

test('--live without DongQia app credentials exits deferred', async () => {
  const prevId = process.env.DONGQIA_APP_ID
  const prevSecret = process.env.DONGQIA_APP_SECRET
  delete process.env.DONGQIA_APP_ID
  delete process.env.DONGQIA_APP_SECRET
  await assert.rejects(() => run(['--live']), /live pull deferred/)
  if (prevId != null) process.env.DONGQIA_APP_ID = prevId
  if (prevSecret != null) process.env.DONGQIA_APP_SECRET = prevSecret
})
