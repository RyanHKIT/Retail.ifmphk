import { useEffect, useState, type CSSProperties } from 'react';
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
  const passbyStage = funnel.find((s) => s.id === 'passby');
  const missStage = funnel.find((s) => s.id === 'not_entered');

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
      </div>

      <section className="counter-hero chart-enter" aria-label={t('footfall.enter')}>
        <div className="counter-hero-lead">
          <div className="situation-label">{enterStage?.label ?? t('footfall.enter')}</div>
          <div>
            <span className="counter-hero-value">{(enterStage?.value ?? 0).toLocaleString()}</span>
            <span className="situation-unit">{t('footfall.unitPeople')}</span>
          </div>
          {enterStage && (
            <div className="rule-chip">{t('footfall.enterRate')} {enterStage.rate}%</div>
          )}
        </div>
        <div className="counter-hero-facts">
          <div className="counter-hero-fact">
            <span className="situation-label">{passbyStage?.label ?? passbyKey}</span>
            <span className="counter-hero-fact-value">{(passbyStage?.value ?? passby?.summary.passby_total ?? 0).toLocaleString()}</span>
          </div>
          <div className="counter-hero-fact">
            <span className="situation-label">{missStage?.label ?? t('footfall.notEntered')}</span>
            <span className="counter-hero-fact-value">{(missStage?.value ?? passby?.summary.not_entered_total ?? 0).toLocaleString()}</span>
          </div>
        </div>
      </section>

      <ChartPanel title={t('footfall.funnel')} className="funnel-panel" staggerIndex={1}>
        <div className="funnel">
          {funnel.map((stage) => {
            const ratio = maxFunnel ? stage.value / maxFunnel : 0;
            return (
              <div key={stage.id} className="funnel-stage">
                <span className="funnel-label">{stage.label}</span>
                <div className="funnel-bar-wrap">
                  <div
                    className={stage.mock ? 'funnel-bar-fill is-mock' : 'funnel-bar-fill'}
                    style={{ '--funnel-scale': String(ratio) } as CSSProperties}
                  />
                </div>
                <span className="funnel-value">{stage.value.toLocaleString()}</span>
                <span className="funnel-rate">{stage.rate}%</span>
              </div>
            );
          })}
        </div>
        {funnel.find((s) => s.mock) && (
          <p className="funnel-note">{t('footfall.mockPurchase')}</p>
        )}
      </ChartPanel>

      <div className="grid-2">
        <ChartPanel title={t('footfall.inOut')} staggerIndex={2}>
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
        <ChartPanel title={t('footfall.passby')} staggerIndex={3}>
          <p className="support-metric">
            {t('footfall.notEntered')}{' '}
            <strong>{passby?.summary.not_entered_total.toLocaleString()}</strong>
            {' '}{t('footfall.unitPeople')}
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

      <div className="grid-2 camera-support">
        {cameras.map((cam) => (
          <div key={cam.camera_id} className="card">
            <div className="card-title">{cam.name} · {cam.camera_id}</div>
            <div className="camera-card">
              <span className="camera-status">
                <span className="status-dot" />
                {t('footfall.online')}
              </span>
              <span className="camera-label">{t('footfall.cameras')}</span>
              <span className="camera-stat">
                {cam.camera_id === 'CAM-01'
                  ? `${passbyKey} ${cam.last_count?.passby_today ?? 0}`
                  : `${t('footfall.enter')} ${cam.last_count?.enter_today ?? 0}`}
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
                  <td className="tabular-cell">{e.timestamp.slice(11, 19)}</td>
                  <td>{dirBadge(e.direction)}</td>
                  <td className="tabular-cell">{e.track_id}</td>
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
