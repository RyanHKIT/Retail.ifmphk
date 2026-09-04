import type { ZonesData, HeatmapData } from '@/api/retail';

const INTENSITY_COLORS = [
  'rgba(225, 29, 72, 0.25)',
  'rgba(225, 29, 72, 0.45)',
  'rgba(225, 29, 72, 0.65)',
  'rgba(225, 29, 72, 0.85)',
  'rgba(225, 29, 72, 1)',
];

function intensityToColor(intensity: number): string {
  const idx = Math.min(4, Math.floor(intensity * 5));
  return INTENSITY_COLORS[idx] ?? INTENSITY_COLORS[0];
}

interface FloorHeatmapProps {
  zones: ZonesData['zones'];
  heat?: HeatmapData['zones'];
  compact?: boolean;
}

export function FloorHeatmap({ zones, heat, compact }: FloorHeatmapProps) {
  const heatMap = new Map(heat?.map((z) => [z.zone_id, z]) ?? []);

  return (
    <div className="floor-plan" style={compact ? { aspectRatio: '16/8' } : undefined}>
      {zones
        .filter((z) => z.zone_id !== 'entrance' || !compact)
        .map((zone) => {
          const h = heatMap.get(zone.zone_id);
          const bg = h ? intensityToColor(h.intensity) : 'rgba(42,42,52,0.6)';
          return (
            <div
              key={zone.zone_id}
              className="floor-zone"
              style={{
                left: `${zone.bbox.x}%`,
                top: `${zone.bbox.y}%`,
                width: `${zone.bbox.w}%`,
                height: `${zone.bbox.h}%`,
                background: bg,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              title={h ? `${h.visit_count} 人次 · ${Math.round(h.avg_dwell_sec / 60)}m 停留` : zone.name}
            >
              {zone.name}
            </div>
          );
        })}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          background: 'rgba(0,0,0,0.5)',
          padding: '4px 8px',
          borderRadius: 4,
        }}
      >
        入口 ↓
      </div>
    </div>
  );
}
