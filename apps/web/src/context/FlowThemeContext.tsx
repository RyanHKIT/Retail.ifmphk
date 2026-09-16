import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type FlowTheme = 'light' | 'night'

const STORAGE_KEY = 'flow-theme'

function readInitialTheme(): FlowTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'night') return saved
  } catch {
    // storage unavailable
  }
  return 'light'
}

type FlowThemeContextValue = {
  theme: FlowTheme
  setTheme: (theme: FlowTheme) => void
}

const FlowThemeContext = createContext<FlowThemeContextValue | null>(null)

export function FlowThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<FlowTheme>(readInitialTheme)

  const setTheme = useCallback((next: FlowTheme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore persistence failure
    }
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <FlowThemeContext.Provider value={value}>
      {children}
    </FlowThemeContext.Provider>
  )
}

export function useFlowTheme(): FlowThemeContextValue {
  const ctx = useContext(FlowThemeContext)
  if (!ctx) throw new Error('useFlowTheme must be used within FlowThemeProvider')
  return ctx
}
