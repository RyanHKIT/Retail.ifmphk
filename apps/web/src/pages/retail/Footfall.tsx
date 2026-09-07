import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api, fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { FunnelStage, FootfallHourly, PassbyHourly, FootfallEvent, CameraSnapshot } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { PageStatus } from '@/components/retail/PageStatus';
import { SourceChip } from '@/components/retail/SourceChip';
import { SpineNav } from '@/components/retail/SpineNav';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';
import type { SourceChipSource } from '@/components/retail/SourceChip';

export function FootfallPage() {
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [hourly, setHourly] = useState<FootfallHourly | null>(null);
  const [passby, setPassby] = useState<PassbyHourly | null>(null);
  const [events, setEvents] = useState<FootfallEvent[]>([]);
  const [cameras, setCameras] = useState<CameraSnapshot[]>([]);
  const [source, setSource] = useState<SourceChipSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      api.footfallFunnel(),
      fetchMockWithMeta<FootfallHourly>('footfall-hourly.json'),
      api.passbyHourly(),
      api.footfallEvents(),
      api.cameraSnapshot(),
    ]).then(([f, h, p, e, c]) => {
      if (cancelled) return;
      setFunnel(f.stages);
      setHourly(h.data);
      setSource(toChipSource(h.meta?.source));
      setPassby(p);
      setEvents(e.items);
      setCameras(c.cameras);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reload]);

  const maxFunnel = Math.max(0, ...funnel.map((s) => s.value));
  const enterKey = t('footfall.enter');
  const exitKey = t('footfall.exit');
  const notEnteredKey = t('footfall.notEntered');
  const passbyKey = t('overview.passby');
  const inOutData = hourly?.hours.map((hour, i) => ({
    hour,
    [enterKey]: hourly.series[1].data[i],
    [exitKey]: hourly.series[2].data[i],
  })) ?? [];

  const passbyData = passby?.hours.map((hour, i) => ({
    hour,
    [notEnteredKey]: passby.not_entered_by_hour[i],
  })) ?? [];

  const enterStage = funnel.find((s) => s.id === 'enter');

  const dirBadge = (d: string) => {
    if (d === 'enter') return <span className="badge badge-enter">{t('footfall.enter')}</span>;
    if (d === 'exit') return <span className="badge badge-exit">{t('footfall.exit')}</span>;
    return <span className="badge badge-passby">{passbyKey}</span>;
  };

  const roleBadge = (r: string) => {
    if (r === 'staff') return <span className="badge badge-staff">{t('people.staff')}</span>;
    if (r === 'customer') return <span className="badge badge-customer">{t('people.customer')}</span>;
    return <span className="badge badge-passby">{t('people.pedestrian')}</span>;
  };

  return (
    <PageStatus loading={loading} error={error} onRetry={() => setReload((n) => n + 1)}>
      <div className="page-title-row">
        <h1 className="page-title">{t('footfall.title')}</h1>
        {source && <SourceChip source={source} />}
      </div>
      <p className="page-subtitle">{t('footfall.subtitle')}</p>
      <SpineNav />

      <div className="source-hint-strip" role="note">
        <span className="source-hint-label">{t('footfall.storyLabel')}</span>
        <SourceChip source="counter" />
        <span className="source-hint-copy">{t('footfall.story')}</span>
        {enterStage && (
          <span className="rule-chip">
            {t('footfall.enterRate')} {enterStage.rate}%
          </span>
        )}
      </div>

      <ChartPanel title={t('footfall.funnel')} style={{ marginBottom: 20 }}>
        <div className="funnel">
          {funnel.map((stage) => (
            <div key={stage.id} className="funnel-stage">
              <span className="funnel-label">{stage.label}</span>
              <div className="funnel-bar-wrap">
                <div
                  className="funnel-bar"
                  style={{ width: `${maxFunnel ? (stage.value / maxFunnel) * 100 : 0}%` }}
                >
                  {stage.value.toLocaleString()}
                </div>
              </div>
              <span className="funnel-rate">{stage.rate}%</span>
            </div>
          ))}
        </div>
        {funnel.find((s) => s.mock) && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 12 }}>
            * 購買轉化為 Phase 2 POS 對接，目前為 Mock
          </p>
        )}
      </ChartPanel>

      <div className="grid-2">
        <ChartPanel title={t('footfall.inOut')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={inOutData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={11} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              <Bar dataKey={enterKey} fill={CHART[1]} radius={[4, 4, 0, 0]} />
              <Bar dataKey={exitKey} fill={CHART[4]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title={t('footfall.passby')}>
          <p style={{ fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-secondary)' }}>
            今日未進店 <strong style={{ color: 'var(--text-primary)' }}>{passby?.summary.not_entered_total.toLocaleString()}</strong> 人
            （{passby?.summary.not_entered_rate}%）
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={passbyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={10} />
              <YAxis stroke={chart.axis} fontSize={10} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Bar dataKey={notEnteredKey} fill={CHART[3]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {cameras.map((cam) => (
          <div key={cam.camera_id} className="card">
            <div className="card-title">{cam.name} · {cam.camera_id}</div>
            <div className="camera-card">
              <span className="camera-status">● 在線</span>
              <span className="camera-label">實時畫面（Demo 佔位）</span>
              <span className="camera-stat">
                {cam.camera_id === 'CAM-01'
                  ? `過店 ${cam.last_count?.passby_today ?? 0}`
                  : `進店 ${cam.last_count?.enter_today ?? 0}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">{t('footfall.events')}</div>
        {events.length === 0 ? (
          <div className="empty-state">{t('footfall.empty')}</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>方向</th>
                <th>Track ID</th>
                <th>角色</th>
                <th>置信度</th>
                <th>攝像頭</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.event_id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{e.timestamp.slice(11, 19)}</td>
                  <td>{dirBadge(e.direction)}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.7rem' }}>{e.track_id}</td>
                  <td>{roleBadge(e.role)}</td>
                  <td>{(e.role_confidence * 100).toFixed(0)}%</td>
                  <td>{e.camera_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageStatus>
  );
}
