// Machine-written analysis for one overview tab.
//
// Sits above the charts because it is the conclusion and the charts are the
// evidence. The visual treatment deliberately marks it as interpretation rather
// than measurement: a manager may reallocate staff on this text, so it must
// never be mistaken for a reading from the data.

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import { hkToday } from '@/lib/footfall/api'
import {
  AiUnavailableError,
  fetchInsight,
  isAiEnabled,
  type Insight,
  type TabKey,
} from '@/lib/ai/api'

interface Props {
  tabKey: TabKey
}

export function InsightBlock({ tabKey }: Props) {
  const { t, locale } = useFlowLocale()

  // Read from the same source the charts use, so the analysis can never be
  // about a different day than the numbers on screen.
  const day = hkToday()

  const [insight, setInsight] = useState<Insight | null>(null)
  const [model, setModel] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Distinct from "not configured": the deployment may support it but this
  // build may not have the flag.
  const [hidden, setHidden] = useState(false)

  const load = useCallback(
    async (force: boolean, signal?: AbortSignal) => {
      if (force) setRegenerating(true)
      else setLoading(true)
      setError(null)

      try {
        const response = await fetchInsight({ tabKey, day, locale, force, signal })
        if (signal?.aborted) return
        setInsight(response.insight)
        setModel(response.model)
      } catch (err) {
        if (signal?.aborted) return
        if (err instanceof AiUnavailableError) {
          setHidden(true)
        } else {
          setError(t('ai.insight.error'))
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
          setRegenerating(false)
        }
      }
    },
    [tabKey, day, locale, t],
  )

  useEffect(() => {
    if (!isAiEnabled()) {
      setHidden(true)
      return
    }
    const controller = new AbortController()
    void load(false, controller.signal)
    // Abandoning the in-flight request on unmount avoids a state update after
    // the tab is gone, and stops a slow generation from being billed twice.
    return () => controller.abort()
  }, [load])

  if (hidden) return null

  return (
    <section
      className="ai-insight"
      data-testid="ai-insight"
      data-tab={tabKey}
      aria-label={t('ai.insight.title')}
    >
      <header className="ai-insight-head">
        <span className="ai-insight-badge">
          <Sparkles size={13} aria-hidden="true" />
          {t('ai.insight.title')}
        </span>
        {insight?.confidence === 'low' && (
          <span
            className="ai-insight-confidence"
            title={t('ai.insight.lowConfidenceHint')}
            data-testid="ai-insight-low-confidence"
          >
            <AlertTriangle size={12} aria-hidden="true" />
            {t('ai.insight.lowConfidence')}
          </span>
        )}
        <button
          type="button"
          className="ai-insight-refresh"
          onClick={() => void load(true)}
          disabled={loading || regenerating}
          data-testid="ai-insight-refresh"
        >
          <RefreshCw size={12} aria-hidden="true" />
          {t('ai.insight.regenerate')}
        </button>
      </header>

      {loading || regenerating ? (
        <div className="ai-insight-skeleton" aria-label={t('ai.insight.loading')}>
          <div className="line wide" />
          <div className="line" />
          <div className="line short" />
        </div>
      ) : error ? (
        <div className="ai-insight-error" role="alert">
          <span>{error}</span>
          <button type="button" className="roster-btn" onClick={() => void load(true)}>
            {t('common.retry')}
          </button>
        </div>
      ) : insight ? (
        <div className="ai-insight-body" data-testid="ai-insight-body">
          <p className="ai-insight-headline">{insight.headline}</p>
          {insight.observations.length > 0 && (
            <ul className="ai-insight-observations">
              {insight.observations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
          {insight.action && (
            <p className="ai-insight-action">
              <strong>{t('ai.insight.suggestedAction')}</strong> {insight.action}
            </p>
          )}
        </div>
      ) : (
        <p className="ai-insight-empty">{t('ai.insight.notEnoughData')}</p>
      )}

      <footer className="ai-insight-foot">
        <span>{t('ai.insight.disclaimer')}</span>
        {model && <code>{model}</code>}
      </footer>
    </section>
  )
}
