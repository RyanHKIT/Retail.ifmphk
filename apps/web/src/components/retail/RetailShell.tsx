import { useEffect, useState, type SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { currentBeatIndex, SPINE_BEAT_COUNT } from '@/lib/demoSpine';
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

type NavIcon =
  | 'overview'
  | 'footfall'
  | 'journey'
  | 'people'
  | 'gap'
  | 'roster'
  | 'coach'
  | 'energy'
  | 'settings';

type NavItem = {
  to: string;
  key: MessageKey;
  icon: NavIcon;
  end?: boolean;
};

const navGroups: { label: MessageKey; items: NavItem[] }[] = [
  {
    label: 'nav.group.floor',
    items: [
      { to: '/retail', key: 'nav.overview', icon: 'overview', end: true },
      { to: '/retail/footfall', key: 'nav.footfall', icon: 'footfall' },
      { to: '/retail/journey', key: 'nav.journey', icon: 'journey' },
      { to: '/retail/people', key: 'nav.people', icon: 'people' },
    ],
  },
  {
    label: 'nav.group.act',
    items: [
      { to: '/retail/service-gap', key: 'nav.serviceGap', icon: 'gap' },
      { to: '/retail/roster', key: 'nav.roster', icon: 'roster' },
      { to: '/retail/coach', key: 'nav.coach', icon: 'coach' },
    ],
  },
  {
    label: 'nav.group.ops',
    items: [
      { to: '/retail/energy', key: 'nav.energy', icon: 'energy' },
      { to: '/retail/settings', key: 'nav.settings', icon: 'settings' },
    ],
  },
];

const glyphStroke: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function NavGlyph({ name }: { name: NavIcon }) {
  switch (name) {
    case 'overview':
      return (
        <svg {...glyphStroke}>
          <rect x="1.75" y="1.75" width="5.5" height="5.5" rx="1" />
          <rect x="8.75" y="1.75" width="5.5" height="5.5" rx="1" />
          <rect x="1.75" y="8.75" width="5.5" height="5.5" rx="1" />
          <rect x="8.75" y="8.75" width="5.5" height="5.5" rx="1" />
        </svg>
      );
    case 'footfall':
      return (
        <svg {...glyphStroke}>
          <path d="M2.5 8h11" />
          <path d="M10.5 5.5 13.5 8l-3 2.5" />
          <path d="M6 3.5v9" />
        </svg>
      );
    case 'journey':
      return (
        <svg {...glyphStroke}>
          <circle cx="3.25" cy="12" r="1.25" />
          <circle cx="8" cy="4" r="1.25" />
          <circle cx="12.75" cy="10.5" r="1.25" />
          <path d="M4.4 11.1 6.9 5.4M9.2 4.8l2.7 4.4" />
        </svg>
      );
    case 'people':
      return (
        <svg {...glyphStroke}>
          <circle cx="8" cy="5" r="2.25" />
          <path d="M3.5 13.25c.6-2.4 2.2-3.5 4.5-3.5s3.9 1.1 4.5 3.5" />
        </svg>
      );
    case 'gap':
      return (
        <svg {...glyphStroke}>
          <path d="M8 2.75 13.75 13H2.25L8 2.75Z" />
          <path d="M8 6.5v3.25" />
          <path d="M8 11.75v.25" />
        </svg>
      );
    case 'roster':
      return (
        <svg {...glyphStroke}>
          <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.5" />
          <path d="M2.25 6.5h11.5" />
          <path d="M5.5 2.5v2" />
          <path d="M10.5 2.5v2" />
        </svg>
      );
    case 'coach':
      return (
        <svg {...glyphStroke}>
          <path d="M4 3.25h6.5L13.5 6.5v6.25H4V3.25Z" />
          <path d="M10.5 3.25V6.5H13.5" />
          <path d="M6 9h4.5" />
          <path d="M6 11.25h3" />
        </svg>
      );
    case 'energy':
      return (
        <svg {...glyphStroke}>
          <path d="M8.75 2.5 4.5 9h3.25L7.25 13.5 11.5 7H8.25L8.75 2.5Z" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...glyphStroke}>
          <circle cx="8" cy="8" r="2.25" />
          <path d="M8 2.5v1.5M8 12v1.5M2.5 8h1.5M12 8h1.5M4.1 4.1l1.1 1.1M10.8 10.8l1.1 1.1M11.9 4.1l-1.1 1.1M5.2 10.8l-1.1 1.1" />
        </svg>
      );
  }
}

