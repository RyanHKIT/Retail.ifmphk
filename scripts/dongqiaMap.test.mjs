import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chunkDateRange,
  mapAudienceDaily,
  mapDevices,
  mapEntranceHourly,
  mapFootfallDaily,
  mapFootfallHourly,
} from './dongqiaMap.mjs'

const BRANCH = 'a0000000-0000-4000-8000-000000000001'
const GATE_MAIN = 'd872d8d9-7fa1-4584-a34b-eebcb1cf7f28'
const GATE_SIDE = 'cc33a8ff-b573-4d4f-b632-722ec4c5d5bc'

const hourlyPayload = {
  data: [
    {
      code: 'STORE1',
      dataList: [
        {
          date: '2026-09-15T10:00:00',
          inSum: 312,
          outSum: 298,
          passbySum: 540,
          inNoDupSum: 280,
        },
        {
          date: '2026-09-15T11:00:00',
          inSum: 190,
          outSum: 175,
          passbySum: 320,
          inNoDupSum: 170,
        },
      ],
    },
  ],
}

test('mapFootfallHourly maps vendor hourly fields and +08:00 hour_start', () => {
  const rows = mapFootfallHourly(hourlyPayload, BRANCH)
  assert.equal(rows.length, 2)
  assert.deepEqual(rows[0], {
    branch_id: BRANCH,
    hour_start: '2026-09-15T10:00:00+08:00',
    in_count: 312,
    out_count: 298,
    passersby_count: 540,
    unique_visitors: 280,
  })
})

test('mapFootfallDaily maps inNoDupSum to unique_visitors and calendar day', () => {
  const rows = mapFootfallDaily(
    {
      data: [
        {
          code: 'STORE1',
          dataList: [
            {
              date: '2026-09-15T00:00:00',
              inSum: 2000,
              outSum: 1900,
              passbySum: 3100,
              inNoDupSum: 1650,
            },
          ],
        },
      ],
    },
    BRANCH,
  )
  assert.equal(rows.length, 1)
  assert.deepEqual(rows[0], {
    branch_id: BRANCH,
    day: '2026-09-15',
    in_count: 2000,
    out_count: 1900,
    passersby_count: 3100,
    unique_visitors: 1650,
  })
})

test('mapAudienceDaily stores gender and age as independent marginals', () => {
  const rows = mapAudienceDaily(
    {
      data: [
        {
          dataList: [
            {
              date: '2026-09-15T00:00:00',
              sexManSum: 800,
              sexWomanSum: 900,
              sexUnknownSum: 50,
              ageToddlerSum: 40,
              ageTeenagerSum: 80,
              ageYouthSum: 700,
              ageMiddleAgedSum: 500,
              ageElderlySum: 200,
              ageUnknownSum: 10,
            },
          ],
        },
      ],
    },
    BRANCH,
  )
  assert.equal(rows.length, 8)
  assert.deepEqual(
    rows.find((r) => r.gender === 'male' && r.age_group === 'unknown'),
    {
      branch_id: BRANCH,
      day: '2026-09-15',
      gender: 'male',
      age_group: 'unknown',
      visitor_count: 800,
    },
  )
  assert.deepEqual(
    rows.find((r) => r.gender === 'unknown' && r.age_group === 'youth'),
    {
      branch_id: BRANCH,
      day: '2026-09-15',
      gender: 'unknown',
      age_group: 'youth',
      visitor_count: 700,
    },
  )
  assert.ok(!rows.some((r) => r.gender === 'male' && r.age_group === 'youth'))
})

test('mapEntranceHourly maps codes through entranceMap', () => {
  const rows = mapEntranceHourly(
    {
      data: [
        {
          code: 'GATE_MAIN',
          dataList: [
            { date: '2026-09-15T10:00:00', inSum: 210, outSum: 200, passbySum: 0, inNoDupSum: 0 },
          ],
        },
        {
          code: 'GATE_SIDE',
          dataList: [
            { date: '2026-09-15T10:00:00', inSum: 102, outSum: 98, passbySum: 0, inNoDupSum: 0 },
          ],
        },
      ],
    },
    { GATE_MAIN, GATE_SIDE },
  )
  assert.equal(rows.length, 2)
  assert.equal(rows[0].entrance_id, GATE_MAIN)
  assert.equal(rows[0].in_count, 210)
  assert.equal(rows[1].entrance_id, GATE_SIDE)
})

test('mapEntranceHourly throws on unknown entrance code', () => {
  assert.throws(
    () =>
      mapEntranceHourly(
        { data: [{ code: 'UNKNOWN', dataList: [{ date: '2026-09-15T10:00:00', inSum: 1 }] }] },
        { GATE_MAIN },
      ),
    /unknown entrance code: UNKNOWN/,
  )
})

test('mapDevices: offline beats degraded; status 2 is degraded; else online', () => {
  const rows = mapDevices(
    {
      data: {
        STORE1: [
          {
            title: 'Cam A',
            onLine: false,
            status: 2,
            newlySendDate: '2026-09-15T12:00:00',
          },
          {
            title: 'Cam B',
            onLine: true,
            status: 2,
            newlySendDate: '2026-09-15T12:01:00',
          },
          {
            title: 'Cam C',
            onLine: true,
            status: 0,
            newlySendDate: null,
          },
        ],
      },
    },
    BRANCH,
  )
  assert.equal(rows[0].status, 'offline')
  assert.equal(rows[1].status, 'degraded')
  assert.equal(rows[2].status, 'online')
  assert.equal(rows[0].name, 'Cam A')
  assert.equal(rows[0].last_seen_at, '2026-09-15T12:00:00+08:00')
  assert.equal(rows[2].last_seen_at, null)
})

test('chunkDateRange splits hourly pulls into 60-day windows', () => {
  const chunks = chunkDateRange('2025-05-01', '2025-08-29', 60)
  assert.equal(chunks.length, 3)
  assert.deepEqual(chunks[0], { beginDate: '2025-05-01', endDate: '2025-06-29' })
  assert.deepEqual(chunks[1], { beginDate: '2025-06-30', endDate: '2025-08-28' })
  assert.deepEqual(chunks[2], { beginDate: '2025-08-29', endDate: '2025-08-29' })
})
