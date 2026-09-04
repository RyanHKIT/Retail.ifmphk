const KEY = 'ifmp_retail_settings';

export type RetailRules = {
  dwell_threshold_sec: number;
  staff_proximity_m: number;
  first_contact_sec: number;
  overstaff_multiplier: number;
};

export const DEFAULT_RULES: RetailRules = {
  dwell_threshold_sec: 120,
  staff_proximity_m: 3,
  first_contact_sec: 90,
  overstaff_multiplier: 1.5,
};

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function loadRuleOverrides(): Partial<RetailRules> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<RetailRules>;
  } catch {
    return null;
  }
}

export function getDisplayRules(): RetailRules {
  const o = loadRuleOverrides();
  return {
    dwell_threshold_sec: pickNumber(o?.dwell_threshold_sec, DEFAULT_RULES.dwell_threshold_sec),
    staff_proximity_m: pickNumber(o?.staff_proximity_m, DEFAULT_RULES.staff_proximity_m),
    first_contact_sec: pickNumber(o?.first_contact_sec, DEFAULT_RULES.first_contact_sec),
    overstaff_multiplier: pickNumber(o?.overstaff_multiplier, DEFAULT_RULES.overstaff_multiplier),
  };
}

export function saveRuleOverrides(rules: RetailRules) {
  sessionStorage.setItem(KEY, JSON.stringify(rules));
}

export function clearRuleOverrides() {
  sessionStorage.removeItem(KEY);
}
