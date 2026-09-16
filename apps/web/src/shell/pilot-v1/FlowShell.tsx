import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme } from '@/context/FlowThemeContext'
import { ChatPanel } from '@/components/flow/ChatPanel'
import { FLOW_NAV } from '@/shell/nav'
import { navIcon } from './navIcons'
import { useNavCollapsed } from './useNavCollapsed'

/**
 * pilot-v1 chrome. Delete `src/shell/pilot-v1/` (plus the shim import in
 * `components/flow/FlowShell.tsx`) to swap in a new shell; nav lives in
 * `src/shell/nav.ts` and surfaces keep their own stylesheet.
 */
export function FlowShell() {
  const { t, locale, setLocale } = useFlowLocale()
  const { theme, setTheme } = useFlowTheme()
  const { profile, signOut } = useFlowAuth()
  const navigate = useNavigate()
  const { collapsed, isRailCapable, toggle } = useNavCollapsed()

  async function handleSignOut() {
    await signOut()
    navigate('/flow/login', { replace: true })
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'active' : undefined

  return (
    <div className="flow-app flow-shell" data-theme={theme} data-testid="flow-app">
      <nav
        className={`flow-nav${collapsed ? ' is-collapsed' : ''}`}
        aria-label="IFMP Retail"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div className="flow-nav-head">
          <div className="flow-nav-brand">
            {collapsed ? t('product.name').slice(0, 1) : t('product.name')}
            {!collapsed && <small>{t('product.subtitle')}</small>}
          </div>
          {isRailCapable && (
            <button
              type="button"
              className="flow-nav-collapse"
              onClick={toggle}
              aria-expanded={!collapsed}
              aria-label={
                collapsed ? t('nav.expand') : t('nav.collapse')
              }
              title={collapsed ? t('nav.expand') : t('nav.collapse')}
              data-testid="flow-nav-collapse"
            >
              {collapsed ? (
                <PanelLeftOpen size={16} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={16} aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {FLOW_NAV.map((group) => (
          <div key={group.groupKey} className="flow-nav-section">
            <div className="flow-nav-group">{t(group.groupKey)}</div>
            {group.items.map((item) => {
              const Icon = navIcon(item.to)
              const label = t(item.labelKey)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navClass}
                  // Collapsed rows are icon-only, so the label becomes the
                  // accessible name and the native tooltip.
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                >
                  {Icon && <Icon size={16} className="flow-nav-icon" aria-hidden="true" />}
                  {!collapsed && <span className="flow-nav-label">{label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="flow-main">
        <header className="flow-topbar">
          <span className="flow-topbar-site">{t('site.name')}</span>
          <div className="flow-topbar-actions">
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'night' : 'light')}
              data-testid="flow-theme-toggle"
            >
              {theme === 'light' ? t('settings.theme.night') : t('settings.theme.light')}
            </button>
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

      {/* Mounted at the shell so it persists across navigation. */}
      <ChatPanel />
    </div>
  )
}
