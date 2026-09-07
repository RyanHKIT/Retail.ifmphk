import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { nextBeatPath, type SpineFocus } from '@/lib/demoSpine'

export const SPINE_FOCUS_KEY = 'ifmp_retail_spine_focus'

type DemoSpineState = {
  gapId?: string
  zoneId?: string
  zoneName?: string
  setFocus: (focus: SpineFocus) => void
  clearFocus: () => void
  nextHref: string
}

const DemoSpineContext = createContext<DemoSpineState | null>(null)

function readFocus(): SpineFocus {
  try {
    const raw = sessionStorage.getItem(SPINE_FOCUS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as SpineFocus
    if (!parsed || typeof parsed !== 'object') return {}
    return {
      gapId: typeof parsed.gapId === 'string' ? parsed.gapId : undefined,
      zoneId: typeof parsed.zoneId === 'string' ? parsed.zoneId : undefined,
      zoneName: typeof parsed.zoneName === 'string' ? parsed.zoneName : undefined,
    }
  } catch {
    return {}
  }
}

function writeFocus(focus: SpineFocus) {
  try {
    const empty = !focus.gapId && !focus.zoneId && !focus.zoneName
    if (empty) sessionStorage.removeItem(SPINE_FOCUS_KEY)
    else sessionStorage.setItem(SPINE_FOCUS_KEY, JSON.stringify(focus))
  } catch {
    /* ignore quota / private mode */
  }
}

export function DemoSpineProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [focus, setFocusState] = useState<SpineFocus>(() => readFocus())

  useEffect(() => {
    writeFocus(focus)
  }, [focus])

  const setFocus = useCallback((next: SpineFocus) => {
    setFocusState((prev) => ({
      gapId: next.gapId ?? prev.gapId,
      zoneId: next.zoneId ?? prev.zoneId,
      zoneName: next.zoneName ?? prev.zoneName,
    }))
  }, [])

  const clearFocus = useCallback(() => {
    setFocusState({})
  }, [])

  const value = useMemo<DemoSpineState>(
    () => ({
      gapId: focus.gapId,
      zoneId: focus.zoneId,
      zoneName: focus.zoneName,
      setFocus,
      clearFocus,
      nextHref: nextBeatPath(location.pathname + location.search),
    }),
    [focus.gapId, focus.zoneId, focus.zoneName, setFocus, clearFocus, location.pathname, location.search],
  )

  return <DemoSpineContext.Provider value={value}>{children}</DemoSpineContext.Provider>
}

export function useDemoSpine() {
  const ctx = useContext(DemoSpineContext)
  if (!ctx) throw new Error('useDemoSpine must be used within DemoSpineProvider')
  return ctx
}
