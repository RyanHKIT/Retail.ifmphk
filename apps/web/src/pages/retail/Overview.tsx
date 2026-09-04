import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { api } from '@/api/retail';
import type { KpiItem, FootfallHourly, PeopleSummary, HeatmapData, ZonesData, AlertItem, EnergyData } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { KpiCard } from '@/components/retail/KpiCard';
import { FloorHeatmap } from '@/components/retail/FloorHeatmap';
import { AlertList } from '@/components/retail/AlertList';
import { useRetailFilter } from '@/context/RetailFilterContext';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { countPending } from '@/lib/dispatchStore';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';
import type { MessageKey } from '@/i18n/messages';

const PIE_COLORS = [CHART[2], CHART[1], CHART[4]];

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.kpi(),
      api.footfallHourly(),
      api.peopleSummary(),
      api.heatmap(),
      api.zones(),
      api.alerts(),
      api.gapEvents(),
      api.energy(),
    ]).then(([k, h, p, hm, z, a, gaps, en]) => {
      setKpis(k.kpis);
      setHourly(h);
      setPeople(p);
      setHeatmap(hm);
      setZones(z);
      setAlerts(a.items.slice(0, 5));
      setPendingDispatch(countPending(gaps.items.map((g) => g.gap_id)));
      setEnergy(en);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading">{t('common.loading')}</div>;

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

  return (
    <>
      <div className="demo-banner">{t('demo.banner')}</div>
      <h1 className="page-title">{t('overview.title')}</h1>
      <p className="page-subtitle">{storeLabel} · {t('overview.subtitle')}</p>

      {pendingDispatch > 0 && (
        <div className="dispatch-banner">
          <div>
            <strong>{t('overview.dispatchTitle')}</strong>
            <span> {t('overview.dispatchPending', { n: pendingDispatch })}</span>
          </div>
          <div className="btn-row">
            <Link className="btn btn-primary" to="/retail/service-gap">{t('overview.toGap')}</Link>
            <Link className="btn btn-ghost" to="/retail/coach">{t('overview.toCoach')}</Link>
            <Link className="btn btn-ghost" to="/retail/roster">{t('overview.toRoster')}</Link>
          </div>
        </div>
      )}

      <div className="grid-kpi">
        {kpis.map((k) => <KpiCard key={k.id} kpi={k} />)}
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

      <div className="grid-2">
        <ChartPanel title={t('overview.footfallChart')}>
          <ResponsiveContainer width="100%" height={240}>
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
        <ChartPanel title={t('overview.roles')}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="legend-row">
            {people?.role_distribution.map((r, i) => (
              <span key={r.role}>
                <span className="legend-dot" style={{ background: PIE_COLORS[i] }} />
                {r.label} {r.percentage}%
              </span>
            ))}
          </div>
        </ChartPanel>
      </div>

      <div className="grid-2-1">
        <div className="card">
          <div className="card-title">{t('overview.heatmap')}</div>
          {zones && heatmap && <FloorHeatmap zones={zones.zones} heat={heatmap.zones} compact />}
        </div>
        <div className="card">
          <div className="card-title">{t('overview.alerts')}</div>
          <AlertList items={alerts} />
        </div>
      </div>
    </>
  );
}
