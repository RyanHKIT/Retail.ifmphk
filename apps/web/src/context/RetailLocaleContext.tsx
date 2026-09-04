import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LOCALE_OPTIONS, translate, type Locale, type MessageKey } from '@/i18n/messages';

const STORAGE_KEY = 'ifmp_retail_locale';

type RetailLocaleState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  options: typeof LOCALE_OPTIONS;
};

const RetailLocaleContext = createContext<RetailLocaleState | null>(null);

function readInitial(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'zh-Hant' || v === 'zh-Hans' || v === 'en') return v;
  } catch {
    /* ignore */
  }
  return 'zh-Hant';
}

export function RetailLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readInitial());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'en' ? 'en' : locale === 'zh-Hans' ? 'zh-CN' : 'zh-HK';
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo<RetailLocaleState>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t,
      options: LOCALE_OPTIONS,
    }),
    [locale, t],
  );

  return <RetailLocaleContext.Provider value={value}>{children}</RetailLocaleContext.Provider>;
}

export function useRetailLocale() {
  const ctx = useContext(RetailLocaleContext);
  if (!ctx) throw new Error('useRetailLocale must be used within RetailLocaleProvider');
  return ctx;
}
