import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { EnergyData } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { SourceChip } from '@/components/retail/SourceChip';
import type { SourceChipSource } from '@/components/retail/SourceChip';
import { useRetailFilter } from '@/context/RetailFilterContext';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';
import type { MessageKey } from '@/i18n/messages';

export function EnergyPage() {
  const { storeId } = useRetailFilter();
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [data, setData] = useState<EnergyData | null>(null);
  const [source, setSource] = useState<SourceChipSource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMockWithMeta<EnergyData>('energy.json').then(({ data: d, meta }) => {
      setData(d);
      setSource(toChipSource(meta?.source));
      setLoading(false);
    });
  }, []);

  const climateData = useMemo(() => {
    if (!data) return [];
    const temp = t('energy.temp');
    const hum = t('energy.humidity');
    const occ = t('energy.occ');
    return data.hours.map((hour, i) => ({
      hour,
      [temp]: data.temp_avg_c[i],
      [hum]: data.humidity_avg_pct[i],
      [occ]: data.occupancy_index[i],
    }));
  }, [data, t]);

  const powerData = useMemo(() => {
    if (!data) return [];
    const hvac = t('energy.hvac');
    const lighting = t('energy.lighting');
    const other = t('energy.other');
    const kwh = t('energy.kwh');
    return data.hours.map((hour, i) => ({
      hour,
      [hvac]: data.power_kw.hvac[i],
      [lighting]: data.power_kw.lighting[i],
      [other]: data.power_kw.other[i],
      [kwh]: data.kwh_by_hour[i],
    }));
  }, [data, t]);

  if (loading || !data) return <div className="loading">{t('common.loading')}</div>;

  const { summary } = data;
  const hasControl = Boolean(data.has_control);
  const tempSensors = data.sensors.filter((s) => s.temp_c != null);
  const meter = data.sensors.find((s) => s.type === 'meter');
  const tempKey = t('energy.temp');
  const humKey = t('energy.humidity');
  const occKey = t('energy.occ');
  const hvacKey = t('energy.hvac');
  const lightingKey = t('energy.lighting');
  const otherKey = t('energy.other');
  const kwhKey = t('energy.kwh');

  return (
    <>
      <div className="demo-banner" data-control={hasControl ? 'execute' : 'suggest'}>
        <strong>{t('energy.bannerStrong')}</strong>
        {' — '}
        <span>{t(hasControl ? 'energy.controlExecute' : 'energy.controlSuggest')}</span>
      </div>
      <div className="page-title-row">
        <h1 className="page-title">{t('energy.title')}</h1>
        {source && <SourceChip source={source} />}
      </div>
      <p className="page-subtitle">
        {storeLabel} · {t('energy.subtitle', { time: data.as_of.slice(11, 16) })} · {data.platform_note}
      </p>

      <div className="grid-kpi" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('energy.avgTemp')}</div>
          <div><span className="kpi-value">{summary.avg_temp_c}</span><span className="kpi-unit">°C</span></div>
        </div>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('energy.avgHumidity')}</div>
          <div><span className="kpi-value">{summary.avg_humidity_pct}</span><span className="kpi-unit">%</span></div>
        </div>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('energy.todayKwh')}</div>
          <div><span className="kpi-value">{summary.today_kwh}</span><span className="kpi-unit">kWh</span></div>
          <div className={`kpi-change ${summary.change_pct < 0 ? 'up' : 'down'}`}>
            {t('common.vsYesterday')} {summary.change_pct}%
          </div>
        </div>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('energy.estCost')}</div>
          <div><span className="kpi-value">{summary.est_cost_hkd}</span><span className="kpi-unit">HKD</span></div>
          <div className="kpi-change">@{summary.tariff_hkd_per_kwh}/kWh</div>
        </div>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('energy.power')}</div>
          <div>
            <span className="kpi-value">{meter?.power_kw ?? '—'}</span>
            <span className="kpi-unit">kW</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('energy.sensors')}</div>
        <div className="sensor-grid">
          {tempSensors.map((s) => (
            <div key={s.sensor_id} className={`sensor-card ${s.status === 'warn' ? 'warn' : ''}`}>
              <div className="sensor-head">
                <strong>{s.zone_name}</strong>
                <span className={`badge ${s.status === 'warn' ? 'badge-pending' : 'badge-normal'}`}>
                  {s.status === 'warn' ? t('energy.warn') : t('energy.ok')}
                </span>
              </div>
              <div className="sensor-metrics">
                <div>
                  <span className="sensor-value">{s.temp_c}</span>
                  <span className="sensor-unit">°C</span>
                </div>
                <div>
                  <span className="sensor-value">{s.humidity_pct}</span>
                  <span className="sensor-unit">%RH</span>
                </div>
              </div>
              <div className="sensor-meta">
                {s.sensor_id} · {t('energy.battery')} {s.battery_pct}% · {s.updated_at.slice(11, 16)}
              </div>
              {s.note && <div className="sensor-note">{s.note}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <ChartPanel title={t('energy.climate')}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={climateData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={11} />
              <YAxis yAxisId="left" stroke={chart.axis} fontSize={11} domain={[20, 30]} />
              <YAxis yAxisId="right" orientation="right" stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey={tempKey} stroke={CHART[3]} strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey={humKey} stroke={CHART[2]} strokeWidth={2} dot={false} />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey={occKey}
                fill={CHART[4]}
                fillOpacity={0.2}
                stroke={CHART[4]}
                strokeWidth={1.5}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title={t('energy.powerMix')}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={powerData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={11} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              <Bar dataKey={hvacKey} stackId="a" fill={CHART[1]} />
              <Bar dataKey={lightingKey} stackId="a" fill={CHART[3]} />
              <Bar dataKey={otherKey} stackId="a" fill={CHART[4]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="legend-row" style={{ marginTop: 8 }}>
            <span>{hvacKey} {summary.hvac_share_pct}%</span>
            <span>{lightingKey} {summary.lighting_share_pct}%</span>
            <span>{otherKey} {summary.other_share_pct}%</span>
          </div>
        </ChartPanel>
      </div>

      <ChartPanel title={t('energy.hourlyKwh')} style={{ marginTop: 20, marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={powerData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
            <XAxis dataKey="hour" stroke={chart.axis} fontSize={11} />
            <YAxis stroke={chart.axis} fontSize={11} />
            <Tooltip contentStyle={chartTooltipStyle(chart)} />
            <Area type="monotone" dataKey={kwhKey} stroke={CHART[1]} fill={CHART[1]} fillOpacity={0.2} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">{t('energy.rules')}</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          {data.control_note}
        </p>
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('energy.ruleName')}</th>
              <th>{t('energy.trigger')}</th>
              <th>{t('energy.action')}</th>
              <th>{t('energy.status')}</th>
              <th>{t('energy.fired')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rules.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.name}</td>
                <td>{r.trigger}</td>
                <td>{r.action}</td>
                <td>
                  <span className={`badge ${r.status === 'armed' ? 'badge-confirmed' : 'badge-pending'}`}>
                    {r.status === 'armed' ? t('energy.armed') : r.status === 'scheduled' ? t('energy.scheduled') : r.status}
                  </span>
                </td>
                <td>{r.fired_today}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
