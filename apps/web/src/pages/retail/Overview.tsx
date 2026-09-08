import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { api, fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { KpiItem, FootfallHourly, PeopleSummary, HeatmapData, ZonesData, AlertItem, EnergyData } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { FloorHeatmap } from '@/components/retail/FloorHeatmap';
import { AlertList } from '@/components/retail/AlertList';
import { PageStatus } from '@/components/retail/PageStatus';
import { SourceChip, type SourceChipSource } from '@/components/retail/SourceChip';
import { SpineNav } from '@/components/retail/SpineNav';
import { useRetailFilter } from '@/context/RetailFilterContext';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { countPending } from '@/lib/dispatchStore';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';
import type { MessageKey } from '@/i18n/messages';

const PIE_COLORS = [CHART[2], CHART[1], CHART[4]];

const HINT_ORDER: SourceChipSource[] = ['counter', 'camera'];

const SITUATION_IDS = ['service_gap', 'enter_rate', 'in_store', 'enter'] as const;

function orderedHintSources(raw: Array<SourceChipSource | null>): SourceChipSource[] {
  const set = new Set(raw.filter((s): s is SourceChipSource => s != null));
  const ordered = HINT_ORDER.filter((s) => set.has(s));
  return ordered.length === HINT_ORDER.length ? ordered : [...HINT_ORDER];
}

function formatKpiValue(kpi: KpiItem): string {
  return kpi.format === 'percent' ? kpi.value.toFixed(1) : kpi.value.toLocaleString();
}

export function OverviewPage() {
  const { storeId } = useRetailFilter();
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [hourly, setHourly] = useState<FootfallHourly | null>(null);
  const [people, setPeople] = useState<PeopleSummary | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [zones, setZones] = useState<ZonesData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [energy, setEnergy] = useState<EnergyData | null>(null);
  const [pendingDispatch, setPendingDispatch] = useState(0);
  const [hintSources, setHintSources] = useState<SourceChipSource[]>(HINT_ORDER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const gapIdsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetchMockWithMeta<{ kpis: KpiItem[] }>('kpi.json'),
      api.footfallHourly(),
      fetchMockWithMeta<PeopleSummary>('people-summary.json'),
      api.heatmap(),
      api.zones(),
      api.alerts(),
      api.gapEvents(),
      api.energy(),
    ]).then(([k, h, p, hm, z, a, gaps, en]) => {
      if (cancelled) return;
      setKpis(k.data.kpis);
      setHourly(h);
      setPeople(p.data);
      setHeatmap(hm);
      setZones(z);
      setAlerts(a.items.slice(0, 5));
      const ids = gaps.items.map((g) => g.gap_id);
      gapIdsRef.current = ids;
      setPendingDispatch(countPending(ids));
      setHintSources(orderedHintSources([
        toChipSource(k.meta?.source),
        toChipSource(p.meta?.source),
      ]));
      setEnergy(en);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => {
    const refreshPending = () => {
      setPendingDispatch(countPending(gapIdsRef.current));
    };
    window.addEventListener('retail-dispatch', refreshPending);
    window.addEventListener('storage', refreshPending);
    return () => {
      window.removeEventListener('retail-dispatch', refreshPending);
      window.removeEventListener('storage', refreshPending);
    };
  }, []);

  const passbyKey = t('overview.passby');
  const enterKey = t('overview.enter');

  const chartData = hourly?.hours.map((hour, i) => ({
    hour,
    [passbyKey]: hourly.series[0].data[i],
    [enterKey]: hourly.series[1].data[i],
  })) ?? [];

  const pieData = people?.role_distribution.map((r) => ({
    name: r.label,
    value: r.count,
  })) ?? [];

  const situationKpis = SITUATION_IDS
    .map((id) => kpis.find((k) => k.id === id))
    .filter((k): k is KpiItem => k != null);

  return (
    <PageStatus loading={loading} error={error} onRetry={() => setReload((n) => n + 1)}>
      <div className="demo-banner">{t('demo.banner')}</div>
      <h1 className="page-title">{t('overview.title')}</h1>
      <p className="page-subtitle">{storeLabel} · {t('overview.subtitle')}</p>

      <div className="source-hint-strip" role="note">
        <span className="source-hint-label">{t('overview.sourceHint')}</span>
        {hintSources.map((source) => (
          <SourceChip key={source} source={source} />
        ))}
        <span className="source-hint-copy">{t('overview.sourceHintCopy')}</span>
      </div>

      <section className="overview-situation situation-strip chart-enter" aria-label={t('overview.situation')}>
        {situationKpis.map((kpi, i) => {
          const changeClass = kpi.change_direction === 'up' ? 'up' : kpi.change_direction === 'down' ? 'down' : '';
          return (
            <div
              key={kpi.id}
              className={i === 0 ? 'situation-cell situation-cell--lead' : 'situation-cell'}
            >
              <div className="situation-label">{kpi.label}</div>
              <div>
                <span className="situation-value">{formatKpiValue(kpi)}</span>
                <span className="situation-unit">{kpi.unit}</span>
              </div>
              {kpi.change_pct !== undefined && (
                <div className={`situation-delta ${changeClass}`}>
                  {t('common.vsYesterday')} {kpi.change_pct}%
                </div>
              )}
              {kpi.realtime && (
                <div className="situation-live">
                  <span className="status-dot" />
                  {t('overview.realtime')}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {pendingDispatch > 0 ? (
        <div className="overview-next-action dispatch-banner">
          <div>
            <strong>{t('overview.dispatchTitle')}</strong>
            <span> {t('overview.dispatchPending', { n: pendingDispatch })}</span>
          </div>
          <div className="btn-row">
            <Link className="btn btn-primary" to="/retail/service-gap">{t('overview.toGap')}</Link>
            <Link className="text-link" to="/retail/coach">{t('overview.toCoach')}</Link>
            <Link className="text-link" to="/retail/roster">{t('overview.toRoster')}</Link>
          </div>
        </div>
      ) : (
        <SpineNav />
      )}

      <div className="overview-evidence">
        {pieData.length > 0 ? (
          <div className="grid-1-2">
            <div className="card chart-enter" style={{ animationDelay: 'calc(0 * var(--duration-enter-stagger))' }}>
              <div className="card-title">{t('overview.roles')}</div>
              <div className="overview-roles">
                <div className="overview-roles-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={chartTooltipStyle(chart)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="legend-row overview-roles-legend">
                  {people?.role_distribution.map((r, i) => (
                    <span key={r.role}>
                      <span className="legend-dot" style={{ background: PIE_COLORS[i] }} />
                      {r.label} {r.percentage}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <ChartPanel title={t('overview.footfallChart')} staggerIndex={1}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="hour" stroke={chart.axis} />
                  <YAxis stroke={chart.axis} />
                  <Tooltip contentStyle={chartTooltipStyle(chart)} />
                  <Line type="monotone" dataKey={passbyKey} stroke={CHART[4]} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey={enterKey} stroke={CHART[1]} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>
        ) : (
          <ChartPanel title={t('overview.footfallChart')} staggerIndex={0}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="hour" stroke={chart.axis} />
                <YAxis stroke={chart.axis} />
                <Tooltip contentStyle={chartTooltipStyle(chart)} />
                <Line type="monotone" dataKey={passbyKey} stroke={CHART[4]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={enterKey} stroke={CHART[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        )}

        <div className="grid-2-1">
          <div className="card chart-enter" style={{ animationDelay: 'calc(2 * var(--duration-enter-stagger))' }}>
            <div className="card-title">{t('overview.heatmap')}</div>
            {zones && heatmap && (
              <FloorHeatmap
                zones={zones.zones}
                heat={heatmap.zones}
                floorPlanUrl={zones.floor_plan_url}
                floorPlanLabel={zones.floor_plan_label}
                compact
              />
            )}
          </div>
          <div className="card chart-enter" style={{ animationDelay: 'calc(3 * var(--duration-enter-stagger))' }}>
            <div className="card-title">{t('overview.alerts')}</div>
            <AlertList items={alerts} />
          </div>
        </div>

        {energy && (
          <Link to="/retail/energy" className="energy-strip">
            <div className="energy-strip-main">
              <strong>{t('overview.energyStrip')}</strong>
              <span>
                {t('overview.avgTemp')} {energy.summary.avg_temp_c}°C · {t('overview.humidity')} {energy.summary.avg_humidity_pct}% · {t('overview.todayKwh')} {energy.summary.today_kwh} kWh
                （{t('common.vsYesterday')} {energy.summary.change_pct}%）
              </span>
            </div>
            <span className="energy-strip-cta">{t('overview.energyDetail')}</span>
          </Link>
        )}
      </div>
    </PageStatus>
  );
}
