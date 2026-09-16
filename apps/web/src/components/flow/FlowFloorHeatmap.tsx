import { useLayoutEffect, useRef } from 'react'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { paintDensityField, type DensityPoint } from '@/lib/densityField'
import type { JourneyPayload, ZoneKey } from '@/lib/footfall/api'
import { renormalizeHeat, type HeatMetric } from '@/lib/journeyMetrics'

export type { HeatMetric }

type FlowFloorHeatmapProps = {
  payload: JourneyPayload
  metric: HeatMetric
  compact?: boolean
  focusedKey: ZoneKey | null
  onZoneClick: (key: ZoneKey) => void
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function FlowFloorHeatmap({
  payload,
  metric,
  compact,
  focusedKey,
  onZoneClick,
}: FlowFloorHeatmapProps) {
  const { locale } = useFlowLocale()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const label = locale === 'en' ? payload.floorPlanLabelEn : payload.floorPlanLabelZh

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const intensities = renormalizeHeat(payload.heat, metric)

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

      const points: DensityPoint[] = payload.zones.map((z) => ({
        x: z.anchorX,
        y: z.anchorY,
        r: z.anchorR,
        intensity: intensities.get(z.id) ?? 0,
      }))

      const img = paintDensityField(width, height, points, {
        maxAlpha: compact ? 120 : 180,
      })
      ctx.putImageData(img, 0, 0)
    }

    paint()
    if (prefersReducedMotion()) return

    const ro = new ResizeObserver(() => paint())
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [payload.zones, payload.heat, metric, compact])

  return (
    <div
      ref={wrapRef}
      className={compact ? 'flow-heat flow-heat--compact' : 'flow-heat flow-heat--hero'}
      data-testid="flow-heat"
    >
      <img src={payload.floorPlanUrl} alt={label} className="flow-heat-plan" />
      <canvas
        ref={canvasRef}
        className="flow-heat-canvas"
        data-testid="flow-heat-canvas"
        aria-hidden
      />
      {payload.zones.map((z) => (
        <button
          key={z.zoneKey}
          type="button"
          className="flow-heat-hit"
          data-testid={`flow-heat-zone-${z.zoneKey}`}
          aria-label={locale === 'en' ? z.nameEn : z.nameZh}
          aria-pressed={focusedKey === z.zoneKey}
          style={{
            left: `${z.anchorX}%`,
            top: `${z.anchorY}%`,
            width: `${z.anchorR * 2}%`,
            height: `${z.anchorR * 2}%`,
          }}
          onClick={() => onZoneClick(z.zoneKey)}
        />
      ))}
    </div>
  )
}
