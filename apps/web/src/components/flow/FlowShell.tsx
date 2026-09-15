import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import '@/styles/flow.css'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'

export function FlowShell() {
  const { t, locale, setLocale } = useFlowLocale()
  const { profile, signOut } = useFlowAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/flow/login', { replace: true })
  }

  const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined)

  return (
    <div className="flow-app flow-shell">
      <nav className="flow-nav" aria-label="IFMP Retail">
        <div className="flow-nav-brand">
          {t('product.name')}
          <small>{t('product.subtitle')}</small>
        </div>

        <div className="flow-nav-group">{t('nav.overview')}</div>
        <NavLink end to="/flow" className={navClass}>
          {t('nav.overview')}
        </NavLink>
        <NavLink to="/flow/journey" className={navClass}>
          {t('nav.journey')}
        </NavLink>
        <NavLink to="/flow/entrances" className={navClass}>
          {t('nav.entrances')}
        </NavLink>
        <NavLink to="/flow/audience" className={navClass}>
          {t('nav.audience')}
        </NavLink>
        <NavLink to="/flow/compare" className={navClass}>
          {t('nav.compare')}
        </NavLink>
        <NavLink to="/flow/holidays" className={navClass}>
          {t('nav.holidays')}
        </NavLink>

        <div className="flow-nav-group">{t('nav.roster')}</div>
        <NavLink to="/flow/roster" className={navClass}>
          {t('nav.roster')}
        </NavLink>
        <NavLink to="/flow/roster/staff" className={navClass}>
          {t('nav.rosterStaff')}
        </NavLink>
        <NavLink to="/flow/roster/templates" className={navClass}>
          {t('nav.rosterTemplates')}
        </NavLink>
        <NavLink to="/flow/roster/policies" className={navClass}>
          {t('nav.rosterPolicies')}
        </NavLink>
        <NavLink to="/flow/roster/swaps" className={navClass}>
          {t('nav.rosterSwaps')}
        </NavLink>
        <NavLink to="/flow/roster/audit" className={navClass}>
          {t('nav.rosterAudit')}
        </NavLink>

        <div className="flow-nav-group">{t('nav.settings')}</div>
        <NavLink to="/flow/devices" className={navClass}>
          {t('nav.devices')}
        </NavLink>
        <NavLink to="/flow/settings" className={navClass}>
          {t('nav.settings')}
        </NavLink>
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
