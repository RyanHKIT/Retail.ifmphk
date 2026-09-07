import { Fragment, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { GapSummary, GapEvent, GapByZone, StaffingMatrix } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { PageStatus } from '@/components/retail/PageStatus';
import { SourceChip } from '@/components/retail/SourceChip';
import { SpineNav } from '@/components/retail/SpineNav';
import type { SourceChipSource } from '@/components/retail/SourceChip';
import {
  getDispatches, isDispatched, listDispatched, markDispatched, countPending, type DispatchRecord,
} from '@/lib/dispatchStore';
import { gapDeepLink } from '@/lib/demoSpine';
import { useDemoSpine } from '@/context/DemoSpineContext';
import { useRetailFilter } from '@/context/RetailFilterContext';
import { getDisplayRules } from '@/lib/settingsStore';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';
import type { MessageKey } from '@/i18n/messages';

function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
      className="row-expand-icon"
    >
      <path
        d={expanded ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ServiceGapPage() {
  const { storeId } = useRetailFilter();
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const { gapId, zoneId, zoneName, setFocus } = useDemoSpine();
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [summary, setSummary] = useState<GapSummary | null>(null);
  const [events, setEvents] = useState<GapEvent[]>([]);
  const [byZone, setByZone] = useState<GapByZone[]>([]);
  const [matrix, setMatrix] = useState<StaffingMatrix | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dispatches, setDispatches] = useState<Record<string, DispatchRecord>>({});
  const [source, setSource] = useState<SourceChipSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [rules, setRules] = useState(getDisplayRules);
  const dwellSec = rules.dwell_threshold_sec;
  const slaSec = rules.first_contact_sec;
  const dwellMin = Math.max(1, Math.round(dwellSec / 60));

  useEffect(() => {
    const refreshRules = () => setRules(getDisplayRules());
    window.addEventListener('retail-settings', refreshRules);
    window.addEventListener('storage', refreshRules);
    return () => {
      window.removeEventListener('retail-settings', refreshRules);
      window.removeEventListener('storage', refreshRules);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetchMockWithMeta<GapSummary>('gap-summary.json'),
      api.gapEvents(),
      api.gapByZone(),
      api.staffingMatrix(),
    ]).then(([s, e, z, m]) => {
      if (cancelled) return;
      setSummary(s.data);
      setSource(toChipSource(s.meta?.source));
      setEvents(e.items);
      setByZone(z.zones);
      setMatrix(m);
      setDispatches(getDispatches());
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reload]);

  const gapIds = useMemo(() => events.map((e) => e.gap_id), [events]);
  const pendingCount = countPending(gapIds);
  const nextPending = events.find((e) => !isDispatched(e.gap_id));

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

  const refreshDispatch = () => setDispatches(getDispatches());

  const onDispatch = (e: GapEvent, ev?: MouseEvent) => {
    ev?.stopPropagation();
    markDispatched(e.gap_id, e.zone_name);
    setFocus({ gapId: e.gap_id, zoneId: e.zone_id, zoneName: e.zone_name });
    refreshDispatch();
  };

  const dispatchedIds = listDispatched();
  const handoff = gapDeepLink({ gapId, zoneId, zoneName });

  return (
    <PageStatus loading={loading} error={error} onRetry={() => setReload((n) => n + 1)}>
      <div className="page-title-row">
        <h1 className="page-title">{t('gap.title')}</h1>
        {source && <SourceChip source={source} />}
      </div>
      <p className="page-subtitle">
        {storeLabel} · {t('gap.subtitle', { min: dwellMin })}
      </p>
      <SpineNav />

      <div className="source-hint-strip" role="note">
        <span className="rule-chip">{t('gap.rule', { min: dwellMin })}</span>
        <span className="rule-chip">{t('gap.sla', { sec: slaSec })}</span>
        <span className="source-hint-copy">
          {t('common.dispatched')} {dispatchedIds.length}
        </span>
      </div>

      <section className="dispatch-hero chart-enter" aria-label={t('gap.pendingDispatch')}>
        <div className="dispatch-hero-lead">
          <div className="situation-label">{t('gap.pendingDispatch')}</div>
          <div>
            <span className="counter-hero-value">{pendingCount}</span>
            <span className="situation-unit">{t('gap.times')}</span>
          </div>
        </div>
        {nextPending ? (
          <div className="dispatch-hero-action">
            <div className="dispatch-hero-meta">
              <strong>{nextPending.zone_name}</strong>
              <span>{nextPending.started_at.slice(11, 16)} · {nextPending.duration_display}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={(ev) => onDispatch(nextPending, ev)}
            >
              {t('gap.dispatchHero')}
            </button>
          </div>
        ) : (
          <div className="dispatch-hero-meta dispatch-hero-meta--done">
            {t('common.dispatched')} {dispatchedIds.length}
          </div>
        )}
      </section>

      {dispatchedIds.length > 0 && (gapId || zoneName || zoneId) && (
        <div className="spine-handoff btn-row">
          <Link className="btn btn-primary" to={handoff.coach}>{t('spine.toCoach')}</Link>
          <Link className="btn btn-ghost" to={handoff.roster}>{t('spine.toRoster')}</Link>
        </div>
      )}

      <section
        className="overview-situation situation-strip chart-enter"
        aria-label={t('gap.situation')}
        style={{ animationDelay: 'calc(1 * var(--duration-enter-stagger))' }}
      >
        <div className="situation-cell situation-cell--lead">
          <div className="situation-label">{t('gap.count')}</div>
          <div>
            <span className="situation-value">{summary?.gap_count}</span>
            <span className="situation-unit">{t('gap.times')}</span>
          </div>
        </div>
        <div className="situation-cell">
          <div className="situation-label">{t('gap.duration')}</div>
          <div>
            <span className="situation-value">{summary?.total_gap_duration_display}</span>
          </div>
        </div>
        <div className="situation-cell">
          <div className="situation-label">{t('gap.under')}</div>
          <div>
            <span className="situation-value">{summary?.understaffed_pct}</span>
            <span className="situation-unit">%</span>
          </div>
          <div className="situation-delta">{t('gap.weighted')}</div>
        </div>
      </section>

      <div className="gap-evidence">
        <div className="grid-2">
          <ChartPanel title={t('gap.byZone')} staggerIndex={0}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={zoneBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="name" stroke={chart.axis} fontSize={11} />
                <YAxis stroke={chart.axis} fontSize={11} />
                <Tooltip contentStyle={chartTooltipStyle(chart)} />
                <Bar dataKey={t('gap.times')} fill={CHART[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
              {t('gap.pain')}
            </p>
          </ChartPanel>
          <div className="card chart-enter" style={{ animationDelay: 'calc(1 * var(--duration-enter-stagger))' }}>
            <div className="card-title">{t('gap.vl')}</div>
            <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--success)', fontFamily: 'var(--font-kpi)' }}>
                  {summary?.vl_review.confirmed}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('gap.confirmed')}</div>
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--warning)', fontFamily: 'var(--font-kpi)' }}>
                  {summary?.vl_review.pending}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('gap.pending')}</div>
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-kpi)' }}>
                  {summary?.vl_review.false_positive}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('gap.falsePos')}</div>
              </div>
            </div>
            <p className="vl-note">{t('gap.vlNote')}</p>
          </div>
        </div>

        {matrix && (
          <div className="card chart-enter" style={{ animationDelay: 'calc(2 * var(--duration-enter-stagger))' }}>
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
                  {Object.entries(matrix.zone_labels).map(([zId, label]) => (
                    <tr key={zId}>
                      <th style={{ textAlign: 'left' }}>{label}</th>
                      {matrix.matrix.map((row) => {
                        const cell = row.cells.find((c) => c.zone_id === zId);
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

        <div className="card chart-enter" style={{ animationDelay: 'calc(3 * var(--duration-enter-stagger))' }}>
          <div className="card-title">{t('gap.detail')}</div>
          {events.length === 0 ? (
            <div className="empty-state">{t('gap.empty')}</div>
          ) : (
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
                  <th aria-label="expand" />
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const done = isDispatched(e.gap_id);
                  const isExpanded = expanded === e.gap_id;
                  return (
                    <Fragment key={e.gap_id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : e.gap_id)}>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{e.started_at.slice(11, 16)}</td>
                        <td>{e.zone_name}</td>
                        <td>{e.customer_count}</td>
                        <td>{e.staff_count}</td>
                        <td>{e.duration_display}</td>
                        <td>{vlBadge(e.vl_review_status)}</td>
                        <td onClick={(ev) => ev.stopPropagation()}>
                          <button
                            type="button"
                            className={`btn btn-sm ${done ? 'btn-ghost' : 'btn-ghost'}`}
                            disabled={done}
                            onClick={(ev) => onDispatch(e, ev)}
                          >
                            {done ? t('common.dispatched') : t('common.dispatch')}
                          </button>
                        </td>
                        <td><ExpandChevron expanded={isExpanded} /></td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${e.gap_id}-detail`}>
                          <td colSpan={8}>
                            <div className="vl-box">{e.vl_summary ?? t('gap.noVl')}</div>
                            <div style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {t('gap.clip')}: {e.clip_url} · {e.started_at} → {e.ended_at}
                              {done && dispatches[e.gap_id] && (
                                <> · {t('gap.at')} {dispatches[e.gap_id].dispatched_at}</>
                              )}
                            </div>
                            {done && (
                              <div className="btn-row" style={{ marginTop: 8 }}>
                                <Link
                                  className="btn btn-sm btn-primary"
                                  to={gapDeepLink({ gapId: e.gap_id, zoneId: e.zone_id, zoneName: e.zone_name }).coach}
                                >
                                  {t('spine.toCoach')}
                                </Link>
                                <Link
                                  className="btn btn-sm btn-ghost"
                                  to={gapDeepLink({ gapId: e.gap_id, zoneId: e.zone_id, zoneName: e.zone_name }).roster}
                                >
                                  {t('spine.toRoster')}
                                </Link>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </PageStatus>
  );
}
