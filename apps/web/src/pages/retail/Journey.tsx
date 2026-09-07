import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { api, fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { HeatmapData, ZonesData, ZoneDwell, DwellTrend, JourneyPath } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { FloorHeatmap } from '@/components/retail/FloorHeatmap';
import { PageStatus } from '@/components/retail/PageStatus';
import { SourceChip } from '@/components/retail/SourceChip';
import { SpineNav } from '@/components/retail/SpineNav';
import type { SourceChipSource } from '@/components/retail/SourceChip';
import { useDemoSpine } from '@/context/DemoSpineContext';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';

type HeatMetric = 'visits' | 'dwell' | 'composite';

function heatForMetric(zones: HeatmapData['zones'], metric: HeatMetric): HeatmapData['zones'] {
  if (metric === 'composite') return zones;
  const key = metric === 'visits' ? 'visit_count' : 'avg_dwell_sec';
  const max = Math.max(...zones.map((z) => z[key]), 1);
  return zones.map((z) => ({ ...z, intensity: z[key] / max }));
}

export function JourneyPage() {
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const { setFocus } = useDemoSpine();
  const navigate = useNavigate();
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [zones, setZones] = useState<ZonesData | null>(null);
  const [dwell, setDwell] = useState<ZoneDwell[]>([]);
  const [trend, setTrend] = useState<DwellTrend | null>(null);
  const [paths, setPaths] = useState<JourneyPath[]>([]);
  const [metric, setMetric] = useState<HeatMetric>('composite');
  const [source, setSource] = useState<SourceChipSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetchMockWithMeta<HeatmapData>('heatmap.json'),
      api.zones(),
      api.zoneDwell(),
      api.dwellTrend(),
      api.journeyPaths(),
    ]).then(([hm, z, d, tr, p]) => {
      if (cancelled) return;
      setHeatmap(hm.data);
      setSource(toChipSource(hm.meta?.source));
      setZones(z);
      setDwell(d.zones);
      setTrend(tr);
      setPaths(p.paths);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reload]);

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

  const TREND_COLORS = [CHART[1], CHART[2], CHART[3], CHART[4]];
  const heatZones = heatmap ? heatForMetric(heatmap.zones, metric) : [];

  return (
    <PageStatus loading={loading} error={error} onRetry={() => setReload((n) => n + 1)}>
      <div className="page-title-row">
        <h1 className="page-title">{t('journey.title')}</h1>
        {source && <SourceChip source={source} />}
      </div>
      <p className="page-subtitle">{t('journey.subtitle')}</p>
      <SpineNav />

      <div className="source-hint-strip" role="note">
        <span className="source-hint-label">{t('journey.heatmap')}</span>
        <SourceChip source="camera" />
        <span className="source-hint-copy">{t('journey.story')}</span>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>{t('journey.heatmap')}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['composite', 'visits', 'dwell'] as const).map((m) => (
              <button
                key={m}
                type="button"
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
        {zones && heatmap ? (
          <FloorHeatmap
            zones={zones.zones}
            heat={heatZones}
            onZoneClick={(zone) => {
              setFocus({ zoneId: zone.zone_id, zoneName: zone.name });
              navigate(`/retail/service-gap?zone=${zone.zone_id}`);
            }}
          />
        ) : (
          <div className="empty-state">{t('journey.empty')}</div>
        )}
        <div className="legend-row">
          <span><span className="legend-dot" style={{ background: 'color-mix(in srgb, var(--chart-1) 25%, transparent)' }} />{t('journey.low')}</span>
          <span><span className="legend-dot" style={{ background: 'var(--chart-3)' }} />{t('journey.high')}</span>
          <span style={{ marginLeft: 'auto' }}>{t('journey.hover')}</span>
        </div>
      </div>

      <div className="grid-2">
        <ChartPanel title={t('journey.dwellRank')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dwellBarData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis type="number" stroke={chart.axis} fontSize={11} />
              <YAxis type="category" dataKey="name" stroke={chart.axis} fontSize={11} width={70} />
              <Tooltip
                contentStyle={chartTooltipStyle(chart)}
                formatter={(_v: number, _n, p) => [(p.payload as { display: string }).display, t('journey.dwell')]}
              />
              <Bar dataKey="秒" fill={CHART[1]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title={t('journey.dwellTrend')}>
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
        </ChartPanel>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">{t('journey.paths')}</div>
        {paths.length === 0 ? (
          <div className="empty-state">{t('journey.empty')}</div>
        ) : (
          paths.map((p) => (
            <div key={p.rank} className="path-item">
              <span className="path-rank">{p.rank}</span>
              <span className="path-flow">{p.path_labels.join(' → ')}</span>
              <span className="path-pct">{p.percentage}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({p.count} 人)</span>
            </div>
          ))
        )}
      </div>
    </PageStatus>
  );
}
