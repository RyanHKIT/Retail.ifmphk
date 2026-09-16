/** DongQia Open API (oapi.dongqia.cn) → IFMP footfall row mappers. Pure. No I/O. */

const HK_OFFSET = '+08:00'

export const AGE_FIELDS = [
  ['ageToddlerSum', 'toddler'],
  ['ageTeenagerSum', 'teenager'],
  ['ageYouthSum', 'youth'],
  ['ageMiddleAgedSum', 'middle_aged'],
  ['ageElderlySum', 'elderly'],
  ['ageUnknownSum', 'unknown'],
]

export const GENDER_FIELDS = [
  ['sexManSum', 'male'],
  ['sexWomanSum', 'female'],
  ['sexUnknownSum', 'unknown'],
]

function asInt(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function entities(payload) {
  const data = payload?.data
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') return Object.values(data)
  return []
}

function dataList(entity) {
  return Array.isArray(entity?.dataList) ? entity.dataList : []
}

/** Vendor local wall time, no Z. Persist as HK/CST (+08). */
export function toHourStart(dateStr) {
  const raw = String(dateStr ?? '')
  const stamp = raw.includes('T') ? raw : `${raw}T00:00:00`
  const base = stamp.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '')
  const [date, time = '00:00:00'] = base.split('T')
  const hhmmss = time.length === 5 ? `${time}:00` : time.slice(0, 8)
  return `${date}T${hhmmss}${HK_OFFSET}`
}

export function toDay(dateStr) {
  return toHourStart(dateStr).slice(0, 10)
}

function countRow(point) {
  return {
    in_count: asInt(point.inSum),
    out_count: asInt(point.outSum),
    passersby_count: asInt(point.passbySum),
    unique_visitors: asInt(point.inNoDupSum),
  }
}

export function mapFootfallHourly(payload, branchId) {
  const rows = []
  for (const entity of entities(payload)) {
    for (const point of dataList(entity)) {
      rows.push({
        branch_id: branchId,
        hour_start: toHourStart(point.date),
        ...countRow(point),
      })
    }
  }
  return rows
}

export function mapFootfallDaily(payload, branchId) {
  const rows = []
  for (const entity of entities(payload)) {
    for (const point of dataList(entity)) {
      rows.push({
        branch_id: branchId,
        day: toDay(point.date),
        ...countRow(point),
      })
    }
  }
  return rows
}

/**
 * Gender totals and age totals are independent vendor series, not a matrix.
 * Gender rows use age_group=unknown (including sexUnknownSum).
 * Age rows use gender=unknown and skip ageUnknownSum so (unknown, unknown) stays unique.
 */
export function mapAudienceDaily(payload, branchId) {
  const rows = []
  for (const entity of entities(payload)) {
    for (const point of dataList(entity)) {
      const day = toDay(point.date)
      for (const [field, gender] of GENDER_FIELDS) {
        rows.push({
          branch_id: branchId,
          day,
          gender,
          age_group: 'unknown',
          visitor_count: asInt(point[field]),
        })
      }
      for (const [field, ageGroup] of AGE_FIELDS) {
        if (ageGroup === 'unknown') continue
        rows.push({
          branch_id: branchId,
          day,
          gender: 'unknown',
          age_group: ageGroup,
          visitor_count: asInt(point[field]),
        })
      }
    }
  }
  return rows
}

export function mapEntranceHourly(payload, entranceMap) {
  const rows = []
  for (const entity of entities(payload)) {
    const code = String(entity.code ?? '').trim()
    const entranceId = entranceMap[code]
    if (!entranceId) throw new Error(`unknown entrance code: ${code}`)
    for (const point of dataList(entity)) {
      rows.push({
        entrance_id: entranceId,
        hour_start: toHourStart(point.date),
        in_count: asInt(point.inSum),
        out_count: asInt(point.outSum),
      })
    }
  }
  return rows
}

export function mapDeviceStatus(device) {
  if (device.onLine === false) return 'offline'
  if (Number(device.status) === 2) return 'degraded'
  return 'online'
}

export function mapDevices(payload, branchId) {
  const groups = []
  const data = payload?.data
  if (Array.isArray(data)) {
    for (const item of data) {
      if (Array.isArray(item)) groups.push(item)
      else if (item && typeof item === 'object' && (item.title || item.code)) groups.push([item])
    }
  } else if (data && typeof data === 'object') {
    groups.push(...Object.values(data).filter(Array.isArray))
  }

  const rows = []
  for (const group of groups) {
    for (const device of group) {
      rows.push({
        branch_id: branchId,
        name: String(device.title ?? device.code ?? ''),
        status: mapDeviceStatus(device),
        last_seen_at: device.newlySendDate ? toHourStart(device.newlySendDate) : null,
      })
    }
  }
  return rows
}

function ymd(date) {
  return date.toISOString().slice(0, 10)
}

function utcDay(iso) {
  return new Date(`${iso}T00:00:00Z`)
}

/** Inclusive date windows, vendor hourly cap 60 days. */
export function chunkDateRange(beginIso, endIso, maxDays = 60) {
  if (maxDays < 1) throw new Error('maxDays must be >= 1')
  const chunks = []
  let start = utcDay(beginIso)
  const end = utcDay(endIso)
  if (start > end) return chunks
  const span = maxDays - 1
  while (start <= end) {
    const chunkEnd = new Date(start)
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + span)
    const capped = chunkEnd > end ? end : chunkEnd
    chunks.push({ beginDate: ymd(start), endDate: ymd(capped) })
    start = new Date(capped)
    start.setUTCDate(start.getUTCDate() + 1)
  }
  return chunks
}

export function countTables(mapped) {
  return {
    footfall_hourly: mapped.footfallHourly.length,
    footfall_daily: mapped.footfallDaily.length,
    entrance_hourly: mapped.entranceHourly.length,
    audience_daily: mapped.audienceDaily.length,
    devices: mapped.devices.length,
  }
}

export function mapFixtureBundle(bundle) {
  const branchId = bundle.branchId
  const entranceMap = bundle.entranceMap ?? {}
  return {
    footfallHourly: mapFootfallHourly(bundle.entityHourly, branchId),
    footfallDaily: mapFootfallDaily(bundle.entityDaily, branchId),
    audienceDaily: mapAudienceDaily(bundle.entityDaily, branchId),
    entranceHourly: mapEntranceHourly(bundle.entranceHourly, entranceMap),
    devices: mapDevices(bundle.devices, branchId),
  }
}
