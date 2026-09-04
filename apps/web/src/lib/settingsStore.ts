const KEY = 'ifmp_retail_settings';

export type RetailRules = {
  dwell_threshold_sec: number;
  staff_proximity_m: number;
  first_contact_sec: number;
  overstaff_multiplier: number;
};

export function loadRuleOverrides(): Partial<RetailRules> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<RetailRules>;
  } catch {
    return null;
  }
}

export function saveRuleOverrides(rules: RetailRules) {
  sessionStorage.setItem(KEY, JSON.stringify(rules));
}

export function clearRuleOverrides() {
  sessionStorage.removeItem(KEY);
}
