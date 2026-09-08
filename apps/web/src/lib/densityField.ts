export type DensityPoint = { x: number; y: number; r: number; intensity: number }

type ColorStop = { t: number; r: number; g: number; b: number; a: number }

/** Teal → warm ramp aligned with retail chart tokens (canvas needs hex/rgb). */
const RAMP: ColorStop[] = [
  { t: 0, r: 12, g: 111, b: 106, a: 0 },
  { t: 0.25, r: 12, g: 111, b: 106, a: 40 },
  { t: 0.55, r: 20, g: 160, b: 140, a: 90 },
  { t: 0.8, r: 220, g: 140, b: 60, a: 140 },
  { t: 1, r: 200, g: 70, b: 50, a: 180 },
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
  const alphaScale = maxAlpha / 180
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
  const soft = peak > 0 ? 1 / peak : 0
  for (let i = 0; i < intensity.length; i += 1) {
    const raw = intensity[i]!
    const t = raw <= 0 ? 0 : 1 - Math.exp(-raw * soft * 2.2)
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
