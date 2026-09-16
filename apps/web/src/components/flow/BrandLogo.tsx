import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme, type FlowTheme } from '@/context/FlowThemeContext'

/**
 * IFMP brand marks.
 *
 * The four files under `public/brand/` are the same assets the IFMP console
 * serves, from the same paths. That is deliberate reuse of one organisation's
 * own identity across two of its own products, not borrowed third-party work.
 *
 * The lockups are baked rasters with a fixed ink colour, so light and night
 * need separate files rather than a CSS filter: `logo-lockup-light.png` is
 * drawn for light surfaces, `logo-lockup-dark.png` for dark ones.
 *
 * `mark.png` is the console's light-surface glyph: a blue body with grey inset
 * detail, exported with alpha. Measured against our `rgb(255,255,255)` nav it
 * averages 4.11:1 -- the blue body is 6.3:1 and ~55% of its pixels clear the
 * 3:1 non-text bar, with the soft grey reading as sub-pixel detail at 24px.
 * Against the night nav rgb(21,28,46) it averages 6.16:1. The console's own
 * logo component renders this one file unfiltered in both themes, so we do
 * too: a recoloured copy would flatten the two-tone artwork to a silhouette.
 *
 * This module deliberately sits outside `shell/pilot-v1/`. Brand identity
 * outlives any one chrome, and both the login page and the route gate need to
 * draw it without depending on a shell that is designed to be deleted.
 */

const LOCKUP_LIGHT = '/brand/logo-lockup-light.png'
const LOCKUP_DARK = '/brand/logo-lockup-dark.png'
const MARK = '/brand/mark.png'

/** Exported so non-image uses (a favicon, a canvas) can pick the same file. */
export function lockupSrcFor(theme: FlowTheme): string {
  return theme === 'night' ? LOCKUP_DARK : LOCKUP_LIGHT
}

type BrandLogoProps = {
  /**
   * Decorative marks carry no accessible name and are hidden from assistive
   * tech. Use this wherever the product name is already announced by nearby
   * text, so a screen reader does not hear "IFMP Retail" twice.
   */
  decorative?: boolean
}

/** The full IFMP wordmark, for roomy placements. */
export function BrandLockup({ decorative = false }: BrandLogoProps) {
  const { t } = useFlowLocale()
  const { theme } = useFlowTheme()

  return (
    <img
      src={lockupSrcFor(theme)}
      alt={decorative ? '' : t('product.name')}
      className="brand-lockup"
      aria-hidden={decorative || undefined}
      draggable={false}
      data-testid="brand-lockup"
    />
  )
}

/** The compact IFMP glyph, for tight spaces such as the collapsed nav rail. */
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
