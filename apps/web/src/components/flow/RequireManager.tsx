import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useFlowAuth } from '@/context/FlowAuthContext'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { BrandMark } from '@/components/flow/BrandLogo'

/**
 * Route gate for the Flow pilot.
 * - While loading OR resolving a profile for an existing session: show quiet loading state
 *   (prevents login flash for signed-in manager and post-sign-in redirect race).
 * - No session / no profile / non-manager role → redirect to /flow/login.
 * - Pilot role policy: only branch_manager passes. Owner/staff surfaces arrive later.
 */
export function RequireManager() {
  const { session, profile, loading, resolvingProfile } = useFlowAuth()
  const { t } = useFlowLocale()
  const location = useLocation()

  if (loading || (session && resolvingProfile)) {
    return (
      <div className="flow-app flow-gate-loading">
        {/* Decorative: this is a transient boot state, and the product name is
            already in the document title. */}
        <BrandMark decorative />
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  const isManager = profile?.role === 'branch_manager'
  if (!session || !profile || !isManager) {
    return <Navigate to="/flow/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
