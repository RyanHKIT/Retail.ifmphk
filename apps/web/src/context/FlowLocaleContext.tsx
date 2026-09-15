import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { flowMessages, type FlowLocale } from '@/i18n/flowMessages'

const STORAGE_KEY = 'ifmp_flow_locale'

function readInitialLocale(): FlowLocale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh-HK' || saved === 'en') return saved
  } catch {
    // storage unavailable — fall through to default
  }
  return 'zh-HK'
}

type FlowLocaleContextValue = {
  locale: FlowLocale
  setLocale: (locale: FlowLocale) => void
  t: (key: string) => string
}

const FlowLocaleContext = createContext<FlowLocaleContextValue | null>(null)

export function FlowLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<FlowLocale>(readInitialLocale)

  const setLocale = useCallback((next: FlowLocale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore persistence failure
    }
  }, [])

  const t = useCallback(
    (key: string) => flowMessages[locale][key] ?? flowMessages.en[key] ?? key,
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <FlowLocaleContext.Provider value={value}>{children}</FlowLocaleContext.Provider>
}

export function useFlowLocale(): FlowLocaleContextValue {
  const ctx = useContext(FlowLocaleContext)
  if (!ctx) throw new Error('useFlowLocale must be used within FlowLocaleProvider')
  return ctx
}
