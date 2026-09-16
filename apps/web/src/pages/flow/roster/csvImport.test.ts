// CSV import for the staff registry: parse + validate + template download.
// Columns: name_zh (required), name_en, phone, station (樓面/試衣/收銀),
// employment_type (full_time|part_time), min_hours_per_week, max_hours_per_week.
// BOM tolerated; header row required; per-row errors never abort the whole file.

import { describe, expect, it } from 'vitest'
import { parseEmployeesCsv, staffCsvTemplate } from './csvImport'

describe('parseEmployeesCsv', () => {
  it('parses valid rows and applies defaults', () => {
    const csv = [
      'name_zh,name_en,phone,station,employment_type,min_hours_per_week,max_hours_per_week',
      '陳大文,Chan Tai Man,91234567,樓面,full_time,10,40',
      '李小美,,97876543,試衣,part_time,,',
    ].join('\n')
    const { rows, errors } = parseEmployeesCsv(csv)
    expect(errors).toEqual([])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      name_zh: '陳大文',
      name_en: 'Chan Tai Man',
      phone: '91234567',
      station: '樓面',
      employment_type: 'full_time',
      min_hours_per_week: 10,
      max_hours_per_week: 40,
    })
    expect(rows[1]).toMatchObject({
      name_zh: '李小美',
      station: '試衣',
      employment_type: 'part_time',
      min_hours_per_week: 0,
      max_hours_per_week: 48,
    })
  })

  it('strips BOM and CRLF line endings', () => {
    const csv =
      '\uFEFFname_zh,name_en,phone,station,employment_type,min_hours_per_week,max_hours_per_week\r\n陳大文,Chan,91234567,收銀,full_time,0,48\r\n'
    const { rows, errors } = parseEmployeesCsv(csv)
    expect(errors).toEqual([])
    expect(rows[0]?.name_zh).toBe('陳大文')
    expect(rows[0]?.station).toBe('收銀')
  })

  it('accepts quoted fields with commas', () => {
    const csv = [
      'name_zh,name_en,phone,station,employment_type,min_hours_per_week,max_hours_per_week',
      '"陳,大文",Chan,91234567,樓面,full_time,0,48',
    ].join('\n')
    const { rows, errors } = parseEmployeesCsv(csv)
    expect(errors).toEqual([])
    expect(rows[0]?.name_zh).toBe('陳,大文')
  })

  it('reports missing name_zh per row without aborting others', () => {
    const csv = [
      'name_zh,name_en,phone,station,employment_type,min_hours_per_week,max_hours_per_week',
      ',NoName,91234567,樓面,full_time,0,48',
      '李小美,Li,,試衣,part_time,0,20',
    ].join('\n')
    const { rows, errors } = parseEmployeesCsv(csv)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name_zh).toBe('李小美')
    expect(errors).toHaveLength(1)
    expect(errors[0]?.row).toBe(2)
    expect(errors[0]?.reason).toMatch(/name_zh/)
  })

  it('reports invalid station, type, hours and min>max', () => {
    const csv = [
      'name_zh,name_en,phone,station,employment_type,min_hours_per_week,max_hours_per_week',
      '甲,A,,倉庫,full_time,0,48',
      '乙,B,,樓面,night_shift,0,48',
      '丙,C,,樓面,full_time,40,10',
      '丁,D,,樓面,full_time,-5,200',
    ].join('\n')
    const { errors } = parseEmployeesCsv(csv)
    expect(errors.map((e) => e.row)).toEqual([2, 3, 4, 5])
    expect(errors[0]?.reason).toMatch(/station/)
    expect(errors[1]?.reason).toMatch(/employment_type/)
    expect(errors[2]?.reason).toMatch(/min_hours_per_week/)
    expect(errors[3]?.reason).toMatch(/min_hours_per_week/)
  })

  it('rejects a file with a wrong header', () => {
    const { rows, errors } = parseEmployeesCsv('foo,bar\n1,2')
    expect(rows).toEqual([])
    expect(errors).toHaveLength(1)
    expect(errors[0]?.row).toBe(1)
    expect(errors[0]?.reason).toMatch(/header/i)
  })

  it('rejects an empty file', () => {
    const { rows, errors } = parseEmployeesCsv('')
    expect(rows).toEqual([])
    expect(errors[0]?.reason).toMatch(/empty/i)
  })
})

describe('staffCsvTemplate', () => {
  it('returns header + one sample row containing the required columns', () => {
    const csv = staffCsvTemplate()
    const lines = csv.trim().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('name_zh')
    expect(lines[0]).toContain('max_hours_per_week')
    expect(lines[1]).toContain('陳大文')
  })
})
