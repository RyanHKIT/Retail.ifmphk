// Prompt builders and response validation.
//
// One prompt per overview tab, each asking a different question. Summarising
// the chart is worthless; the value is in picking the question the manager
// cannot answer quickly themselves. See the design spec §4 for the rationale
// behind each one.
//
// Bumping PROMPT_VERSION invalidates every cached insight, which is what makes
// editing a prompt safe.

import type { AiMessage } from './aiClient.ts'
import { METRIC_GLOSSARY } from './schemaDigest.ts'

export const PROMPT_VERSION = 1

export const TAB_KEYS = [
  'overview',
  'journey',
  'entrances',
  'audience',
  'compare',
  'holidays',
] as const

export type TabKey = (typeof TAB_KEYS)[number]
export type Locale = 'zh-HK' | 'en'

export function isTabKey(value: unknown): value is TabKey {
  return typeof value === 'string' && (TAB_KEYS as readonly string[]).includes(value)
}

export function isLocale(value: unknown): value is Locale {
  return value === 'zh-HK' || value === 'en'
}

/** The question each tab's analysis answers. */
const TAB_QUESTIONS: Record<TabKey, string> = {
  overview:
    'What happened today, and does anything need the manager? Weigh the peak hour against the shape of the day and the direction of the week. Say which matters more.',
  journey:
    'Where do visitors dwell, and what is being missed? Identify the dominant flow, then zones that read cold relative to their position on the path. Heat is clipped to the shop outline, so a zone outside the drawn polygon is not evidence of low traffic.',
  entrances:
    'Are the gates and the staffing in balance? Look at each gate share of total load, and whether any gate is used one-directionally. Phrase any reallocation as a question for the manager, never an instruction.',
  audience:
    'Who is coming, and is that shifting? Report composition only. Never infer intent, spend, motives, or identity from demographics.',
  compare:
    'Up or down, and is the gap closing? State the comparison basis explicitly, because a percentage without its baseline is meaningless. Note where week-on-week and year-on-year disagree.',
  holidays:
    'How do holidays differ from normal trading, and what is coming? The genuinely interesting case is a holiday that underperformed its matched normal weekday — flag it.',
}

/** Response shape. The renderer depends on exactly these fields. */
export interface Insight {
  headline: string
  observations: string[]
  action: string | null
  confidence: 'low' | 'normal'
}

const CONTRACT = `Return ONLY a JSON object, no prose around it, with exactly these keys:
{
  "headline": string,
  "observations": string[],
  "action": string | null,
  "confidence": "low" | "normal"
}
Rules:
- headline: one sentence, the single most decision-relevant fact.
- observations: 2 or 3 strings. Each MUST cite a number that appears in the input.
- action: one concrete next step, or null. Omit rather than pad.
- confidence: "low" when the input is thin or distorted — a single day, a partial
  week, a near-empty chart, or a holiday-dominated period. Otherwise "normal".
- Never introduce a number that is not in the input. Do not estimate or extrapolate.
- Do not restate the chart. Say what it means.
- No markdown, no bullet characters, no headings inside the strings.`

function languageRule(locale: Locale): string {
  return locale === 'zh-HK'
    ? 'Write in Hong Kong Traditional Chinese (繁體中文, 港式用語). Keep numerals as digits. Do not mix in English words except widely used ones like App.'
    : 'Write in plain English.'
}

export interface InsightInput {
  tabKey: TabKey
  locale: Locale
  day: string
  /** Aggregates fetched server-side. Never taken from the request body. */
  data: unknown
}

