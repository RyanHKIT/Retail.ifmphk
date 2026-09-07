import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fetchMockWithMeta, toChipSource } from '@/api/retail';
import type { RosterPlanData } from '@/api/retail';
import { ChartPanel } from '@/components/retail/ChartPanel';
import { PageStatus } from '@/components/retail/PageStatus';
import { RosterWeekBoard } from '@/components/retail/RosterWeekBoard';
import { SourceChip } from '@/components/retail/SourceChip';
import { SpineNav } from '@/components/retail/SpineNav';
import type { SourceChipSource } from '@/components/retail/SourceChip';
import { useRetailFilter } from '@/context/RetailFilterContext';
import { loadSuggestedOverride, saveSuggestedOverride, clearSuggestedOverride } from '@/lib/rosterStore';
import { loadBoard } from '@/lib/rosterBoardStore';
import { zoneToStation } from '@/lib/demoSpine';
import { useRetailTheme } from '@/context/RetailThemeContext';
import { useRetailLocale } from '@/context/RetailLocaleContext';
import { CHART, chartTooltipStyle } from '@/lib/chartStyle';
import type { MessageKey } from '@/i18n/messages';

type RosterSection = 'demand' | 'board';

export function RosterPage() {
  const { storeId } = useRetailFilter();
  const { chart } = useRetailTheme();
  const { t } = useRetailLocale();
  const [searchParams] = useSearchParams();
  const queryZone = searchParams.get('zone') ?? '';
  const highlightStation = queryZone ? zoneToStation(queryZone) : undefined;
  const storeLabel = t(`filter.store.${storeId}` as MessageKey);
  const [plan, setPlan] = useState<RosterPlanData | null>(null);
  const [source, setSource] = useState<SourceChipSource | null>(null);
  const [suggested, setSuggested] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState<RosterSection>('demand');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchMockWithMeta<RosterPlanData>('roster-plan.json').then(({ data, meta }) => {
      if (cancelled) return;
      setPlan(data);
      setSource(toChipSource(meta?.source));
      setSuggested(loadSuggestedOverride() ?? [...data.suggested]);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reload]);

  const chartData = useMemo(() => {
    if (!plan) return [];
    const sug = t('roster.suggestedSeries');
    const exp = t('roster.expectedSeries');
    const det = t('roster.detectedSeries');
    const ent = t('roster.enterSeries');
    return plan.hours.map((hour, i) => ({
      hour,
      [sug]: suggested[i] ?? plan.suggested[i],
      [exp]: plan.expected[i],
      [det]: plan.detected[i],
      [ent]: plan.enter_by_hour[i],
    }));
  }, [plan, suggested, t]);

  const bump = (index: number, delta: number) => {
    setSuggested((prev) => {
      const next = [...prev];
      next[index] = Math.max(0, (next[index] ?? 0) + delta);
      return next;
    });
    setSaved(false);
  };

  const persist = () => {
    saveSuggestedOverride(suggested);
    setSaved(true);
  };

  const reset = () => {
    if (!plan) return;
    clearSuggestedOverride();
    setSuggested([...plan.suggested]);
    setSaved(false);
  };

  const sug = t('roster.suggestedSeries');
  const exp = t('roster.expectedSeries');
  const det = t('roster.detectedSeries');
  const ent = t('roster.enterSeries');
  const boardState = loadBoard();

  return (
    <PageStatus loading={loading} error={error} onRetry={() => setReload((n) => n + 1)}>
      {plan && (
        <>
          <div className="page-title-row">
            <h1 className="page-title">{t('roster.title')}</h1>
            {source && <SourceChip source={source} />}
          </div>
          <p className="page-subtitle">
            {storeLabel} · {t('roster.subtitle')}
          </p>
          <SpineNav />

          <div className="source-hint-strip" role="note">
            <span className="source-hint-label">{t('roster.storyLabel')}</span>
            <SourceChip source="counter" />
            <span className="source-hint-copy">{t('roster.story')}</span>
          </div>

          <div className="roster-section-tabs" role="tablist" aria-label={t('roster.title')}>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'demand'}
              className={section === 'demand' ? 'roster-section-tab is-active' : 'roster-section-tab'}
              onClick={() => setSection('demand')}
            >
              {t('roster.sectionDemand')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === 'board'}
              className={section === 'board' ? 'roster-section-tab is-active' : 'roster-section-tab'}
              onClick={() => setSection('board')}
            >
              {t('roster.sectionBoard')}
            </button>
          </div>

          {section === 'demand' && (
            <>
              <section
                className="overview-situation situation-strip chart-enter"
                aria-label={t('roster.sectionDemand')}
              >
                <div className="situation-cell situation-cell--lead">
                  <div className="situation-label">{t('roster.maxGap')}</div>
                  <div>
                    <span className="situation-value">{plan.summary.max_gap}</span>
                    <span className="situation-unit">{t('roster.people')}</span>
                  </div>
                </div>
                <div className="situation-cell">
                  <div className="situation-label">{t('roster.peak')}</div>
                  <div>
                    <span className="situation-value">{plan.summary.peak_hour}</span>
                  </div>
                </div>
                <div className="situation-cell">
                  <div className="situation-label">{t('roster.underHours')}</div>
                  <div>
                    <span className="situation-value">{plan.summary.under_hours}</span>
                    <span className="situation-unit">h</span>
                  </div>
                </div>
                <div className="situation-cell">
                  <div className="situation-label">{t('roster.overHours')}</div>
                  <div>
                    <span className="situation-value">{plan.summary.over_hours}</span>
                    <span className="situation-unit">h</span>
                  </div>
                </div>
              </section>

              <ChartPanel title={t('roster.chart')} style={{ marginBottom: 20 }} staggerIndex={1}>
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                    <XAxis dataKey="hour" stroke={chart.axis} fontSize={11} />
                    <YAxis yAxisId="left" stroke={chart.axis} fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke={chart.axis} fontSize={11} />
                    <Tooltip contentStyle={chartTooltipStyle(chart)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey={det} fill={CHART[4]} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey={exp} stroke={CHART[2]} strokeWidth={2} dot={false} />
                    <Line yAxisId="left" type="monotone" dataKey={sug} stroke={CHART[1]} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey={ent} stroke={CHART[3]} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>{plan.note}</p>
              </ChartPanel>

              <div className="card">
                <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t('roster.tune')}</span>
                  <div className="btn-row">
                    <button type="button" className="btn btn-ghost" onClick={reset}>{t('common.reset')}</button>
                    <button type="button" className="btn btn-primary" onClick={persist}>
                      {saved ? t('common.saved') : t('common.saveLocal')}
                    </button>
                  </div>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('roster.hour')}</th>
                      <th>{t('roster.enter')}</th>
                      <th>{t('roster.expected')}</th>
                      <th>{t('roster.detected')}</th>
                      <th>{t('roster.suggested')}</th>
                      <th>{t('roster.adjust')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.hours.map((h, i) => (
                      <tr key={h}>
                        <td style={{ fontFamily: 'var(--mono)' }}>{h}</td>
                        <td>{plan.enter_by_hour[i]}</td>
                        <td>{plan.expected[i]}</td>
                        <td>{plan.detected[i]}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{suggested[i]}</td>
                        <td>
                          <div className="btn-row">
                            <button type="button" className="btn btn-sm" onClick={() => bump(i, -1)}>−</button>
                            <button type="button" className="btn btn-sm" onClick={() => bump(i, 1)}>+</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {section === 'board' && (
            <>
              <section
                className="overview-situation situation-strip chart-enter roster-board-situation"
                aria-label={t('roster.sectionBoard')}
              >
                <div className="situation-cell situation-cell--lead">
                  <div className="situation-label">{t('roster.boardTarget')}</div>
                  <div>
                    <span className="situation-value">{boardState.targetHeadcount}</span>
                    <span className="situation-unit">{t('roster.people')}</span>
                  </div>
                </div>
                <div className="situation-cell">
                  <div className="situation-label">{t('roster.sectionBoard')}</div>
                  <div>
                    <span className="situation-value">{boardState.weekStart}</span>
                  </div>
                </div>
              </section>
              <RosterWeekBoard highlightStation={highlightStation} />
            </>
          )}
        </>
      )}
    </PageStatus>
  );
}
