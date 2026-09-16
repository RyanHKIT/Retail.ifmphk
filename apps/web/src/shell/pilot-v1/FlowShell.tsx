import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { FLOW_NAV } from '@/shell/nav'

/**
 * pilot-v1 chrome. Delete `src/shell/pilot-v1/` (plus the shim import in
 * `components/flow/FlowShell.tsx`) to swap in a new shell; nav lives in
 * `src/shell/nav.ts` and surfaces keep their own stylesheet.
 */
export function FlowShell() {
  const { t, locale, setLocale } = useFlowLocale()
  const { profile, signOut } = useFlowAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/flow/login', { replace: true })
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'active' : undefined

  return (
    <div className="flow-app flow-shell">
      <nav className="flow-nav" aria-label="IFMP Retail">
        <div className="flow-nav-brand">
          {t('product.name')}
          <small>{t('product.subtitle')}</small>
        </div>

        {FLOW_NAV.map((group) => (
          <div key={group.groupKey}>
            <div className="flow-nav-group">{t(group.groupKey)}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navClass}
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="flow-main">
        <header className="flow-topbar">
          <span className="flow-topbar-site">{t('site.name')}</span>
          <div className="flow-topbar-actions">
            <button
              type="button"
              onClick={() => setLocale(locale === 'zh-HK' ? 'en' : 'zh-HK')}
              data-testid="flow-locale-toggle"
            >
              {locale === 'zh-HK' ? 'EN' : '中文'}
            </button>
            <span>{profile?.display_name}</span>
            <button type="button" onClick={handleSignOut} data-testid="flow-signout">
              {t('auth.signOut')}
            </button>
          </div>
        </header>
        <main className="flow-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
