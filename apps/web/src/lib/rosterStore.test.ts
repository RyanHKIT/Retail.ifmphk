import { afterEach, beforeEach, expect, test } from 'vitest'
import { clearSuggestedOverride, loadSuggestedOverride, saveSuggestedOverride } from './rosterStore'

const KEY = 'ifmp_retail_roster_suggested'

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

test('loadSuggestedOverride is null when empty', () => {
  expect(loadSuggestedOverride()).toBeNull()
})

test('saveSuggestedOverride persists and loadSuggestedOverride rehydrates', () => {
  saveSuggestedOverride([5, 6, 7])
  expect(JSON.parse(sessionStorage.getItem(KEY) as string)).toEqual([5, 6, 7])
  expect(loadSuggestedOverride()).toEqual([5, 6, 7])
})

test('clearSuggestedOverride removes the override', () => {
  saveSuggestedOverride([1, 2])
  clearSuggestedOverride()
  expect(sessionStorage.getItem(KEY)).toBeNull()
  expect(loadSuggestedOverride()).toBeNull()
})

test('loadSuggestedOverride rejects non-number arrays', () => {
  sessionStorage.setItem(KEY, JSON.stringify(['x', 1]))
  expect(loadSuggestedOverride()).toBeNull()
})
