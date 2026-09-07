import type { SVGProps } from 'react';
import type { ZonesData, HeatmapData } from '@/api/retail';

const INTENSITY_COLORS = [
  'color-mix(in srgb, var(--chart-1) 25%, transparent)',
  'color-mix(in srgb, var(--chart-1) 45%, transparent)',
  'color-mix(in srgb, var(--chart-1) 55%, var(--chart-3))',
  'color-mix(in srgb, var(--chart-3) 70%, var(--chart-1))',
  'var(--chart-3)',
];

function intensityToColor(intensity: number): string {
  const idx = Math.min(4, Math.floor(intensity * 5));
  return INTENSITY_COLORS[idx] ?? INTENSITY_COLORS[0];
}

const chevron: SVGProps<SVGSVGElement> = {
  width: 12,
  height: 12,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

interface FloorHeatmapProps {
  zones: ZonesData['zones'];
  heat?: HeatmapData['zones'];
  compact?: boolean;
  hero?: boolean;
  onZoneClick?: (zone: ZonesData['zones'][number]) => void;
}

export function FloorHeatmap({ zones, heat, compact, hero, onZoneClick }: FloorHeatmapProps) {
  const heatMap = new Map(heat?.map((z) => [z.zone_id, z]) ?? []);
  const clickable = Boolean(onZoneClick);
  const planClass = [
    'floor-plan',
    compact ? 'floor-plan--compact' : '',
    hero ? 'floor-plan--hero' : '',
    clickable ? 'floor-plan--clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={planClass}>
      {zones
        .filter((z) => z.zone_id !== 'entrance' || !compact)
        .map((zone) => {
          const h = heatMap.get(zone.zone_id);
          const bg = h ? intensityToColor(h.intensity) : 'color-mix(in srgb, var(--ink-muted) 28%, transparent)';
          return (
            <div
              key={zone.zone_id}
              className={clickable ? 'floor-zone is-clickable' : 'floor-zone'}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onZoneClick?.(zone) : undefined}
              onKeyDown={clickable ? (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  onZoneClick?.(zone);
                }
              } : undefined}
              style={{
                left: `${zone.bbox.x}%`,
                top: `${zone.bbox.y}%`,
                width: `${zone.bbox.w}%`,
                height: `${zone.bbox.h}%`,
                background: bg,
              }}
              title={h ? `${h.visit_count} 人次 · ${Math.round(h.avg_dwell_sec / 60)}m 停留` : zone.name}
            >
              {zone.name}
            </div>
          );
        })}
      <div className="floor-entrance">
        <svg {...chevron}>
          <path d="M3 6l5 5 5-5" />
        </svg>
        入口
      </div>
    </div>
  );
}
