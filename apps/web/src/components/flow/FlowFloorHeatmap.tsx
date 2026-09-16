import { useLayoutEffect, useRef, useState } from 'react'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { paintDensityField, spreadHeatPoints, type DensityPoint } from '@/lib/densityField'
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

type PlotBox = { left: number; top: number; width: number; height: number }

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Inner shop walls of it-cwb-demo.png, as % of the floorplan image. */
const SHOP_FRAME = { x: 10.59, y: 11.57, w: 80.21, h: 70.84 }

export function shopClipPx(plot: PlotBox): { x: number; y: number; w: number; h: number } {
  return {
    x: plot.left + (SHOP_FRAME.x / 100) * plot.width,
    y: plot.top + (SHOP_FRAME.y / 100) * plot.height,
    w: (SHOP_FRAME.w / 100) * plot.width,
    h: (SHOP_FRAME.h / 100) * plot.height,
  }
}

function clipHeatToShop(ctx: CanvasRenderingContext2D, plot: PlotBox) {
  if (plot.width <= 0 || plot.height <= 0) return
  if (typeof ctx.fillRect !== 'function' || typeof ctx.save !== 'function') return
  const r = shopClipPx(plot)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = '#fff'
  ctx.fillRect(r.x, r.y, r.w, r.h)
  ctx.restore()
}

/** Sit the name box on printed labels of this demo plan. Heat kernels stay on anchors. */
const NAME_BOX: Record<ZoneKey, { x: number; y: number }> = {
  entrance: { x: 50, y: 91.2 },
  shelf_a: { x: 30.4, y: 40.4 },
  shelf_b: { x: 61.2, y: 40.6 },
  fitting_room: { x: 79.4, y: 19.2 },
  cashier: { x: 80.2, y: 67.5 },
}

function measurePlot(wrap: HTMLDivElement): PlotBox {
  const rect = wrap.getBoundingClientRect()
  const img = wrap.querySelector('img')
  const nw = img?.naturalWidth ?? 0
  const nh = img?.naturalHeight ?? 0
  if (nw <= 0 || nh <= 0) {
    return { left: 0, top: 0, width: rect.width, height: rect.height }
  }
  const scale = Math.min(rect.width / nw, rect.height / nh)
  const width = nw * scale
  const height = nh * scale
  return {
    left: (rect.width - width) / 2,
    top: (rect.height - height) / 2,
    width,
    height,
  }
}

export function FlowFloorHeatmap({
  payload,
  metric,
  compact,
  focusedKey,
  onZoneClick,
}: FlowFloorHeatmapProps) {
  const { locale, t } = useFlowLocale()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [plot, setPlot] = useState<PlotBox>({ left: 0, top: 0, width: 0, height: 0 })
  const label = locale === 'en' ? payload.floorPlanLabelEn : payload.floorPlanLabelZh

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const intensities = renormalizeHeat(payload.heat, metric)

    const paint = () => {
      const next = measurePlot(wrap)
      setPlot((prev) =>
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      )
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

      const points: DensityPoint[] = spreadHeatPoints(
        payload.zones.map((z) => ({
          x: z.anchorX,
          y: z.anchorY,
          r: z.anchorR,
          intensity: intensities.get(z.id) ?? 0,
        })),
      )

      const img = paintDensityField(width, height, points, {
        maxAlpha: compact ? 170 : 210,
      })
      ctx.putImageData(img, 0, 0)
      clipHeatToShop(ctx, next)
    }

    paint()
    const plan = wrap.querySelector('img')
    plan?.addEventListener('load', paint)
    if (prefersReducedMotion()) {
      return () => plan?.removeEventListener('load', paint)
    }

    const ro = new ResizeObserver(() => paint())
    ro.observe(wrap)
    return () => {
      ro.disconnect()
      plan?.removeEventListener('load', paint)
    }
  }, [payload.zones, payload.heat, metric, compact])

  const heatByKey = new Map(payload.heat.map((row) => [row.zoneKey, row]))

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
      {payload.zones.map((z) => {
        const name = locale === 'en' ? z.nameEn : z.nameZh
        const box = NAME_BOX[z.zoneKey] ?? { x: z.anchorX, y: z.anchorY }
        const selected = focusedKey === z.zoneKey
        const heat = heatByKey.get(z.zoneKey)
        return (
          <button
            key={z.zoneKey}
            type="button"
            className="flow-heat-label"
            data-testid={`flow-heat-zone-${z.zoneKey}`}
            aria-pressed={selected}
            style={{
              left: plot.left + (box.x / 100) * plot.width,
              top: plot.top + (box.y / 100) * plot.height,
            }}
            onClick={() => onZoneClick(z.zoneKey)}
          >
            <span className="flow-heat-label-name">{name}</span>
            {selected && heat && !compact ? (
              <span className="flow-heat-label-detail">
                <span>
                  {t('journey.focusVisits')}: {heat.visitCount}
                </span>
                <span>
                  {t('journey.focusDwell')}: {heat.avgDwellSec} {t('journey.sec')}
                </span>
              </span>
            ) : null}
          </button>
        )
      })}
      <div className="flow-heat-legend" data-testid="flow-heat-legend">
        <span>{t('journey.low')}</span>
        <span className="flow-heat-legend-bar" aria-hidden />
        <span>{t('journey.high')}</span>
      </div>
    </div>
  )
}
