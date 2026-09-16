export type DensityPoint = { x: number; y: number; r: number; intensity: number }

/**
 * Visual-only: fatten zone blobs and stitch corridors so the overlay reads as a
 * continuous store heatmap. Real dwell/visit math stays on heatmap_daily.
 */
export function spreadHeatPoints(points: DensityPoint[]): DensityPoint[] {
  if (points.length === 0) return []
  const out: DensityPoint[] = []
  let sx = 0
  let sy = 0
  let si = 0
  for (const p of points) {
    out.push({ ...p, r: Math.min(40, p.r * 2.6) })
    sx += p.x
    sy += p.y
    si += p.intensity
  }
  const n = points.length
  const avgI = si / n
  out.push({
    x: sx / n,
    y: Math.max(18, sy / n - 6),
    r: 52,
    intensity: Math.max(0.1, avgI * 0.18),
  })
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i]!
      const b = points[j]!
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (dist > 58) continue
      const steps = 4
      for (let s = 1; s < steps; s += 1) {
        const u = s / steps
        out.push({
          x: a.x + (b.x - a.x) * u,
          y: a.y + (b.y - a.y) * u,
          r: Math.min(30, (a.r + b.r) * 1.15),
          intensity: (a.intensity * (1 - u) + b.intensity * u) * 0.45,
        })
      }
    }
  }
  return out
}

type ColorStop = { t: number; r: number; g: number; b: number; a: number }

/** Classic jet (blue → cyan → green → yellow → red). Visual-only; not a CV field. */
const RAMP: ColorStop[] = [
  { t: 0, r: 0, g: 0, b: 140, a: 0 },
  { t: 0.08, r: 0, g: 0, b: 180, a: 120 },
  { t: 0.22, r: 0, g: 80, b: 255, a: 150 },
  { t: 0.38, r: 0, g: 210, b: 210, a: 165 },
  { t: 0.52, r: 50, g: 200, b: 40, a: 175 },
  { t: 0.68, r: 255, g: 230, b: 0, a: 190 },
  { t: 0.85, r: 255, g: 110, b: 0, a: 205 },
  { t: 1, r: 255, g: 0, b: 0, a: 220 },
]

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function sampleRamp(t: number, maxAlpha: number): [number, number, number, number] {
  const clamped = Math.min(1, Math.max(0, t))
  let i = 0
  while (i < RAMP.length - 2 && RAMP[i + 1]!.t < clamped) i += 1
  const a = RAMP[i]!
  const b = RAMP[i + 1]!
  const span = b.t - a.t || 1
  const u = (clamped - a.t) / span
  const alphaScale = maxAlpha / 220
  return [
    Math.round(lerp(a.r, b.r, u)),
    Math.round(lerp(a.g, b.g, u)),
    Math.round(lerp(a.b, b.b, u)),
    Math.round(lerp(a.a, b.a, u) * alphaScale),
  ]
}

/** Fill Float32 intensity buffer (length = width*height). */
export function accumulateGaussians(
  width: number,
  height: number,
  points: DensityPoint[],
  out: Float32Array,
): void {
  out.fill(0)
  const minDim = Math.min(width, height)
  for (const p of points) {
    if (p.intensity <= 0 || p.r <= 0) continue
    const cx = (p.x / 100) * width
    const cy = (p.y / 100) * height
    const sigma = ((p.r / 100) * minDim) / 2.2
    if (sigma <= 0) continue
    const radius = sigma * 3.5
    const x0 = Math.max(0, Math.floor(cx - radius))
    const x1 = Math.min(width - 1, Math.ceil(cx + radius))
    const y0 = Math.max(0, Math.floor(cy - radius))
    const y1 = Math.min(height - 1, Math.ceil(cy + radius))
    const invTwoSigmaSq = 1 / (2 * sigma * sigma)
    const peak = p.intensity
    for (let y = y0; y <= y1; y += 1) {
      const dy = y + 0.5 - cy
      for (let x = x0; x <= x1; x += 1) {
        const dx = x + 0.5 - cx
        const g = peak * Math.exp(-(dx * dx + dy * dy) * invTwoSigmaSq)
        out[y * width + x] += g
      }
    }
  }
}

/** Map intensity buffer → RGBA (length width*height*4). */
export function colorizeDensity(
  intensity: Float32Array,
  _width: number,
  _height: number,
  outRgba: Uint8ClampedArray,
  opts?: { maxAlpha?: number },
): void {
  const maxAlpha = opts?.maxAlpha ?? 180
  let peak = 0
  for (let i = 0; i < intensity.length; i += 1) {
    if (intensity[i]! > peak) peak = intensity[i]!
  }
  const invPeak = peak > 0 ? 1 / peak : 0
  for (let i = 0; i < intensity.length; i += 1) {
    const raw = intensity[i]!
    const t = raw <= 0 ? 0 : Math.min(1, raw * invPeak)
    const [r, g, b, a] = sampleRamp(t, maxAlpha)
    const o = i * 4
    outRgba[o] = r
    outRgba[o + 1] = g
    outRgba[o + 2] = b
    outRgba[o + 3] = a
  }
}

function makeImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
  if (typeof ImageData !== 'undefined') {
    try {
      // Copy into a fresh ArrayBuffer-backed view for DOM ImageData typing.
      const copy = new Uint8ClampedArray(data.length)
      copy.set(data)
      return new ImageData(copy, width, height)
    } catch {
      // jsdom / older environments
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData
}

export function paintDensityField(
  width: number,
  height: number,
  points: DensityPoint[],
  opts?: { maxAlpha?: number },
): ImageData {
  const intensity = new Float32Array(width * height)
  accumulateGaussians(width, height, points, intensity)
  const rgba = new Uint8ClampedArray(width * height * 4)
  colorizeDensity(intensity, width, height, rgba, opts)
  return makeImageData(rgba, width, height)
}
