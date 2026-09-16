import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme, type FlowTheme } from '@/context/FlowThemeContext'

/**
 * IFMP brand marks.
 *
 * The assets from the console under `public/brand/` are the same four files the
 * IFMP console serves, from the same paths. That is deliberate reuse of one
 * organisation's own identity across two of its own products, not borrowed
 * third-party work. `logo-lockup-login.png` and `mark-hc-*.png` are our own
 * derivatives; both are explained below.
 *
 * Three surfaces, three inks.
 *
 * The authentic assets are fixed-colour rasters, so the file has to match the
 * ground it sits on. There are three grounds in the pilot, and each needs a
 * different ink:
 *
 *   pale surface  -> `logo-lockup-light.png` (dark navy ink)
 *   dark surface  -> `logo-lockup-dark.png`  (light ink)
 *   login green   -> `logo-lockup-login.png` (our light monochrome derivative)
 *
 * `lockupSrcFor` names the surface rather than the theme, because the surface
 * is what actually decides legibility. The login is the case that proves it: its
 * ground is the same deep green in both themes, so the theme cannot select the
 * ink. Nothing is recoloured to achieve this -- the authentic files are picked
 * by ground. `logo-lockup-light.png` is the default for a pale surface and is
 * kept for that, though every lockup placement in the pilot currently sits on a
 * dark or green ground.
 *
 * Why the login needs a derivative.
 *
 * `logo-lockup-dark.png` is a two-tone composite, not a single ink: of its
 * opaque pixels, roughly 19% are pale cyan and 13% near-black. That is why no
 * near-uniform ground can satisfy both halves -- measured on the login, its
 * badge cleared 3:1 on 0.9% of pixels and its wordmark on 61.7%. Rather than
 * recolour a brand asset by hand, `logo-lockup-login.png` is derived
 * mechanically: the original alpha and silhouette are untouched and each opaque
 * pixel's luminance is remapped onto a single pale-green-to-white ramp. That
 * keeps the structure (it is a monotonic remap, not a flattening) and moves
 * every solid ink pixel to 3.38:1 or better against the lightest region of the
 * real login ground, 100% of them at 3:1 or better.
 *
 * Why the compact mark has a derivative too.
 *
 * `mark.png` is a detailed emblem: 73.6% of it is fully opaque and its internal
 * structure is carried by colour rather than by alpha. Measured against a white
 * panel it averages 4.11:1 but only 55.5% of its pixels clear the 3:1 bar for a
 * graphical object, because its pale interior tones sit close to the white
 * behind them. At the 19x24 the rail renders it, that interior detail is
 * sub-pixel and averages away anyway, so `mark-hc-*.png` apply the same
 * luminance remap for a high-contrast result: 99.8% of pixels at 3:1 or better
 * on white against 55.5% for the original. The rail and the route gate both use
 * these, because both sit on the light shell background; the authentic
 * `mark.png` is kept for placements large enough to show its detail.
 *
 * This module deliberately sits outside `shell/pilot-v1/`. Brand identity
 * outlives any one chrome, and the login page and the route gate both need to
 * draw it without depending on a shell that is designed to be deleted.
 */

const LOCKUP_LIGHT = '/brand/logo-lockup-light.png'
const LOCKUP_DARK = '/brand/logo-lockup-dark.png'
/** Derivative: light monochrome, for the login's deep green in either theme. */
const LOCKUP_LOGIN = '/brand/logo-lockup-login.png'

/** The authentic emblem. Used wherever it is large enough to be read. */
const MARK = '/brand/mark.png'

/** High-contrast derivatives of `MARK`. See "Why the compact mark" above. */
const MARK_HC_LIGHT = '/brand/mark-hc-light.png'
const MARK_HC_DARK = '/brand/mark-hc-dark.png'

/**
 * The ground a mark will sit on. Not the theme: the login's green is the same
 * in both themes, so the ground is the honest input.
 */
export type BrandSurface = 'light' | 'dark' | 'login'

/** Exported so non-image uses (a favicon, a canvas) can pick the same file. */
export function lockupSrcFor(surface: BrandSurface): string {
  if (surface === 'login') return LOCKUP_LOGIN
  return surface === 'dark' ? LOCKUP_DARK : LOCKUP_LIGHT
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
  /**
   * Which ground the lockup sits on. Defaults to the current theme -- pass
   * `login` on the login page, whose green ground the theme does not describe.
   */
  surface?: 'theme' | BrandSurface
}

/** The full IFMP wordmark, for roomy placements. */
export function BrandLockup({ decorative = false, surface = 'theme' }: BrandLockupProps) {
  const { t } = useFlowLocale()
  const { theme } = useFlowTheme()

  // `theme` is the fallback rather than a required input so callers that do sit
  // on a themed shell surface do not have to restate what the theme already
  // says.
  const resolved: BrandSurface =
    surface === 'theme' ? ((theme as FlowTheme) === 'night' ? 'dark' : 'light') : surface

  return (
    <img
      src={lockupSrcFor(resolved)}
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
 * its detail; prefer `BrandHighContrastMark` on the shell's light background.
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
 * The compact mark at high contrast, for the light shell background (the nav
 * rail and the route-gate loading state). Same silhouette and same
 * accessible-name contract as `BrandMark`; only the ink differs. Carries
 * `brand-mark` as well so the existing sizing rules apply unchanged.
 */
export function BrandHighContrastMark({ decorative = false }: BrandLogoProps) {
  const { t } = useFlowLocale()
  const { theme } = useFlowTheme()

  return (
    <img
      src={theme === 'night' ? MARK_HC_DARK : MARK_HC_LIGHT}
      alt={decorative ? '' : t('product.name')}
      className="brand-mark brand-mark-hc"
      aria-hidden={decorative || undefined}
      draggable={false}
      data-testid="brand-hc-mark"
    />
  )
}
