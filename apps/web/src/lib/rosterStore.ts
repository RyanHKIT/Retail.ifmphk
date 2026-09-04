const KEY = 'ifmp_retail_roster_suggested';

export function loadSuggestedOverride(): number[] | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    if (!arr.every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
    return arr.map((n) => Math.max(0, Math.round(n)));
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
