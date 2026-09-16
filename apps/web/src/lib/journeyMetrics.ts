export type HeatMetric = 'composite' | 'visits' | 'dwell'

export function renormalizeHeat(
  heat: { zoneId: string; visitCount: number; avgDwellSec: number }[],
  metric: HeatMetric,
): Map<string, number> {
  const maxV = Math.max(0, ...heat.map((h) => h.visitCount))
  const maxD = Math.max(0, ...heat.map((h) => h.avgDwellSec))
  const visits = (n: number) => (maxV === 0 ? 0 : n / maxV)
  const dwell = (n: number) => (maxD === 0 ? 0 : n / maxD)
  const raw = heat.map((h) => {
    const v = visits(h.visitCount)
    const d = dwell(h.avgDwellSec)
    const i = metric === 'visits' ? v : metric === 'dwell' ? d : 0.6 * v + 0.4 * d
    return { zoneId: h.zoneId, i }
  })
  const peak = Math.max(0, ...raw.map((r) => r.i))
  return new Map(raw.map((r) => [r.zoneId, peak === 0 ? 0 : r.i / peak]))
}
