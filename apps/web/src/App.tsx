import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { FlowLocaleProvider } from '@/context/FlowLocaleContext'
import { FlowThemeProvider } from '@/context/FlowThemeContext'
import { FlowAuthProvider } from '@/context/FlowAuthContext'
import { RequireManager } from '@/components/flow/RequireManager'
import { FlowShell } from '@/components/flow/FlowShell'
import { LoginPage } from '@/pages/flow/Login'
import { OverviewPage as FlowOverviewPage } from '@/pages/flow/Overview'
import { EntrancesPage } from '@/pages/flow/Entrances'
import { JourneyPage as FlowJourneyPage } from '@/pages/flow/Journey'
import { AudiencePage } from '@/pages/flow/Audience'
import { ComparePage } from '@/pages/flow/Compare'
import { HolidaysPage } from '@/pages/flow/Holidays'
import { DevicesPage } from '@/pages/flow/Devices'
import { SettingsPage as FlowSettingsPage } from '@/pages/flow/Settings'
import { FlowStubPage } from '@/pages/flow/FlowStubPage'
import { WeekBoardPage } from '@/pages/flow/roster/WeekBoard'
import { StaffPage } from '@/pages/flow/roster/Staff'
import { TemplatesPage } from '@/pages/flow/roster/Templates'
import { PoliciesPage } from '@/pages/flow/roster/Policies'
import { SwapsPage } from '@/pages/flow/roster/Swaps'
import { AuditPage } from '@/pages/flow/roster/Audit'

type Health = {
  ok?: boolean
  service?: string
  error?: string
}

function HomeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-10">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--color-line)] pb-6">
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-[var(--color-muted)] uppercase">
            IntelliBuild IFMP
          </p>
          <h1 className="display mt-2 text-3xl font-semibold tracking-tight">Frontend Next</h1>
          <p className="mt-2 max-w-xl text-[var(--color-muted)]">
            Parallel UI package. Current production console stays in repo-root <code>src/</code>.
          </p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link className="rounded-md px-3 py-1.5 hover:bg-white" to="/">
            Home
          </Link>
          <Link className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-white hover:opacity-90" to="/flow">
            IFMP Retail（pilot）
          </Link>
        </nav>
      </header>
      {children}
    </div>
  )
}

function HomePage() {
  const [health, setHealth] = useState<Health | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/health')
        const data = (await res.json().catch(() => ({}))) as Health
        if (!cancelled) setHealth({ ok: res.ok, ...data })
      } catch (err) {
        if (!cancelled) {
          setHealth({
            ok: false,
            error: err instanceof Error ? err.message : 'API unreachable',
          })
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <HomeShell>
      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-sm">
        <h2 className="display text-xl font-semibold">Scaffold ready</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Dev server runs on <strong>:5174</strong> and proxies <code>/api</code> to the existing Express
          backend (<code>:3000</code> by default).
        </p>
        <Link
          to="/flow"
          className="mt-4 inline-flex items-center rounded-xl bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          開啟 IFMP Retail（pilot）→
        </Link>
        <div
          className={cn(
            'mt-5 rounded-xl border px-4 py-3 text-sm',
            health?.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-amber-200 bg-amber-50 text-amber-950',
          )}
        >
          {health == null && 'Checking /api/health…'}
          {health?.ok && <>API connected{health.service ? ` · ${health.service}` : ''}.</>}
          {health && !health.ok && (
            <>
              API not reachable yet. Start the root backend with <code>npm run start</code>, then refresh.
              {health.error ? ` (${health.error})` : ''}
            </>
          )}
        </div>
      </section>
    </HomeShell>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* The retail demo was removed once /flow superseded it. Keep old links
          and bookmarks alive instead of rendering a blank page. */}
      <Route path="/retail/*" element={<Navigate to="/flow" replace />} />
      <Route
        path="/flow"
        element={
          <FlowLocaleProvider>
            <FlowThemeProvider>
              <FlowAuthProvider>
                <Outlet />
              </FlowAuthProvider>
            </FlowThemeProvider>
          </FlowLocaleProvider>
        }
      >
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireManager />}>
          <Route element={<FlowShell />}>
            <Route index element={<FlowOverviewPage />} />
            <Route path="entrances" element={<EntrancesPage />} />
            <Route path="journey" element={<FlowJourneyPage />} />
            <Route path="audience" element={<AudiencePage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="holidays" element={<HolidaysPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="settings" element={<FlowSettingsPage />} />
            <Route path="roster" element={<WeekBoardPage />} />
            <Route path="roster/staff" element={<StaffPage />} />
            <Route path="roster/templates" element={<TemplatesPage />} />
            <Route path="roster/policies" element={<PoliciesPage />} />
            <Route path="roster/swaps" element={<SwapsPage />} />
            <Route path="roster/audit" element={<AuditPage />} />
            <Route path="*" element={<FlowStubPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
