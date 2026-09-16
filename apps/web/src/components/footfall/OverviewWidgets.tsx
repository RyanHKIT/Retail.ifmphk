import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { CHART } from '@/lib/chartStyle'
import type {
  AudienceRow,
  CompareSeries,
  EntranceHourly,
  HolidayRow,
  HourlyPoint,
  MonthDayPoint,
  UniqueKpi,
  WeekdayAvg,
} from '@/lib/footfall/api'

const TOOLTIP_STYLE = {
  background: 'var(--flow-panel-2)',
  border: '1px solid var(--flow-line)',
  borderRadius: 8,
  color: 'var(--flow-text)',
  fontSize: 12,
}

const AGE_KEYS = [
  'toddler',
  'teenager',
  'youth',
  'middle_aged',
  'elderly',
  'unknown',
] as const

const WEEKDAY_KEYS = [
  'overview.weekday.mon',
  'overview.weekday.tue',
  'overview.weekday.wed',
  'overview.weekday.thu',
  'overview.weekday.fri',
  'overview.weekday.sat',
  'overview.weekday.sun',
] as const

const PIE_COLORS = [CHART[1], CHART[2], CHART[3], CHART[4], '#6b7c99', '#4a5568']

export function TodayHourlyChart({ data }: { data: HourlyPoint[] }) {
  const { t } = useFlowLocale()
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data}>
        <CartesianGrid stroke="var(--flow-line)" strokeDasharray="3 3" />
        <XAxis dataKey="hour" tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} width={36} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="inCount"
          name={t('overview.series.in')}
          stroke={CHART[1]}
          fill={CHART[1]}
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="outCount"
          name={t('overview.series.out')}
          stroke={CHART[4]}
          fill={CHART[4]}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function EntranceFootfallChart({
  data,
  locale,
}: {
  data: EntranceHourly[]
  locale: string
}) {
  const { t } = useFlowLocale()
  const rows = data.map((g) => ({
    name: locale === 'zh-HK' ? g.nameZh : g.nameEn,
    in: g.sevenDayIn,
    out: g.sevenDayOut,
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={rows}>
        <CartesianGrid stroke="var(--flow-line)" strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} width={36} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--flow-muted)' }} />
        <Bar dataKey="in" name={t('overview.series.in')} fill={CHART[1]} radius={[4, 4, 0, 0]} />
        <Bar dataKey="out" name={t('overview.series.out')} fill={CHART[4]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MonthDailyChart({ data }: { data: MonthDayPoint[] }) {
  const { t } = useFlowLocale()
  const rows = data.map((d) => ({
    day: d.day.slice(8),
    inCount: d.inCount,
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={rows}>
        <CartesianGrid stroke="var(--flow-line)" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fill: 'var(--flow-muted)', fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} width={36} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="inCount" name={t('overview.series.in')} fill={CHART[2]} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function WeekdayDistributionChart({ data }: { data: WeekdayAvg[] }) {
  const { t } = useFlowLocale()
  const rows = data.map((d) => ({
    label: t(WEEKDAY_KEYS[d.weekday] ?? WEEKDAY_KEYS[0]),
    avg: Math.round(d.avgInCount),
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={rows}>
        <CartesianGrid stroke="var(--flow-line)" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} width={36} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="avg" name={t('overview.series.avgIn')} fill={CHART[1]} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HolidayAnalysisTable({
  data,
  locale,
}: {
  data: HolidayRow[]
  locale: string
}) {
  const { t } = useFlowLocale()
  const rows = data.slice(0, 6)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}
      >
        <thead>
          <tr style={{ color: 'var(--flow-muted)', textAlign: 'left' }}>
            <th style={{ padding: '4px 6px', fontWeight: 500 }}>{t('overview.holiday.day')}</th>
            <th style={{ padding: '4px 6px', fontWeight: 500 }}>{t('overview.holiday.name')}</th>
            <th style={{ padding: '4px 6px', fontWeight: 500 }}>{t('overview.holiday.holidayIn')}</th>
            <th style={{ padding: '4px 6px', fontWeight: 500 }}>{t('overview.holiday.normalIn')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} style={{ borderTop: '1px solid var(--flow-line)' }}>
              <td style={{ padding: '6px' }}>{r.day}</td>
              <td style={{ padding: '6px' }}>
                {locale === 'zh-HK' ? r.holidayNameZh : r.holidayNameEn}
              </td>
              <td style={{ padding: '6px' }}>{r.holidayInCount.toLocaleString()}</td>
              <td style={{ padding: '6px' }}>
                {r.normalInCount == null ? '—' : r.normalInCount.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TodayUniqueKpi({ data }: { data: UniqueKpi }) {
  const { t } = useFlowLocale()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: '100%' }}>
      <div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--flow-text)',
            lineHeight: 1.1,
          }}
        >
          {data.today.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, color: 'var(--flow-muted)', marginTop: 4 }}>
          {t('overview.unique.label')}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, height: 72 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.spark}>
            <Area
              type="monotone"
              dataKey="uniqueVisitors"
              stroke={CHART[1]}
              fill={CHART[1]}
              fillOpacity={0.2}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function AudienceCharts({ data }: { data: AudienceRow[] }) {
  const { t } = useFlowLocale()
  const gender = data
    .filter((r) => r.ageGroup === 'unknown' && r.gender !== 'unknown')
    .map((r) => ({
      name: t(`overview.gender.${r.gender}`),
      value: r.visitorCount,
    }))
  const age = AGE_KEYS.map((key) => {
    const row = data.find((r) => r.gender === 'unknown' && r.ageGroup === key)
    return {
      name: t(`overview.age.${key}`),
      value: row?.visitorCount ?? 0,
    }
  }).filter((r) => r.value > 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, height: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={gender} dataKey="value" nameKey="name" outerRadius={60} innerRadius={28}>
            {gender.map((_, i) => (
              <Cell key={gender[i].name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 10, color: 'var(--flow-muted)' }} />
        </PieChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={age} layout="vertical" margin={{ left: 8, right: 8 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={48}
            tick={{ fill: 'var(--flow-muted)', fontSize: 10 }}
          />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" name={t('overview.series.visitors')} fill={CHART[2]} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CompareChart({ data }: { data: CompareSeries }) {
  const { t } = useFlowLocale()
  const n = Math.max(data.selected.length, data.lastWeek.length, data.yoy.length)
  const rows = Array.from({ length: n }, (_, i) => ({
    i: i + 1,
    selected: data.selected[i]?.inCount ?? null,
    lastWeek: data.lastWeek[i]?.inCount ?? null,
    yoy: data.yoy[i]?.inCount ?? null,
  }))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={rows}>
        <CartesianGrid stroke="var(--flow-line)" strokeDasharray="3 3" />
        <XAxis dataKey="i" tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} />
        <YAxis tick={{ fill: 'var(--flow-muted)', fontSize: 11 }} width={36} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--flow-muted)' }} />
        <Line
          type="monotone"
          dataKey="selected"
          name={t('overview.compare.selected')}
          stroke={CHART[1]}
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="lastWeek"
          name={t('overview.compare.lastWeek')}
          stroke={CHART[2]}
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="yoy"
          name={t('overview.compare.yoy')}
          stroke={CHART[3]}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
