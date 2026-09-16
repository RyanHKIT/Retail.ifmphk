// CSV bulk import for the staff registry. Pure functions: parse + validate +
// template. Excel-friendly — the template opens directly in Excel (BOM included
// by the download wrapper in Staff.tsx), users fill rows and save back as CSV.
// All validation errors are collected per row so one bad row never aborts the
// whole file; the UI lists them with row numbers for fixing.

import type { NewEmployee } from '@/lib/roster/api'
import type { Station } from '@/lib/roster/types'

export const STAFF_CSV_COLUMNS = [
  'name_zh',
  'name_en',
  'phone',
  'station',
  'employment_type',
  'min_hours_per_week',
  'max_hours_per_week',
] as const

const STATIONS: Station[] = ['樓面', '試衣', '收銀']
const EMPLOYMENT_TYPES = ['full_time', 'part_time']

export interface CsvRowError {
  /** 1-based data row number (header = row 1, first data row = 2). */
  row: number
  reason: string
}

export interface ParsedEmployee {
  name_zh: string
  name_en: string
  phone: string
  station: Station
  employment_type: 'full_time' | 'part_time'
  min_hours_per_week: number
  max_hours_per_week: number
}

/** Minimal CSV line splitter handling quoted fields ("" escape, no newlines inside). */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

function toInt(v: string): number | null {
  const t = v.trim()
  if (!/^-?\d+$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/**
 * Parse a CSV file body (BOM tolerated). Returns valid rows + per-row errors.
 * Header row is mandatory and must match the known columns (order-insensitive
 * mapping by name; unknown/missing required columns reject the whole file).
 */
export function parseEmployeesCsv(body: string): {
  rows: ParsedEmployee[]
  errors: CsvRowError[]
} {
  const text = body.replace(/^\uFEFF/, '').trim()
  if (!text) return { rows: [], errors: [{ row: 1, reason: 'empty file' }] }

  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0)
    return { rows: [], errors: [{ row: 1, reason: 'empty file' }] }

  const header = splitCsvLine(lines[0]).map((h) => h.trim())
  const missing = STAFF_CSV_COLUMNS.filter((c) => !header.includes(c))
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [{ row: 1, reason: `invalid header — missing: ${missing.join(', ')}` }],
    }
  }
  const idx = (col: (typeof STAFF_CSV_COLUMNS)[number]) => header.indexOf(col)

  const rows: ParsedEmployee[] = []
  const errors: CsvRowError[] = []

  for (let i = 1; i < lines.length; i += 1) {
    const dataRow = i + 1 // header is row 1
    const cells = splitCsvLine(lines[i])
    const get = (col: (typeof STAFF_CSV_COLUMNS)[number]) =>
      (cells[idx(col)] ?? '').trim()

    const name_zh = get('name_zh')
    if (!name_zh) {
      errors.push({ row: dataRow, reason: 'name_zh is required' })
      continue
    }

    const station = get('station') as Station
    if (!STATIONS.includes(station)) {
      errors.push({ row: dataRow, reason: `invalid station "${get('station')}" (樓面|試衣|收銀)` })
      continue
    }

    const employment_type = get('employment_type')
    if (!EMPLOYMENT_TYPES.includes(employment_type)) {
      errors.push({
        row: dataRow,
        reason: `invalid employment_type "${employment_type}" (full_time|part_time)`,
      })
      continue
    }

    const minRaw = get('min_hours_per_week')
    const maxRaw = get('max_hours_per_week')
    const min = minRaw === '' ? 0 : toInt(minRaw)
    const max = maxRaw === '' ? 48 : toInt(maxRaw)
    if (min === null || min < 0 || min > 168) {
      errors.push({ row: dataRow, reason: `invalid min_hours_per_week "${minRaw}" (integer 0–168)` })
      continue
    }
    if (max === null || max < 0 || max > 168) {
      errors.push({ row: dataRow, reason: `invalid max_hours_per_week "${maxRaw}" (integer 0–168)` })
      continue
    }
    if (min > max) {
      errors.push({ row: dataRow, reason: 'min_hours_per_week must be ≤ max_hours_per_week' })
      continue
    }

    rows.push({
      name_zh,
      name_en: get('name_en'),
      phone: get('phone'),
      station,
      employment_type: employment_type as ParsedEmployee['employment_type'],
      min_hours_per_week: min,
      max_hours_per_week: max,
    })
  }

  return { rows, errors }
}

/** Template CSV (no BOM — caller adds it for Excel). One sample row. */
export function staffCsvTemplate(): string {
  const sample: NewEmployee = {
    name_zh: '陳大文',
    name_en: 'Chan Tai Man',
    phone: '91234567',
    station: '樓面',
    employment_type: 'full_time',
    min_hours_per_week: 0,
    max_hours_per_week: 48,
  }
  return [
    STAFF_CSV_COLUMNS.join(','),
    STAFF_CSV_COLUMNS.map((c) => String(sample[c as keyof NewEmployee] ?? '')).join(','),
  ].join('\n')
}
