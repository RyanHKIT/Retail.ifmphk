import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme } from '@/context/FlowThemeContext'
import { BrandLockup } from '@/components/flow/BrandLogo'

/**
 * /flow login.
 *
 * The skeleton — centred column on a full-bleed backdrop, top bar with the
 * lockup and a language pill, lockup plus one muted line, hairline-separated
 * form, small centred footnote — mirrors the sibling IFMP console login at
 * ifmphk.com/login so the two read as one family. See `styles/flow-login.css`
 * for what was copied and what was changed, including why the backdrop is
 * green here.
 *
 * The sign-in path itself is unchanged.
 */
export function LoginPage() {
  const { t, locale, setLocale } = useFlowLocale()
  const { theme } = useFlowTheme()
  const { signIn } = useFlowAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError(t('auth.required'))
      return
    }
    setSubmitting(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (signInError) {
      setError(t('auth.invalid'))
      return
    }
    navigate('/flow', { replace: true })
  }

  return (
    <div className="flow-app flow-login" data-theme={theme}>
      {/* Decorative backdrop: the console's two-ellipse glow plus its 48px
          grid overlay, in green. */}
      <div className="flow-login-glow" aria-hidden="true" />
      <div className="flow-login-grid" aria-hidden="true" />

      <header className="flow-login-top">
        {/* Decorative: the lockup in the column below carries the accessible
            name, so announcing this one too would just repeat it.
            `onDark` because this page's ground is a deep green in both themes,
            where the pale-surface lockup's ink is about 1.1:1. */}
        <BrandLockup decorative onDark />
        {/* The console puts the language control in this bar, and it is the
            first place a manager can use it: the preference is applied before
            they can reach the shell's own toggle. */}
        <button
          type="button"
          className="flow-login-lang"
          onClick={() => setLocale(locale === 'zh-HK' ? 'en' : 'zh-HK')}
          data-testid="login-locale-toggle"
        >
          {locale === 'zh-HK' ? 'EN' : '中文'}
        </button>
      </header>

      <main className="flow-login-main">
        <div className="flow-login-panel">
          <div className="flow-login-lockup">
            <BrandLockup onDark />
            <h1 className="flow-login-subtitle">{t('auth.loginSubtitle')}</h1>
            <p className="flow-login-site">{t('site.name')}</p>
          </div>

          <form onSubmit={handleSubmit} className="flow-login-form">
            <label className="flow-login-field">
              <span>{t('auth.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                data-testid="login-email"
              />
            </label>
            <label className="flow-login-field">
              <span>{t('auth.password')}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                data-testid="login-password"
              />
            </label>
            {error && (
              <p className="flow-login-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" disabled={submitting} data-testid="login-submit">
              {submitting ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <p className="flow-login-foot">{t('auth.staffOnly')}</p>
        </div>
      </main>
    </div>
  )
}
