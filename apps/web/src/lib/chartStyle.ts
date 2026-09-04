import type { CSSProperties } from 'react';

/** DESIGN.md series — teal / blue / earth / slate. No rose or purple. */
export const CHART = {
  1: 'var(--chart-1)',
  2: 'var(--chart-2)',
  3: 'var(--chart-3)',
  4: 'var(--chart-4)',
} as const;

/** Shared Recharts tooltip style from retail theme. */
export function chartTooltipStyle(chart: {
  tooltipBg: string;
  tooltipBorder: string;
}): CSSProperties {
  return {
    background: chart.tooltipBg,
    border: `1px solid ${chart.tooltipBorder}`,
    borderRadius: 8,
  };
}
