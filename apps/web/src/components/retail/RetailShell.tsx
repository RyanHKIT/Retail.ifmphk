import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  DATE_OPTIONS,
  PERIOD_OPTIONS,
  PRIMARY_DEMO_STORE_ID,
  STORE_OPTIONS,
  useRetailFilter,
} from '@/context/RetailFilterContext';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import type { MessageKey } from '@/i18n/messages';

const nav = [
  { to: '/retail', key: 'nav.overview' as const, icon: '◉', end: true },
  { to: '/retail/footfall', key: 'nav.footfall' as const, icon: '⇄' },
  { to: '/retail/journey', key: 'nav.journey' as const, icon: '◎' },
  { to: '/retail/people', key: 'nav.people' as const, icon: '👤' },
  { to: '/retail/service-gap', key: 'nav.serviceGap' as const, icon: '⚠' },
  { to: '/retail/roster', key: 'nav.roster' as const, icon: '☰' },
  { to: '/retail/coach', key: 'nav.coach' as const, icon: '★' },
  { to: '/retail/energy', key: 'nav.energy' as const, icon: '⚡' },
  { to: '/retail/settings', key: 'nav.settings' as const, icon: '⚙' },
];

export function RetailShell() {
  const { storeId, dateKey, period, setStoreId, setDateKey, setPeriod } = useRetailFilter();
  const { theme, isDay, toggleTheme } = useRetailTheme();
  const { t, locale, setLocale, options } = useRetailLocale();
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);

  return (
    <div className="app-shell" data-theme={theme} data-locale={locale}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>{t('brand.title')}</h1>
          <span>{t('brand.sub')}</span>
        </div>
        <nav>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link to="/" className="sidebar-home">
            {t('nav.backHome')}
          </Link>
          {storeLabel} · {t('common.mock')}
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-filters">
            <select
              className="filter-select"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
            >
              {STORE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{t(`filter.store.${s.id}` as MessageKey)}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
            >
              {DATE_OPTIONS.map((d) => (
                <option key={d.id} value={d.id}>{t(`filter.date.${d.id}` as MessageKey)}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>{t(`filter.period.${p.id}` as MessageKey)}</option>
              ))}
            </select>
          </div>
          <div className="topbar-actions">
            <label className="lang-switch" title={t('lang.label')}>
              <span className="lang-switch-label">{t('lang.label')}</span>
              <select
                className="filter-select lang-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as typeof locale)}
                aria-label={t('lang.label')}
              >
                {options.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              title={isDay ? t('theme.toNight') : t('theme.toDay')}
              aria-label={isDay ? t('theme.toNight') : t('theme.toDay')}
            >
              <span className="theme-toggle-icon" aria-hidden>{isDay ? '🌙' : '☀️'}</span>
              <span>{isDay ? t('theme.night') : t('theme.day')}</span>
            </button>
            <div className="topbar-badge">{t('topbar.alerts')}</div>
          </div>
        </header>
        <main className="page-content">
          {storeId !== PRIMARY_DEMO_STORE_ID && (
            <div className="demo-banner" role="note" data-store-sample="shared">
              {t('filter.storeSharedSample')}
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
