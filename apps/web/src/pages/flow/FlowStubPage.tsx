import { useParams } from 'react-router-dom'
import { useFlowLocale } from '@/context/FlowLocaleContext'

/**
 * Phase 1 stub for every Flow sub-route (journey, entrances, audience, compare,
 * holidays, roster/*, devices, settings). Real pages arrive in Phase 2–4 plans.
 */
export function FlowStubPage() {
  const { t } = useFlowLocale()
  const params = useParams()
  const path = params['*'] ?? ''
  return (
    <div className="flow-placeholder">
      <h2>{path}</h2>
      <p>
        {t('common.comingSoon')} — Phase 2 / 3 / 4
      </p>
    </div>
  )
}
