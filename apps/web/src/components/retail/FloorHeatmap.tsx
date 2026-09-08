import { useEffect, useRef, type SVGProps } from 'react'
import type { ZonesData, HeatmapData } from '@/api/retail'
import { paintDensityField, type DensityPoint } from '@/lib/densityField'

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
}

interface FloorHeatmapProps {
  zones: ZonesData['zones']
  heat?: HeatmapData['zones']
  floorPlanUrl: string
  floorPlanLabel?: string
  compact?: boolean
  hero?: boolean
  onZoneClick?: (zone: ZonesData['zones'][number]) => void
}

export function FloorHeatmap({
  zones,
  heat,
  floorPlanUrl,
  floorPlanLabel,
  compact,
  hero,
  onZoneClick,
}: FloorHeatmapProps) {
  const heatMap = new Map(heat?.map((z) => [z.zone_id, z]) ?? [])
  const clickable = Boolean(onZoneClick)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const planClass = [
    'floor-plan',
    compact ? 'floor-plan--compact' : '',
    hero ? 'floor-plan--hero' : '',
    clickable ? 'floor-plan--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const label = floorPlanLabel ?? '示範平面圖'

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const byId = new Map(heat?.map((z) => [z.zone_id, z]) ?? [])

    const paint = () => {
      const rect = wrap.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)

      const points: DensityPoint[] = zones
        .filter((z) => z.anchor)
        .map((z) => {
          const h = byId.get(z.zone_id)
          return {
            x: z.anchor.x,
            y: z.anchor.y,
            r: z.anchor.r,
            intensity: h?.intensity ?? 0.2,
          }
        })

      const img = paintDensityField(width, height, points, {
        maxAlpha: compact ? 110 : 180,
      })
      ctx.putImageData(img, 0, 0)
    }

    paint()
    const ro = new ResizeObserver(() => paint())
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [zones, heat, compact])

  return (
    <div className={planClass} ref={wrapRef}>
      <img className="floor-plan__base" src={floorPlanUrl} alt={label} />
      <canvas className="floor-plan__heat" aria-hidden ref={canvasRef} />
      <div className="floor-plan__hits">
        {zones.map((zone) => {
          const h = heatMap.get(zone.zone_id)
          const title = h
            ? `${zone.name} · ${h.visit_count} 人次 · ${Math.round(h.avg_dwell_sec / 60)}m 停留`
            : zone.name
          return (
            <button
              key={zone.zone_id}
              type="button"
              className={clickable ? 'floor-hit is-clickable' : 'floor-hit'}
              style={{
                left: `${zone.anchor.x}%`,
                top: `${zone.anchor.y}%`,
                width: `${zone.anchor.r * 2}%`,
                height: `${zone.anchor.r * 2}%`,
                transform: 'translate(-50%, -50%)',
              }}
              aria-label={zone.name}
              title={title}
              disabled={!clickable}
              onClick={clickable ? () => onZoneClick?.(zone) : undefined}
            />
          )
        })}
      </div>
      <div className="floor-entrance">
        <svg {...chevron}>
          <path d="M3 6l5 5 5-5" />
        </svg>
        入口
      </div>
    </div>
  )
}
