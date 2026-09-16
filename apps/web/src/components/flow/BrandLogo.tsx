import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme, type FlowTheme } from '@/context/FlowThemeContext'

/**
 * IFMP brand marks.
 *
 * The four files under `public/brand/` that came from the console are the same
 * assets the IFMP console serves, from the same paths. That is deliberate reuse
 * of one organisation's own identity across two of its own products, not
 * borrowed third-party work. `mark-rail-*.png` are our own derivatives; see
 * "Two marks" below.
 *
 * The lockups are baked rasters with a fixed ink colour, so light and night
 * need separate files rather than a CSS filter: `logo-lockup-light.png` is
 * drawn for pale surfaces, `logo-lockup-dark.png` for dark ones.
 *
 * Which lockup a page needs is a property of the *surface*, not the theme. The
 * login backdrop is a deep green in both themes now, so the login asks for the
 * dark-surface lockup explicitly through `onDark`; on that backdrop the pale
 * surface lockup's ink measures about 1.1:1 and disappears.
 *
 * Two marks, and why.
 *
 * `mark.png` is a detailed emblem: a solid badge, 73.6% of it fully opaque,
 * whose internal structure is carried by colour and not by alpha. Measured
 * against our `rgb(255,255,255)` nav it averages 4.11:1 but only 55.5% of its
 * pixels clear the 3:1 bar for a graphical object, because its pale interior
 * tones sit close to the white behind them. At the 19x24 the rail actually
 * renders it, that interior structure is sub-pixel and averages away anyway.
 *
 * So the rail uses a derivative, `mark-rail-*.png`, and the rest of the product
 * keeps the authentic artwork. The derivatives hold the original alpha and
 * silhouette and remap the original per-pixel luminance onto a high-contrast
 * ramp, which preserves the emblem's structure instead of flattening it to a
 * silhouette. On the white nav `mark-rail-light.png` averages 10.04:1 with
 * 99.8% of pixels at or above 3:1, against 4.11:1 and 55.5% for the original.
 * On the `#151c2e` night nav `mark-rail-dark.png` averages 8.70:1 with 100% at
 * or above 3:1 and a floor of 3.97:1, against 6.14:1 and 71.3% for the
 * original. Recolouring at this size costs nothing measurable, whereas at the
 * 64px login lockup the authentic artwork is legible and is kept untouched.
 *
 * This module deliberately sits outside `shell/pilot-v1/`. Brand identity
 * outlives any one chrome, and both the login page and the route gate need to
 * draw it without depending on a shell that is designed to be deleted.
 */

const LOCKUP_LIGHT = '/brand/logo-lockup-light.png'
const LOCKUP_DARK = '/brand/logo-lockup-dark.png'

/** The authentic emblem. Used wherever it is large enough to be read. */
const MARK = '/brand/mark.png'

/** Rail-only high-contrast derivatives of `MARK`. See "Two marks" above. */
const MARK_RAIL_LIGHT = '/brand/mark-rail-light.png'
const MARK_RAIL_DARK = '/brand/mark-rail-dark.png'

/**
 * Exported so non-image uses (a favicon, a canvas) can pick the same file.
 *
 * `onDark` names the surface the lockup will sit on, for pages whose ground the
 * theme alone does not describe -- the login backdrop is deep green in both
 * themes.
 */
export function lockupSrcFor(theme: FlowTheme, onDark = false): string {
  return theme === 'night' || onDark ? LOCKUP_DARK : LOCKUP_LIGHT
}

type BrandLogoProps = {
  /**
   * Decorative marks carry no accessible name and are hidden from assistive
   * tech. Use this wherever the product name is already announced by nearby
   * text, so a screen reader does not hear "IFMP Retail" twice.
   */
  decorative?: boolean
}

type BrandLockupProps = BrandLogoProps & {
  /** Force the light-ink artwork. Set on the login, whose ground is dark. */
  onDark?: boolean
}

/** The full IFMP wordmark, for roomy placements. */
export function BrandLockup({ decorative = false, onDark = false }: BrandLockupProps) {
  const { t } = useFlowLocale()
  const { theme } = useFlowTheme()

  return (
    <img
      src={lockupSrcFor(theme, onDark)}
      alt={decorative ? '' : t('product.name')}
      className="brand-lockup"
      aria-hidden={decorative || undefined}
      draggable={false}
      data-testid="brand-lockup"
    />
  )
}

/**
 * The authentic compact IFMP glyph. Kept for placements large enough to show
 * its detail -- currently the route gate's loading state.
 */
export function BrandMark({ decorative = false }: BrandLogoProps) {
  const { t } = useFlowLocale()

  return (
    <img
      src={MARK}
      alt={decorative ? '' : t('product.name')}
      className="brand-mark"
      aria-hidden={decorative || undefined}
      draggable={false}
      data-testid="brand-mark"
    />
  )
}

/**
 * The rail's high-contrast mark. Same silhouette and same accessible-name
 * contract as `BrandMark`; only the ink differs. Carries `brand-mark` as well
 * so the rail's existing sizing rules apply unchanged.
 */
export function BrandRailMark({ decorative = false }: BrandLogoProps) {
  const { t } = useFlowLocale()
  const { theme } = useFlowTheme()

  return (
    <img
      src={theme === 'night' ? MARK_RAIL_DARK : MARK_RAIL_LIGHT}
      alt={decorative ? '' : t('product.name')}
      className="brand-mark brand-mark-rail"
      aria-hidden={decorative || undefined}
      draggable={false}
      data-testid="brand-rail-mark"
    />
  )
}
