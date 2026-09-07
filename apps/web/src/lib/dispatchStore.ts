const KEY = 'ifmp_retail_dispatches';

export type DispatchRecord = {
  gap_id: string;
  zone_name: string;
  dispatched_at: string;
  note?: string;
};

function readAll(): Record<string, DispatchRecord> {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, DispatchRecord>;
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, DispatchRecord>) {
  sessionStorage.setItem(KEY, JSON.stringify(map));
}

export function getDispatches(): Record<string, DispatchRecord> {
  return readAll();
}

export function isDispatched(gapId: string): boolean {
  return Boolean(readAll()[gapId]);
}

export function markDispatched(eventId: string, zoneName?: string, note?: string): void {
  const map = readAll();
  map[eventId] = {
    gap_id: eventId,
    zone_name: zoneName ?? map[eventId]?.zone_name ?? '',
    dispatched_at: new Date().toISOString(),
    note,
  };
  writeAll(map);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('retail-dispatch'));
  }
}

export function listDispatched(): string[] {
  return Object.keys(readAll());
}

export function clearDispatch(gapId: string) {
  const map = readAll();
  delete map[gapId];
  writeAll(map);
}

export function countDispatched(gapIds: string[]): number {
  const map = readAll();
  return gapIds.filter((id) => map[id]).length;
}

export function countPending(gapIds: string[]): number {
  return gapIds.length - countDispatched(gapIds);
}
