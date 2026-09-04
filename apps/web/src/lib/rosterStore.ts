const KEY = 'ifmp_retail_roster_suggested';

export function loadSuggestedOverride(): number[] | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as number[];
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

export function saveSuggestedOverride(values: number[]) {
  sessionStorage.setItem(KEY, JSON.stringify(values));
}

export function clearSuggestedOverride() {
  sessionStorage.removeItem(KEY);
}
