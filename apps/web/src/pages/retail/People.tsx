import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { api, fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { PeopleSummary, PeopleHourly, StaffHourly, ZonePeople, RosterData } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { PageStatus } from '@/components/retail/PageStatus';
import { SourceChip } from '@/components/retail/SourceChip';
import type { SourceChipSource } from '@/components/retail/SourceChip';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';

export function PeoplePage() {
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const [summary, setSummary] = useState<PeopleSummary | null>(null);
  const [hourly, setHourly] = useState<PeopleHourly | null>(null);
  const [staffHourly, setStaffHourly] = useState<StaffHourly | null>(null);
  const [byZone, setByZone] = useState<ZonePeople[]>([]);
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [source, setSource] = useState<SourceChipSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([
      fetchMockWithMeta<PeopleSummary>('people-summary.json'),
      api.peopleHourly(),
      api.staffHourly(),
      api.peopleByZone(),
      api.roster(),
    ]).then(([s, h, sh, z, r]) => {
      if (cancelled) return;
      setSummary(s.data);
      setSource(toChipSource(s.meta?.source));
      setHourly(h);
      setStaffHourly(sh);
      setByZone(z.zones);
      setRoster(r);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reload]);

  const staffKey = t('people.staff');
  const customerKey = t('people.customer');
  const pedestrianKey = t('people.pedestrian');
  const detectedKey = t('people.detected');
  const expectedKey = t('people.expected');
  const areaData = hourly?.hours.map((hour, i) => ({
    hour,
    [staffKey]: hourly.series[0].data[i],
    [customerKey]: hourly.series[1].data[i],
  })) ?? [];

  const staffCompareData = staffHourly?.hours.map((hour, i) => ({
    hour,
    [detectedKey]: staffHourly.staff_count[i],
    [expectedKey]: staffHourly.roster_expected[i],
  })) ?? [];

  const statusBadge = (s: string) => {
    if (s === 'understaffed') return <span className="badge badge-understaffed">{t('people.understaffed')}</span>;
    if (s === 'normal') return <span className="badge badge-normal">{t('people.normal')}</span>;
    return <span className="badge">{s}</span>;
  };

  return (
    <PageStatus loading={loading} error={error} onRetry={() => setReload((n) => n + 1)}>
      <div className="page-title-row">
        <h1 className="page-title">{t('people.title')}</h1>
        {source && <SourceChip source={source} />}
      </div>
      <p className="page-subtitle">{t('people.subtitle')}</p>

      <div className="source-hint-strip" role="note">
        <span className="source-hint-label">{t('people.roles')}</span>
        <span className="badge badge-staff">{staffKey}</span>
        <span className="badge badge-customer">{customerKey}</span>
        <span className="badge badge-passby">{pedestrianKey}</span>
        <span className="source-hint-copy">{t('people.story')}</span>
      </div>

      <div className="grid-kpi" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('people.staffInStore')}</div>
          <div><span className="kpi-value">{summary?.in_store.staff}</span><span className="kpi-unit">{t('people.unit')}</span></div>
          <div className="kpi-realtime">● 實時</div>
        </div>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('people.customerInStore')}</div>
          <div><span className="kpi-value">{summary?.in_store.customer}</span><span className="kpi-unit">{t('people.unit')}</span></div>
          <div className="kpi-realtime">● 實時</div>
        </div>
        <div className="kpi-card chart-enter">
          <div className="kpi-label">{t('people.passbyToday')}</div>
          <div><span className="kpi-value">{summary?.today_totals.pedestrian_passby.toLocaleString()}</span><span className="kpi-unit">{t('people.unit')}</span></div>
        </div>
      </div>

      <div className="grid-2">
        <ChartPanel title={t('people.roleTimeline')}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={11} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              <Area type="monotone" dataKey={staffKey} stackId="1" stroke={CHART[2]} fill={CHART[2]} fillOpacity={0.4} />
              <Area type="monotone" dataKey={customerKey} stackId="1" stroke={CHART[1]} fill={CHART[1]} fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title={t('people.staffHourly')}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={staffCompareData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={10} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              <Bar dataKey={detectedKey} fill={CHART[1]} radius={[4, 4, 0, 0]} />
              <Bar dataKey={expectedKey} fill={CHART[4]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-title">{t('people.byZone')}</div>
          {byZone.length === 0 ? (
            <div className="empty-state">{t('people.empty')}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('common.zone')}</th>
                  <th>{t('people.staff')}</th>
                  <th>{t('people.customer')}</th>
                  <th>人效比</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {byZone.map((z) => (
                  <tr key={z.zone_id}>
                    <td>{z.name}</td>
                    <td>{z.staff_count}</td>
                    <td>{z.customer_count}</td>
                    <td>{z.staffing_ratio?.toFixed(1) ?? '—'}</td>
                    <td>{statusBadge(z.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-title">{t('people.roster')}</div>
          {roster ? (
            <>
              <div style={{
                background: 'var(--bg-elevated)',
                padding: 16,
                borderRadius: 8,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('people.shiftCurrent')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>
                  {t('people.expectedStaff')} {roster.current_shift.expected_staff} {t('people.unit')}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / </span>
                  {t('people.detectedStaff')} <span style={{ color: roster.current_shift.detected_staff < roster.current_shift.expected_staff ? 'var(--warning)' : 'var(--success)' }}>
                    {roster.current_shift.detected_staff}
                  </span> {t('people.unit')}
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>班次</th>
                    <th>時段</th>
                    <th>{t('people.expectedStaff')}</th>
                    <th>{t('people.detectedStaff')}</th>
                    <th>差異</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.shifts.map((s) => (
                    <tr key={s.shift_id}>
                      <td>{s.label}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{s.start}–{s.end}</td>
                      <td>{s.expected_staff}</td>
                      <td>{s.detected_avg_staff}</td>
                      <td style={{ color: s.variance < 0 ? 'var(--warning)' : 'var(--success)' }}>
                        {s.variance > 0 ? '+' : ''}{s.variance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="empty-state">{t('people.empty')}</div>
          )}
        </div>
      </div>
    </PageStatus>
  );
}
