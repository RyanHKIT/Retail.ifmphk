import type { CSSProperties } from 'react';

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
