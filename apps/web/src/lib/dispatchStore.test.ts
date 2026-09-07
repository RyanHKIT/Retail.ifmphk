import { afterEach, beforeEach, expect, test } from 'vitest'
import * as store from './dispatchStore'

const KEY = 'ifmp_retail_dispatches'

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

test('exposes markDispatched, isDispatched, and listDispatched', () => {
  expect(typeof store.markDispatched).toBe('function')
  expect(typeof store.isDispatched).toBe('function')
  expect(typeof store.listDispatched).toBe('function')
})

test('listDispatched is empty before any marks', () => {
  expect(store.listDispatched()).toEqual([])
  expect(store.isDispatched('evt-1')).toBe(false)
})

test('markDispatched records an event id and returns void', () => {
  const result = store.markDispatched('evt-1')
  expect(result).toBeUndefined()
  expect(store.isDispatched('evt-1')).toBe(true)
  expect(store.isDispatched('evt-other')).toBe(false)
  expect(store.listDispatched()).toEqual(['evt-1'])
})

test('listDispatched returns every marked id', () => {
  store.markDispatched('gap-a')
  store.markDispatched('gap-b')
  expect(store.listDispatched().sort()).toEqual(['gap-a', 'gap-b'])
})

test('marks persist in sessionStorage across later reads', () => {
  store.markDispatched('evt-persist')
  const raw = sessionStorage.getItem(KEY)
  expect(raw).toBeTruthy()

  const roundTrip = JSON.parse(raw as string) as Record<string, unknown>
  expect(Object.keys(roundTrip)).toContain('evt-persist')

  expect(store.isDispatched('evt-persist')).toBe(true)
  expect(store.listDispatched()).toEqual(['evt-persist'])
})

test('markDispatched fires a retail-dispatch window event', () => {
  const seen: string[] = []
  const onDispatch = () => seen.push('retail-dispatch')
  window.addEventListener('retail-dispatch', onDispatch)
  try {
    store.markDispatched('gap-evt', '試衣間')
    expect(seen).toEqual(['retail-dispatch'])
  } finally {
    window.removeEventListener('retail-dispatch', onDispatch)
  }
})

test('rehydrates from existing sessionStorage without calling mark again', () => {
  sessionStorage.setItem(
    KEY,
    JSON.stringify({
      'gap-9': {
        gap_id: 'gap-9',
        zone_name: '試衣間',
        dispatched_at: '2026-09-02T15:00:00+08:00',
      },
    }),
  )
  expect(store.isDispatched('gap-9')).toBe(true)
  expect(store.listDispatched()).toEqual(['gap-9'])
})
