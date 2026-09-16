import type { CSSProperties } from 'react'

/**
 * Chart palette for the flow surfaces.
 *
 * Every entry carries a hex fallback on purpose. An unresolved `var()` inside
 * an SVG presentation attribute is invalid, so the property falls back to its
 * initial value and the chart paints solid black. That is exactly what happened
 * while these tokens were only defined on the retired retail shell, so the
 * fallback keeps a missing token cosmetic instead of catastrophic.
 *
 * Signal Blue leads (--chart-1); slate stays neutral for comparison series.
 */
export const CHART = {
  1: 'var(--chart-1, #3b82f6)',
  2: 'var(--chart-2, #60a5fa)',
  3: 'var(--chart-3, #10b981)',
  4: 'var(--chart-4, #94a3b8)',
  5: 'var(--chart-5, #0ea5e9)',
  6: 'var(--chart-6, #64748b)',
} as const

export const CHART_GRID = 'var(--flow-chart-grid, #eef2f7)'
export const CHART_TICK = 'var(--flow-chart-tick, #94a3b8)'

/** Y axis scale width. Keeps multi-chart grids aligned. */
export const AXIS_WIDTH = 40

/** Tick label styling. Size varies per chart; colour does not. */
export function tickStyle(fontSize = 11) {
  return { fill: CHART_TICK, fontSize }
}

/**
 * Grid is horizontal-only and faint, so it reads as a reading aid rather than
 * a wireframe. Spread onto <CartesianGrid />.
 */
export const GRID_PROPS = {
  stroke: CHART_GRID,
  strokeDasharray: '3 3',
  vertical: false,
} as const

/**
 * Axes carry data through the ticks, not through solid rules. Spread onto
 * <XAxis /> and <YAxis />.
 */
export const AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
} as const

/** White card tooltip with a soft shadow, matching the card language. */
export const TOOLTIP_STYLE: CSSProperties = {
  background: 'var(--flow-panel)',
  border: '1px solid var(--flow-line)',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
  color: 'var(--flow-text)',
  fontSize: 12,
  padding: '8px 10px',
}

/** Rounded top corners for vertical bars; right corners for horizontal ones. */
export const BAR_RADIUS_UP: [number, number, number, number] = [4, 4, 0, 0]
export const BAR_RADIUS_RIGHT: [number, number, number, number] = [0, 4, 4, 0]

/** Legend text colour, so it tracks the theme instead of defaulting to black. */
export const LEGEND_STYLE: CSSProperties = {
  fontSize: 11,
  color: 'var(--flow-muted)',
}
