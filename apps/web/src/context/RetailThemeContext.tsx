import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type RetailTheme = 'night' | 'day';

const STORAGE_KEY = 'ifmp_retail_theme';

type ChartTheme = {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
};

type RetailThemeState = {
  theme: RetailTheme;
  isDay: boolean;
  toggleTheme: () => void;
  setTheme: (t: RetailTheme) => void;
  chart: ChartTheme;
};

const CHART: Record<RetailTheme, ChartTheme> = {
  night: {
    grid: '#2a2a34',
    axis: '#71717a',
    tooltipBg: '#1a1a20',
    tooltipBorder: '#2a2a34',
  },
  day: {
    grid: '#e4e4e7',
    axis: '#71717a',
    tooltipBg: '#ffffff',
    tooltipBorder: '#d4d4d8',
  },
};

const RetailThemeContext = createContext<RetailThemeState | null>(null);

function readInitial(): RetailTheme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'day' || v === 'night') return v;
  } catch {
    /* ignore */
  }
  return 'night';
}

export function RetailThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<RetailTheme>(() => readInitial());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo<RetailThemeState>(() => ({
    theme,
    isDay: theme === 'day',
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((t) => (t === 'day' ? 'night' : 'day')),
    chart: CHART[theme],
  }), [theme]);

  return <RetailThemeContext.Provider value={value}>{children}</RetailThemeContext.Provider>;
}

export function useRetailTheme() {
  const ctx = useContext(RetailThemeContext);
  if (!ctx) throw new Error('useRetailTheme must be used within RetailThemeProvider');
  return ctx;
}