export function buildInsightMessages(input: InsightInput): AiMessage[] {
  const { tabKey, locale, day, data } = input

  const system = `You are a retail operations analyst for a single Hong Kong retail store.
You read footfall aggregates and write a short, honest briefing for the branch manager.

${languageRule(locale)}

${CONTRACT}

Metric definitions:
${METRIC_GLOSSARY}

The manager may reallocate staff on the strength of your wording. Do not overstate.`

  const user = `Tab: ${tabKey}
Store: I.T. Causeway Bay
Data day: ${day}

Question this analysis must answer:
${TAB_QUESTIONS[tabKey]}

Aggregates (JSON):
${JSON.stringify(data, null, 2)}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

export function buildAskMessages(options: {
  question: string
  locale: Locale
  schemaDigest: string
  history: AiMessage[]
}): AiMessage[] {
  const { question, locale, schemaDigest, history } = options

  const system = `You explain how the IFMP Retail platform works.

${languageRule(locale)}

You are given the data model below. You have NO access to any actual data —
no counts, no totals, no names, no dates. Never state a figure, because you do
not have one.

When a question asks for live numbers, do not guess and do not refuse flatly:
- explain how that figure is defined and where it is recorded,
- tell the manager which tab displays it,
- and set suggestedRoute so the UI can offer a link.

Answer only from the data model and the definitions given. If something is not
covered, say you cannot confirm it from the platform documentation rather than
inventing an answer. Keep answers under 120 words unless asked to elaborate.

Output format — follow it exactly, because the answer is streamed to the user
and the tail is parsed as metadata:

1. The answer prose, as plain text. No markdown headings, no bullet characters,
   no wrapping JSON, no code fences.
2. Then a line containing exactly: ${ASK_DELIMITER}
3. Then a single-line JSON object: {"suggestedRoute": string|null, "definitionRefs": string[]}

suggestedRoute must be one of the routes in the data model, or null.
definitionRefs: short labels for the fields or tables the answer drew on, max 5.
Nothing may follow the JSON object.

# Data model
${schemaDigest}`

  // History is replayed so follow-ups keep context. Trimmed to the last 6 turns
  // to bound the prompt: older chat adds cost without improving the answer.
  const recentHistory = history.slice(-6)

  return [
    { role: 'system', content: system },
    ...recentHistory,
    { role: 'user', content: question },
  ]
}

/** Marker separating streamed answer prose from its parsed metadata trailer. */
export const ASK_DELIMITER = '<<<META>>>'

export interface AskAnswer {
  text: string
  suggestedRoute: string | null
  definitionRefs: string[]
}

/** Routes the chat is allowed to deep-link to. Anything else is dropped. */
const ALLOWED_ROUTES = new Set([
  '/flow',
  '/flow/journey',
  '/flow/entrances',
  '/flow/audience',
  '/flow/compare',
  '/flow/holidays',
  '/flow/roster',
  '/flow/roster/staff',
  '/flow/roster/templates',
  '/flow/roster/policies',
  '/flow/roster/swaps',
  '/flow/roster/audit',
  '/flow/devices',
  '/flow/settings',
])

/**
 * Split accumulated model output into streamed prose and its metadata.
 *
 * Returns `prose` and `emitted` separately because while streaming we only want
 * the part that is unambiguously prose: the delimiter itself, and anything after
 * it, must not reach the reader. `emitted` is the safe prefix to send.
 */
export function splitAskStream(accumulated: string): {
  prose: string
  metadata: string | null
  emitted: string
} {
  const at = accumulated.indexOf(ASK_DELIMITER)

  if (at !== -1) {
    return {
      prose: accumulated.slice(0, at).trimEnd(),
      metadata: accumulated.slice(at + ASK_DELIMITER.length),
      emitted: accumulated.slice(0, at),
    }
  }

  // No delimiter yet. Hold back a trailing partial match so a delimiter split
  // across two chunks never leaks to the user as literal text. Withholding the
  // longest possible partial (length - 1) is also the tightest bound available,
  // since no shorter suffix can extend into the delimiter without passing
  // through this one first.
  const holdBack = ASK_DELIMITER.length - 1
  const safeLength = Math.max(0, accumulated.length - holdBack)
  const emitted = accumulated.slice(0, safeLength)

  return { prose: accumulated, metadata: null, emitted }
}

export function parseAskMeta(metadata: string | null): {
  suggestedRoute: string | null
  definitionRefs: string[]
} {
  const empty = { suggestedRoute: null, definitionRefs: [] }
  if (!metadata) return empty

  const raw = extractJsonObject(metadata)
  if (!raw || typeof raw !== 'object') return empty

  const source = raw as Record<string, unknown>
  const route =
    typeof source.suggestedRoute === 'string' && ALLOWED_ROUTES.has(source.suggestedRoute)
      ? source.suggestedRoute
      : null
  const refs = Array.isArray(source.definitionRefs)
    ? source.definitionRefs
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 5)
    : []

  return { suggestedRoute: route, definitionRefs: refs }
}

/**
 * Extract a JSON object from model output.
 *
 * Deliberately forgiving. Providers wrap JSON in ```json fences, prepend
 * "Here is the analysis:", or emit a trailing sentence. All three are common,
 * and failing the whole generation over one of them would waste the call.
 */
function extractJsonObject(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced ? fenced[1] : text).trim()

  try {
    return JSON.parse(candidate)
  } catch {
    // Fall back to the outermost brace pair in the raw text.
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(candidate.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

export function parseInsight(text: string): Insight | null {
  const raw = extractJsonObject(text)
  if (!raw || typeof raw !== 'object') return null

  const source = raw as Record<string, unknown>
  const headline = typeof source.headline === 'string' ? source.headline.trim() : ''
  if (!headline) return null

  const observations = Array.isArray(source.observations)
    ? source.observations
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 3)
    : []

  const action =
    typeof source.action === 'string' && source.action.trim().length > 0
      ? source.action.trim()
      : null

  return {
    headline,
    observations,
    action,
    // Anything other than an explicit 'normal' is treated as low. A malformed
    // confidence must not be read as a confident claim.
    confidence: source.confidence === 'normal' ? 'normal' : 'low',
  }
}
