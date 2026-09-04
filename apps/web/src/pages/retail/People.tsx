import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { api } from '@/api/retail';
import type { PeopleSummary, PeopleHourly, StaffHourly, ZonePeople, RosterData } from '@/api/retail';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { chartTooltipStyle } from '@/lib/chartStyle';

export function PeoplePage() {
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const [summary, setSummary] = useState<PeopleSummary | null>(null);
  const [hourly, setHourly] = useState<PeopleHourly | null>(null);
  const [staffHourly, setStaffHourly] = useState<StaffHourly | null>(null);
  const [byZone, setByZone] = useState<ZonePeople[]>([]);
  const [roster, setRoster] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.peopleSummary(),
      api.peopleHourly(),
      api.staffHourly(),
      api.peopleByZone(),
      api.roster(),
    ]).then(([s, h, sh, z, r]) => {
      setSummary(s);
      setHourly(h);
      setStaffHourly(sh);
      setByZone(z.zones);
      setRoster(r);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="loading">{t('common.loading')}</div>;

  const staffKey = t('people.staff');
  const customerKey = t('people.customer');
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
    if (s === 'understaffed') return <span className="badge badge-understaffed">不足</span>;
    if (s === 'normal') return <span className="badge badge-normal">正常</span>;
    return <span className="badge">{s}</span>;
  };

  return (
    <>
      <h1 className="page-title">{t('people.title')}</h1>
      <p className="page-subtitle">{t('people.subtitle')}</p>

      <div className="grid-kpi" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="kpi-card">
          <div className="kpi-label">在店員工</div>
          <div><span className="kpi-value">{summary?.in_store.staff}</span><span className="kpi-unit">人</span></div>
          <div className="kpi-realtime">● 實時</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">在店顧客</div>
          <div><span className="kpi-value">{summary?.in_store.customer}</span><span className="kpi-unit">人</span></div>
          <div className="kpi-realtime">● 實時</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">今日過店路人</div>
          <div><span className="kpi-value">{summary?.today_totals.pedestrian_passby.toLocaleString()}</span><span className="kpi-unit">人</span></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">人員時段分佈</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={11} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              <Area type="monotone" dataKey={staffKey} stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
              <Area type="monotone" dataKey={customerKey} stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="card-title">員工分時段 · 排班對照</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={staffCompareData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis dataKey="hour" stroke={chart.axis} fontSize={10} />
              <YAxis stroke={chart.axis} fontSize={11} />
              <Tooltip contentStyle={chartTooltipStyle(chart)} />
              <Legend />
              <Bar dataKey={detectedKey} fill="#e11d48" radius={[4, 4, 0, 0]} />
              <Bar dataKey={expectedKey} fill="#52525b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-title">各區域人員明細</div>
          <table className="data-table">
            <thead>
              <tr>
                <th>區域</th>
                <th>員工</th>
                <th>顧客</th>
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
        </div>
        <div className="card">
          <div className="card-title">排班對照</div>
          {roster && (
            <>
              <div style={{
                background: 'var(--bg-elevated)',
                padding: 16,
                borderRadius: 8,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>當前班次</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: 4 }}>
                  應到 {roster.current_shift.expected_staff} 人
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> / </span>
                  實測 <span style={{ color: roster.current_shift.detected_staff < roster.current_shift.expected_staff ? 'var(--warning)' : 'var(--success)' }}>
                    {roster.current_shift.detected_staff}
                  </span> 人
                </div>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>班次</th>
                    <th>時段</th>
                    <th>應到</th>
                    <th>實測均</th>
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
          )}
        </div>
      </div>
    </>
  );
}
