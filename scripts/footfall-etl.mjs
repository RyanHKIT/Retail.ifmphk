/**
 * DongQia Open API → Supabase footfall ETL.
 *
 *   node scripts/footfall-etl.mjs --from-fixture scripts/fixtures --dry-run
 *   node scripts/footfall-etl.mjs --live --begin 2025-05-01 --end 2026-09-15
 *
 * Secrets only from env. Never printed.
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { countTables, mapFixtureBundle, chunkDateRange } from './dongqiaMap.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DONGQIA_BASE = process.env.DONGQIA_API_BASE || 'https://oapi.dongqia.cn'
const CAUSEWAY = 'a0000000-0000-4000-8000-000000000001'

function parseArgs(argv) {
  const out = { dryRun: false, live: false, fromFixture: null, begin: null, end: null }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--live') out.live = true
    else if (a === '--from-fixture') out.fromFixture = argv[++i]
    else if (a === '--begin') out.begin = argv[++i]
    else if (a === '--end') out.end = argv[++i]
  }
  return out
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function loadEnvFile(file) {
  if (!existsSync(file)) return
  const text = readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    const key = m[1]
    const val = m[2].trim()
    if (process.env[key] == null || process.env[key] === '') process.env[key] = val
  }
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
}

function serviceRole() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
}

export function loadFixtureDir(dir) {
  const abs = path.resolve(dir)
  const map = readJson(path.join(abs, 'map.json'))
  return {
    branchId: map.branchId,
    entranceMap: map.entranceMap,
    entityHourly: readJson(path.join(abs, 'dongqia-getdatas-hourly.json')),
    entityDaily: readJson(path.join(abs, 'dongqia-getdatas-daily.json')),
    entranceHourly: readJson(path.join(abs, 'dongqia-getdatas-entrance-hourly.json')),
    devices: readJson(path.join(abs, 'dongqia-getaccdevices.json')),
  }
}

function parseEntranceMap(raw) {
  const map = {}
  if (!raw) return map
  for (const part of raw.split(',')) {
    const [code, id] = part.split(':').map((s) => s.trim())
    if (code && id) map[code] = id
  }
  return map
}

function redactError(err) {
  return String(err?.message ?? err).replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
}

async function dongqiaToken() {
  const appID = process.env.DONGQIA_APP_ID
  const appSecret = process.env.DONGQIA_APP_SECRET
  if (!appID || !appSecret) {
    throw new Error('live pull deferred: DONGQIA_APP_ID / DONGQIA_APP_SECRET not set')
  }
  const res = await fetch(`${DONGQIA_BASE}/api/Token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appID, appSecret }),
  })
  const body = await res.json()
  const token = body?.data?.token || body?.token
  if (!token) throw new Error(`DongQia token failed: HTTP ${res.status}`)
  return token
}

async function dongqiaGetDatas(token, { objCodes, objTypes, timeType, beginDate, endDate }) {
  const res = await fetch(`${DONGQIA_BASE}/api/GetDatas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      objCodes,
      objTypes,
      timeType,
      beginDate,
      endDate,
      pageIndex: 0,
      pageSize: 0,
    }),
  })
  if (!res.ok) throw new Error(`GetDatas HTTP ${res.status}`)
  return res.json()
}

async function dongqiaDevices(token, storeCode) {
  const url = new URL('/api/GetAccDevices', DONGQIA_BASE)
  url.searchParams.append('ObjCodes', storeCode)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`GetAccDevices HTTP ${res.status}`)
  return res.json()
}

async function loadLiveBundle({ begin, end }) {
  const store = process.env.DONGQIA_STORE_CODE
  if (!store) throw new Error('live pull deferred: DONGQIA_STORE_CODE not set')
  const entranceMap = parseEntranceMap(process.env.DONGQIA_ENTRANCE_CODES)
  const token = await dongqiaToken()
  const start = begin || '2025-05-01'
  const stop = end || new Date().toISOString().slice(0, 10)

  const entityHourly = { data: [] }
  for (const chunk of chunkDateRange(start, stop, 60)) {
    const part = await dongqiaGetDatas(token, {
      objCodes: [store],
      objTypes: [1],
      timeType: 3,
      beginDate: chunk.beginDate,
      endDate: chunk.endDate,
    })
    entityHourly.data.push(...(part.data ?? []))
  }

  const dailyChunks = chunkDateRange(start, stop, 365)
  const entityDaily = { data: [] }
  for (const chunk of dailyChunks) {
    const part = await dongqiaGetDatas(token, {
      objCodes: [store],
      objTypes: [1],
      timeType: 4,
      beginDate: chunk.beginDate,
      endDate: chunk.endDate,
    })
    entityDaily.data.push(...(part.data ?? []))
  }

  const entranceCodes = Object.keys(entranceMap)
  const entranceHourly = { data: [] }
  if (entranceCodes.length) {
    for (const chunk of chunkDateRange(start, stop, 60)) {
      const part = await dongqiaGetDatas(token, {
        objCodes: entranceCodes,
        objTypes: entranceCodes.map(() => 2),
        timeType: 3,
        beginDate: chunk.beginDate,
        endDate: chunk.endDate,
      })
      entranceHourly.data.push(...(part.data ?? []))
    }
  }

  const devices = await dongqiaDevices(token, store)
  return {
    branchId: process.env.FLOW_BRANCH_ID || CAUSEWAY,
    entranceMap,
    entityHourly,
    entityDaily,
    entranceHourly,
    devices,
  }
}

async function restUpsert(table, rows, onConflict) {
  if (!rows.length) return { upserted: 0 }
  const url = `${supabaseUrl()}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceRole(),
      Authorization: `Bearer ${serviceRole()}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${table} upsert HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  return { upserted: rows.length }
}

async function upsertDevices(rows) {
  if (!rows.length) return { upserted: 0 }
  const url = `${supabaseUrl()}/rest/v1/devices?branch_id=eq.${rows[0].branch_id}&select=id,name`
  const list = await fetch(url, {
    headers: {
      apikey: serviceRole(),
      Authorization: `Bearer ${serviceRole()}`,
    },
  })
  if (!list.ok) throw new Error(`devices list HTTP ${list.status}`)
  const existing = await list.json()
  const byName = new Map(existing.map((r) => [r.name, r.id]))
  let n = 0
  for (const row of rows) {
    const id = byName.get(row.name)
    if (id) {
      const patch = await fetch(`${supabaseUrl()}/rest/v1/devices?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: serviceRole(),
          Authorization: `Bearer ${serviceRole()}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ status: row.status, last_seen_at: row.last_seen_at }),
      })
      if (!patch.ok) throw new Error(`devices patch HTTP ${patch.status}`)
    } else {
      const ins = await fetch(`${supabaseUrl()}/rest/v1/devices`, {
        method: 'POST',
        headers: {
          apikey: serviceRole(),
          Authorization: `Bearer ${serviceRole()}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(row),
      })
      if (!ins.ok) throw new Error(`devices insert HTTP ${ins.status}`)
    }
    n += 1
  }
  return { upserted: n }
}

export async function run(argv = process.argv.slice(2)) {
  loadEnvFile(path.join(ROOT, 'apps', 'web', '.env'))
  const args = parseArgs(argv)
  if (!args.fromFixture && !args.live) {
    throw new Error('pass --from-fixture <dir> or --live')
  }

  const bundle = args.fromFixture
    ? loadFixtureDir(args.fromFixture)
    : await loadLiveBundle({ begin: args.begin, end: args.end })

  const mapped = mapFixtureBundle(bundle)
  const counts = countTables(mapped)

  if (args.dryRun || !args.live) {
    return { mode: args.dryRun || args.fromFixture ? 'dry-run' : 'write', counts, mapped }
  }

  if (!supabaseUrl() || !serviceRole()) {
    throw new Error('write needs SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  }

  await restUpsert('footfall_hourly', mapped.footfallHourly, 'branch_id,hour_start')
  await restUpsert('footfall_daily', mapped.footfallDaily, 'branch_id,day')
  await restUpsert('entrance_hourly', mapped.entranceHourly, 'entrance_id,hour_start')
  await restUpsert('audience_daily', mapped.audienceDaily, 'branch_id,day,gender,age_group')
  await upsertDevices(mapped.devices)
  return { mode: 'write', counts, mapped }
}

const isMain =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url

if (isMain) {
  run().then(
    (result) => {
      console.log(JSON.stringify({ mode: result.mode, counts: result.counts }, null, 2))
    },
    (err) => {
      console.error(redactError(err))
      process.exit(err.message?.includes('deferred') ? 2 : 1)
    },
  )
}
