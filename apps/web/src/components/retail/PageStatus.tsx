import type { ReactNode } from 'react';
import { useRetailLocale } from '@/context/RetailLocaleContext';

type PageStatusProps = {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
};

export function PageStatus({ loading, error, onRetry, children }: PageStatusProps) {
  const { t } = useRetailLocale();

  if (loading) return <div className="loading">{t('common.loading')}</div>;

  if (error) {
    return (
      <div className="empty-state page-load-error" role="alert">
        <p>{t('common.loadError')}</p>
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
