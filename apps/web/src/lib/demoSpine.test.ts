import { expect, test } from 'vitest'
import { gapDeepLink, nextBeatPath, zoneToStation, type SpineFocus } from './demoSpine'

test('nextBeatPath walks the golden-path beats then loops to overview', () => {
  expect(nextBeatPath('/retail')).toBe('/retail/footfall')
  expect(nextBeatPath('/retail/footfall')).toBe('/retail/journey')
  expect(nextBeatPath('/retail/journey')).toBe('/retail/service-gap')
  expect(nextBeatPath('/retail/service-gap')).toBe('/retail/roster')
  expect(nextBeatPath('/retail/roster')).toBe('/retail/coach')
  expect(nextBeatPath('/retail/coach')).toBe('/retail/energy')
  expect(nextBeatPath('/retail/energy')).toBe('/retail')
})

test('nextBeatPath ignores query strings and trailing slashes', () => {
  expect(nextBeatPath('/retail/footfall?zone=fitting_room')).toBe('/retail/journey')
  expect(nextBeatPath('/retail/service-gap/')).toBe('/retail/roster')
  expect(nextBeatPath('/retail/')).toBe('/retail/footfall')
})

test('nextBeatPath sends unknown paths back to overview', () => {
  expect(nextBeatPath('/retail/people')).toBe('/retail')
  expect(nextBeatPath('/retail/settings')).toBe('/retail')
})

test('gapDeepLink builds coach ?gap= and roster ?zone= query strings', () => {
  const focus: SpineFocus = { gapId: 'gap-12', zoneId: 'fitting_room', zoneName: '試衣間' }
  expect(gapDeepLink(focus)).toEqual({
    coach: '/retail/coach?gap=gap-12&zone=fitting_room',
    roster: '/retail/roster?zone=fitting_room',
  })
})

test('gapDeepLink omits missing params and falls back zoneName for ?zone=', () => {
  expect(gapDeepLink({})).toEqual({
    coach: '/retail/coach',
    roster: '/retail/roster',
  })
  expect(gapDeepLink({ gapId: 'gap-1' })).toEqual({
    coach: '/retail/coach?gap=gap-1',
    roster: '/retail/roster',
  })
  expect(gapDeepLink({ zoneName: '入口' })).toEqual({
    coach: '/retail/coach?zone=入口',
    roster: '/retail/roster?zone=入口',
  })
})

test('zoneToStation maps gap zone names onto roster stations', () => {
  expect(zoneToStation('入口')).toBe('樓面')
  expect(zoneToStation('試衣間')).toBe('試衣')
  expect(zoneToStation('收銀台')).toBe('收銀')
  expect(zoneToStation('貨架 A')).toBe('樓面')
  expect(zoneToStation('貨架 B')).toBe('樓面')
  expect(zoneToStation(undefined)).toBe('樓面')
})

test('zoneToStation maps zone ids used in deep links', () => {
  expect(zoneToStation('entrance')).toBe('樓面')
  expect(zoneToStation('fitting_room')).toBe('試衣')
  expect(zoneToStation('cashier')).toBe('收銀')
  expect(zoneToStation('shelf_a')).toBe('樓面')
})
