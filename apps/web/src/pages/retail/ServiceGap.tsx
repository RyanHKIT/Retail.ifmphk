import { Fragment, useEffect, useState, type MouseEvent } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { GapSummary, GapEvent, GapByZone, StaffingMatrix } from '@/api/retail';
import { SourceChip } from '@/components/retail/SourceChip';
import type { SourceChipSource } from '@/components/retail/SourceChip';
import { getDispatches, markDispatched, type DispatchRecord } from '@/lib/dispatchStore';
import { useRetailFilter } from '@/context/RetailFilterContext';
import { loadRuleOverrides } from '@/lib/settingsStore';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { chartTooltipStyle } from '@/lib/chartStyle';
import type { MessageKey } from '@/i18n/messages';

export function ServiceGapPage() {
  const { storeId } = useRetailFilter();
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [summary, setSummary] = useState<GapSummary | null>(null);
  const [events, setEvents] = useState<GapEvent[]>([]);
  const [byZone, setByZone] = useState<GapByZone[]>([]);
  const [matrix, setMatrix] = useState<StaffingMatrix | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dispatches, setDispatches] = useState<Record<string, DispatchRecord>>({});
  const [source, setSource] = useState<SourceChipSource | null>(null);
  const [loading, setLoading] = useState(true);
  const dwellSec = loadRuleOverrides()?.dwell_threshold_sec ?? 120;

  useEffect(() => {
    Promise.all([
      fetchMockWithMeta<GapSummary>('gap-summary.json'),
      api.gapEvents(),
      api.gapByZone(),
      api.staffingMatrix(),
    ]).then(([s, e, z, m]) => {
      setSummary(s.data);
      setSource(toChipSource(s.meta?.source));
      setEvents(e.items);
      setByZone(z.zones);
      setMatrix(m);
      setDispatches(getDispatches());
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading">{t('common.loading')}</div>;

  const zoneBarData = byZone.map((z) => ({
    name: z.name,
    [t('gap.times')]: z.gap_count,
    分鐘: Math.round(z.total_duration_sec / 60),
  }));

  const vlBadge = (s: string) => {
    if (s === 'confirmed') return <span className="badge badge-confirmed">{t('gap.confirmed')}</span>;
    if (s === 'pending') return <span className="badge badge-pending">{t('gap.pending')}</span>;
    return <span className="badge">{s}</span>;
  };

  const onDispatch = (e: GapEvent, ev: MouseEvent) => {
    ev.stopPropagation();
    markDispatched(e.gap_id, e.zone_name);
    setDispatches(getDispatches());
  };

  return (
    <>
      <div className="page-title-row">
        <h1 className="page-title">{t('gap.title')}</h1>
        {source && <SourceChip source={source} />}
      </div>
      <p className="page-subtitle">
        {storeLabel} · {t('gap.subtitle', { sec: dwellSec })}
      </p>

      <div className="grid-kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-label">{t('gap.count')}</div>
          <div><span className="kpi-value">{summary?.gap_count}</span><span className="kpi-unit">{t('gap.times')}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t('gap.duration')}</div>
          <div><span className="kpi-value" style={{ fontSize: '1.4rem' }}>{summary?.total_gap_duration_display}</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t('gap.under')}</div>
          <div><span className="kpi-value">{summary?.understaffed_pct}</span><span className="kpi-unit">%</span></div>
          <div className="kpi-change down">{t('gap.weighted')}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">{t('gap.over')}</div>
          <div><span className="kpi-value">{summary?.overstaffed_pct}</span><span className="kpi-unit">%</span></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">{t('gap.byZone')}</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={zoneBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="name" stroke={chart.axis} fontSize={11} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Bar dataKey={t('gap.times')} fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
            {t('gap.pain')}
          </p>
        </div>
        <div className="card">
          <div className="card-title">{t('gap.vl')}</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                {summary?.vl_review.confirmed}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('gap.confirmed')}</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
                {summary?.vl_review.pending}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('gap.pending')}</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {summary?.vl_review.false_positive}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('gap.falsePos')}</div>
            </div>
          </div>
          <div className="vl-box" style={{ marginTop: 20 }}>
            {t('gap.vlNote')}
          </div>
        </div>
      </div>

      {matrix && (
        <div className="card" style={{ marginTop: 20, marginBottom: 20 }}>
          <div className="card-title">{t('gap.matrix')}</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>時段</th>
                  {matrix.hours.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(matrix.zone_labels).map(([zoneId, label]) => (
                  <tr key={zoneId}>
                    <th style={{ textAlign: 'left' }}>{label}</th>
                    {matrix.matrix.map((row) => {
                      const cell = row.cells.find((c) => c.zone_id === zoneId);
                      const color = matrix.status_legend[cell?.status ?? 'normal']?.color ?? '#4CAF50';
                      return (
                        <td key={row.hour}>
                          <div
                            className="matrix-cell"
                            style={{ background: color }}
                            title={`${cell?.staff ?? 0}/${cell?.expected ?? 0} 人`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="legend-row">
            {Object.entries(matrix.status_legend).map(([k, v]) => (
              <span key={k}>
                <span className="legend-dot" style={{ background: v.color }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">{t('gap.detail')}</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('gap.time')}</th>
              <th>{t('common.zone')}</th>
              <th>{t('gap.customers')}</th>
              <th>{t('gap.staff')}</th>
              <th>{t('gap.dwell')}</th>
              <th>VL</th>
              <th>{t('common.dispatch')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const done = Boolean(dispatches[e.gap_id]);
              return (
                <Fragment key={e.gap_id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === e.gap_id ? null : e.gap_id)}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{e.started_at.slice(11, 16)}</td>
                    <td>{e.zone_name}</td>
                    <td>{e.customer_count}</td>
                    <td>{e.staff_count}</td>
                    <td>{e.duration_display}</td>
                    <td>{vlBadge(e.vl_review_status)}</td>
                    <td onClick={(ev) => ev.stopPropagation()}>
                      <button
                        type="button"
                        className={`btn btn-sm ${done ? 'btn-ghost' : 'btn-primary'}`}
                        disabled={done}
                        onClick={(ev) => onDispatch(e, ev)}
                      >
                        {done ? t('common.dispatched') : t('common.dispatch')}
                      </button>
                    </td>
                    <td style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>{expanded === e.gap_id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === e.gap_id && (
                    <tr key={`${e.gap_id}-detail`}>
                      <td colSpan={8}>
                        <div className="vl-box">{e.vl_summary ?? t('gap.noVl')}</div>
                        <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {t('gap.clip')}: {e.clip_url} · {e.started_at} → {e.ended_at}
                          {done && dispatches[e.gap_id] && (
                            <> · {t('gap.at')} {dispatches[e.gap_id].dispatched_at}</>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
