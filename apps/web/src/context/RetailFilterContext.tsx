import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export const STORE_OPTIONS = [
  { id: 'IT-001' },
  { id: 'IT-002' },
  { id: 'IT-003' },
] as const;

export const DATE_OPTIONS = [
  { id: 'today' },
  { id: 'yesterday' },
] as const;

export const PERIOD_OPTIONS = [
  { id: 'full' },
  { id: 'peak' },
] as const;

type RetailFilterState = {
  storeId: string;
  dateKey: string;
  period: string;
  setStoreId: (id: string) => void;
  setDateKey: (id: string) => void;
  setPeriod: (id: string) => void;
};

const RetailFilterContext = createContext<RetailFilterState | null>(null);

export function RetailFilterProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState('IT-001');
  const [dateKey, setDateKey] = useState('today');
  const [period, setPeriod] = useState('full');

  const value = useMemo(
    () => ({ storeId, dateKey, period, setStoreId, setDateKey, setPeriod }),
    [storeId, dateKey, period],
  );

  return <RetailFilterContext.Provider value={value}>{children}</RetailFilterContext.Provider>;
}

export function useRetailFilter() {
  const ctx = useContext(RetailFilterContext);
  if (!ctx) throw new Error('useRetailFilter must be used within RetailFilterProvider');
  return ctx;
}
