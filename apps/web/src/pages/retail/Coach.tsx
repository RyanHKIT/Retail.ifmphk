import { useEffect, useMemo, useState } from 'react';
import { api } from '@/api/retail';
import type { GapEvent } from '@/api/retail';
import { PageStatus } from '@/components/retail/PageStatus';
import { useRetailFilter } from '@/context/RetailFilterContext';
import { getDispatches, isDispatched, markDispatched, type DispatchRecord } from '@/lib/dispatchStore';
import { getDisplayRules } from '@/lib/settingsStore';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import type { MessageKey } from '@/i18n/messages';

function vlItems(summary: string | null): string[] {
  if (!summary) return [];
  return summary
    .split(/[。\n]+/)
    .map((s) => s.replace(/[；;]+$/g, '').trim())
    .filter(Boolean);
}

export function CoachPage() {
  const { storeId } = useRetailFilter();
  const { t } = useRetailLocale();
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [events, setEvents] = useState<GapEvent[]>([]);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [dispatches, setDispatches] = useState<Record<string, DispatchRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const rules = getDisplayRules();
  const dwellSec = rules.dwell_threshold_sec;
  const slaSec = rules.first_contact_sec;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.gapEvents().then((data) => {
      if (cancelled) return;
      setEvents(data.items);
      setDispatches(getDispatches());
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reload]);

  const zones = useMemo(() => {
    const set = new Map<string, string>();
    events.forEach((e) => set.set(e.zone_id ?? e.zone_name, e.zone_name));
    return [...set.entries()];
  }, [events]);

  const filtered = events.filter((e) => {
    if (zoneFilter === 'all') return true;
    return (e.zone_id ?? e.zone_name) === zoneFilter;
  });

  const refresh = () => setDispatches(getDispatches());

  const onDispatch = (e: GapEvent) => {
    markDispatched(e.gap_id, e.zone_name, 'coach');
    refresh();
  };

  return (
    <PageStatus loading={loading} error={error} onRetry={() => setReload((n) => n + 1)}>
      <h1 className="page-title">{t('coach.title')}</h1>
      <p className="page-subtitle">
        {storeLabel} · {t('coach.subtitle', { sec: dwellSec, sla: slaSec })}
      </p>

      <div className="toolbar-row">
        <label className="filter-inline">
          {t('common.zone')}
          <select
            className="filter-select"
            value={zoneFilter}
            onChange={(ev) => setZoneFilter(ev.target.value)}
          >
            <option value="all">{t('common.all')}</option>
            {zones.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <span className="toolbar-meta">
          {t('coach.count', {
            n: filtered.length,
            d: filtered.filter((e) => isDispatched(e.gap_id)).length,
          })}
        </span>
      </div>

      <div className="coach-list">
        {filtered.map((e) => {
          const done = Boolean(dispatches[e.gap_id]);
          const items = vlItems(e.vl_summary);
          return (
            <div key={e.gap_id} className="coach-card card">
              <div className="coach-card-head">
                <div>
                  <strong>{e.zone_name}</strong>
                  <span className="coach-time">{e.started_at.slice(11, 16)} · {e.duration_display}</span>
                </div>
                <div className="coach-badges">
                  {e.vl_review_status === 'confirmed' && <span className="badge badge-confirmed">{t('coach.vlConfirmed')}</span>}
                  {e.vl_review_status === 'pending' && <span className="badge badge-pending">{t('gap.pending')}</span>}
                  {done && <span className="badge badge-dispatched">{t('common.dispatched')}</span>}
                </div>
              </div>
              <div className="vl-box" style={{ marginTop: 12 }}>
                <div className="vl-box-label">{t('coach.vlLabel')}</div>
                {items.length === 0 ? (
                  <p className="vl-empty">{t('coach.noVl')}</p>
                ) : (
                  <ul className="vl-summary-list">
                    {items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="coach-meta">
                {t('coach.customers')} {e.customer_count} · {t('coach.staff')} {e.staff_count} · {t('coach.clip')} {e.clip_url}
              </div>
              <div className="btn-row" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={done}
                  onClick={() => onDispatch(e)}
                >
                  {done ? t('common.markedDispatch') : t('common.markDispatch')}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div className="empty-state">{t('coach.empty')}</div>}
      </div>
    </PageStatus>
  );
}
