import { useFlowLocale } from '@/context/FlowLocaleContext'
import { useFlowTheme, type FlowTheme } from '@/context/FlowThemeContext'

/**
 * /flow/settings — shell-agnostic settings surface (Phase 5 Task 5).
 * Theme + locale come from contexts, so a replacement shell can reuse this
 * page without importing anything from `@/shell/pilot-v1`.
 */
export function SettingsPage() {
  const { t, locale, setLocale } = useFlowLocale()
  const { theme, setTheme } = useFlowTheme()

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      <section>
        <h2>{t('settings.theme')}</h2>
        {(['light', 'night'] as FlowTheme[]).map((value) => (
          <label key={value}>
            <input
              type="radio"
              name="flow-theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
            />
            {t(`settings.theme.${value}`)}
          </label>
        ))}
      </section>

      <section>
        <h2>{t('settings.language')}</h2>
        <button
          type="button"
          onClick={() => setLocale(locale === 'zh-HK' ? 'en' : 'zh-HK')}
          data-testid="settings-locale-toggle"
        >
          {locale === 'zh-HK' ? 'EN' : '中文'}
        </button>
      </section>

      <section>
        <h2>{t('settings.branch')}</h2>
        <p>{t('site.name')}</p>
      </section>

      <p data-testid="settings-honesty">{t('settings.honesty')}</p>
    </div>
  )
}

export default SettingsPage
