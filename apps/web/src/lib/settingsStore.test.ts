import { afterEach, beforeEach, expect, test } from 'vitest'
import {
  clearRuleOverrides,
  getDisplayRules,
  loadRuleOverrides,
  saveRuleOverrides,
  type RetailRules,
} from './settingsStore'

const KEY = 'ifmp_retail_settings'

const sample: RetailRules = {
  dwell_threshold_sec: 180,
  staff_proximity_m: 3,
  first_contact_sec: 60,
  overstaff_multiplier: 1.5,
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

test('loadRuleOverrides is null when empty', () => {
  expect(loadRuleOverrides()).toBeNull()
})

test('saveRuleOverrides persists dwell_threshold_sec and first_contact_sec', () => {
  saveRuleOverrides(sample)
  expect(JSON.parse(sessionStorage.getItem(KEY) as string)).toMatchObject({
    dwell_threshold_sec: 180,
    first_contact_sec: 60,
  })
  expect(loadRuleOverrides()).toMatchObject({
    dwell_threshold_sec: 180,
    first_contact_sec: 60,
  })
})

test('clearRuleOverrides removes the override', () => {
  saveRuleOverrides(sample)
  clearRuleOverrides()
  expect(sessionStorage.getItem(KEY)).toBeNull()
  expect(loadRuleOverrides()).toBeNull()
})

test('getDisplayRules uses defaults then overlays store', () => {
  expect(getDisplayRules().dwell_threshold_sec).toBe(120)
  expect(getDisplayRules().first_contact_sec).toBe(90)
  saveRuleOverrides(sample)
  expect(getDisplayRules().dwell_threshold_sec).toBe(180)
  expect(getDisplayRules().first_contact_sec).toBe(60)
})
