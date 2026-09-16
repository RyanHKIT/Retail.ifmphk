import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme } from '@/context/FlowThemeContext'

export function LoginPage() {
  const { t } = useFlowLocale()
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
      <div className="flow-login-card">
        <p className="flow-login-brand">{t('product.name')}</p>
        <h1 className="flow-login-title">{t('auth.signIn')}</h1>
        <p className="flow-login-site">{t('site.name')}</p>
        <form onSubmit={handleSubmit} className="flow-login-form">
          <label>
            <span>{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              data-testid="login-email"
            />
          </label>
          <label>
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
            {t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}