function BrandMark() {
  return (
    <svg className="sidebar-mark" viewBox="0 0 28 28" aria-hidden>
      <rect width="28" height="28" rx="6" fill="currentColor" />
      <path
        fill="var(--on-accent)"
        d="M7 20V8h8.5v4.25H21V20H7Zm2.15-2.1h9.7v-3.5h-4.35V10.1H9.15v7.8Z"
      />
    </svg>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  return open ? (
    <svg {...glyphStroke}>
      <path d="M3.5 3.5 12.5 12.5" />
      <path d="M12.5 3.5 3.5 12.5" />
    </svg>
  ) : (
    <svg {...glyphStroke}>
      <path d="M2.5 4.5h11" />
      <path d="M2.5 8h11" />
      <path d="M2.5 11.5h11" />
    </svg>
  );
}

function ThemeGlyph({ isDay }: { isDay: boolean }) {
  return isDay ? (
    <svg {...glyphStroke}>
      <path d="M12 10.5A4.5 4.5 0 0 1 6.8 4.4 5.25 5.25 0 1 0 12 12.5c0-.68 0-1.35 0-2Z" />
    </svg>
  ) : (
    <svg {...glyphStroke}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.4 3.4l1.05 1.05M11.55 11.55l1.05 1.05M12.6 3.4l-1.05 1.05M4.45 11.55 3.4 12.6" />
    </svg>
  );
}

export function RetailShell() {
  const { storeId, dateKey, period, setStoreId, setDateKey, setPeriod } = useRetailFilter();
  const { theme, isDay, toggleTheme } = useRetailTheme();
  const { t, locale, setLocale, options } = useRetailLocale();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const presenter = searchParams.get('demo') === '1';
  const beatIndex = currentBeatIndex(location.pathname);
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div
      className={`app-shell${navOpen ? ' is-nav-open' : ''}`}
      data-theme={theme}
      data-locale={locale}
    >
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label={t('nav.closeMenu')}
        aria-hidden={!navOpen}
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />
      <aside id="retail-sidebar" className="sidebar" aria-label={t('brand.title')}>
        <div className="sidebar-brand">
          <BrandMark />
          <div className="sidebar-brand-copy">
            <h1>{t('brand.title')}</h1>
            <span>{t('brand.sub')}</span>
          </div>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{t(group.label)}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  onClick={() => setNavOpen(false)}
                >
                  <span className="nav-icon">
                    <NavGlyph name={item.icon} />
                  </span>
                  {t(item.key)}
                </NavLink>
              ))}
            </div>
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
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setNavOpen((open) => !open)}
            aria-expanded={navOpen}
            aria-controls="retail-sidebar"
            title={navOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-label={navOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            <MenuGlyph open={navOpen} />
          </button>
          <div className="filter-cluster" role="group" aria-label={t('filter.cluster')}>
            <label className="filter-cluster__field">
              <span className="filter-cluster__label">{t('filter.label.store')}</span>
              <select
                className="filter-select"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              >
                {STORE_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>{t(`filter.store.${s.id}` as MessageKey)}</option>
                ))}
              </select>
            </label>
            <span className="filter-cluster__rule" aria-hidden />
            <label className="filter-cluster__field">
              <span className="filter-cluster__label">{t('filter.label.date')}</span>
              <select
                className="filter-select"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
              >
                {DATE_OPTIONS.map((d) => (
                  <option key={d.id} value={d.id}>{t(`filter.date.${d.id}` as MessageKey)}</option>
                ))}
              </select>
            </label>
            <span className="filter-cluster__rule" aria-hidden />
            <label className="filter-cluster__field">
              <span className="filter-cluster__label">{t('filter.label.period')}</span>
              <select
                className="filter-select"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>{t(`filter.period.${p.id}` as MessageKey)}</option>
                ))}
              </select>
            </label>
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
              <span className="theme-toggle-icon" aria-hidden>
                <ThemeGlyph isDay={isDay} />
              </span>
              <span className="theme-toggle-text">{isDay ? t('theme.night') : t('theme.day')}</span>
            </button>
            {presenter && beatIndex !== null && (
              <div className="demo-beat-badge" aria-label={t('spine.beatLabel', { n: beatIndex })}>
                {beatIndex}/{SPINE_BEAT_COUNT - 1}
              </div>
            )}
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
