import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { api } from '@/api/retail';
import type { HeatmapData, ZonesData, ZoneDwell, DwellTrend, JourneyPath } from '@/api/retail';
import { FloorHeatmap } from '@/components/retail/FloorHeatmap';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { chartTooltipStyle } from '@/lib/chartStyle';

export function JourneyPage() {
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [zones, setZones] = useState<ZonesData | null>(null);
  const [dwell, setDwell] = useState<ZoneDwell[]>([]);
  const [trend, setTrend] = useState<DwellTrend | null>(null);
  const [paths, setPaths] = useState<JourneyPath[]>([]);
  const [metric, setMetric] = useState<'visits' | 'dwell' | 'composite'>('composite');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.heatmap(),
      api.zones(),
      api.zoneDwell(),
      api.dwellTrend(),
      api.journeyPaths(),
    ]).then(([hm, z, d, t, p]) => {
      setHeatmap(hm);
      setZones(z);
      setDwell(d.zones);
      setTrend(t);
      setPaths(p.paths);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading">{t('common.loading')}</div>;

  const dwellBarData = dwell.map((z) => ({
    name: z.name,
    秒: z.avg_dwell_sec,
    display: z.avg_dwell_display,
  }));

  const trendData = trend?.dates.map((date, i) => {
    const row: Record<string, string | number> = { date };
    trend.series.forEach((s) => {
      row[s.label] = s.data[i];
    });
    return row;
  }) ?? [];

  const TREND_COLORS = ['#e11d48', '#8b5cf6', '#06b6d4', '#f59e0b'];

  return (
    <>
      <h1 className="page-title">{t('journey.title')}</h1>
      <p className="page-subtitle">{t('journey.subtitle')}</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>全店熱力圖</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['composite', 'visits', 'dwell'] as const).map((m) => (
              <button
                key={m}
                className="filter-select"
                style={{
                  background: metric === m ? 'var(--accent-soft)' : undefined,
                  color: metric === m ? 'var(--accent)' : undefined,
                }}
                onClick={() => setMetric(m)}
              >
                {m === 'composite' ? t('journey.composite') : m === 'visits' ? t('journey.visits') : t('journey.dwell')}
              </button>
            ))}
          </div>
        </div>
        {zones && heatmap && <FloorHeatmap zones={zones.zones} heat={heatmap.zones} />}
        <div className="legend-row">
          <span><span className="legend-dot" style={{ background: 'rgba(225,29,72,0.25)' }} />低</span>
          <span><span className="legend-dot" style={{ background: 'rgba(225,29,72,0.85)' }} />高</span>
          <span style={{ marginLeft: 'auto' }}>懸停區域查看人次與停留</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">區域停留排行</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dwellBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis type="number" stroke={chart.axis} fontSize={11} />
              <YAxis type="category" dataKey="name" stroke={chart.axis} fontSize={11} width={70} />
              <Tooltip
                contentStyle={chartTooltipStyle(chart)}
                formatter={(_v: number, _n, p) => [(p.payload as { display: string }).display, '平均停留']}
              />
              <Bar dataKey="秒" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">7 日停留趨勢</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="date" stroke={chart.axis} fontSize={11} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              {trend?.series.map((s, i) => (
                <Line key={s.zone_id} type="monotone" dataKey={s.label} stroke={TREND_COLORS[i]} dot={false} strokeWidth={2} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">典型動線 Top 5</div>
        {paths.map((p) => (
          <div key={p.rank} className="path-item">
            <span className="path-rank">{p.rank}</span>
            <span className="path-flow">{p.path_labels.join(' → ')}</span>
            <span className="path-pct">{p.percentage}%</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({p.count} 人)</span>
          </div>
        ))}
      </div>
    </>
  );
}
