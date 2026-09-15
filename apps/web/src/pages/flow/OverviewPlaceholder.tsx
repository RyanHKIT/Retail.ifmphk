import { useFlowLocale } from '@/context/FlowLocaleContext'

export function OverviewPlaceholder() {
  const { t } = useFlowLocale()
  return (
    <div className="flow-placeholder">
      <h2>{t('nav.overview')}</h2>
      <p>
        {t('common.comingSoon')} — Phase 3 (widgets 1–8) · {t('site.name')}
      </p>
    </div>
  )
}
