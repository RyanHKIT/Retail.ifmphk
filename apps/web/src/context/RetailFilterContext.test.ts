import { expect, test } from 'vitest'
import { STORE_OPTIONS } from './RetailFilterContext'
import { dictionaries } from '@/i18n/messages'

test('STORE_OPTIONS are fictional I.T. demo stores it-cwb and it-tst', () => {
  expect(STORE_OPTIONS.map((s) => s.id)).toEqual(['it-cwb', 'it-tst'])
})

test('zh-Hant store labels use I.T. demo copy', () => {
  const hant = dictionaries['zh-Hant'] as Record<string, string>
  expect(hant['filter.store.it-cwb']).toBe('I.T. 銅鑼灣（示範）')
  expect(hant['filter.store.it-tst']).toBe('I.T. 尖沙咀（示範）')
})
