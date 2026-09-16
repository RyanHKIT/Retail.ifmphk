// Platform Q&A, bottom-right.
//
// Scope is docs and schema only, so this panel explains how the platform works
// and cannot report figures. That limitation is stated in the panel before the
// first question rather than discovered by asking, because a manager who
// expects numbers and gets none reads it as broken.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, MessageSquare, Send, X } from 'lucide-react'
import { useFlowLocale } from '@/context/FlowLocaleContext'
import {
  AiUnavailableError,
  askQuestion,
  isAiEnabled,
  type AskMeta,
} from '@/lib/ai/api'

interface Turn {
  role: 'user' | 'assistant'
  content: string
  meta?: AskMeta
}

export function ChatPanel() {
  const { t, locale } = useFlowLocale()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isAiEnabled()) setHidden(true)
  }, [])

  // Keep the newest text in view as it streams in.
  useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [turns, streaming])

  // Escape closes and returns focus to the trigger, so keyboard users are not
  // stranded in a floating panel.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Abandon any in-flight stream when the panel unmounts, so a closed panel
  // does not keep burning tokens.
  useEffect(() => () => abortRef.current?.abort(), [])

  if (hidden) return null

  async function send() {
    const question = draft.trim()
    if (!question || streaming) return

    const history = turns.map((turn) => ({ role: turn.role, content: turn.content }))

    setDraft('')
    setError(null)
    setStreaming(true)
    setTurns((prev) => [
      ...prev,
      { role: 'user', content: question },
      { role: 'assistant', content: '', meta: undefined },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    // Append to the last assistant turn as deltas arrive.
    function appendToAssistant(text: string) {
      setTurns((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last && last.role === 'assistant') {
          next[next.length - 1] = { ...last, content: last.content + text }
        }
        return next
      })
    }

    try {
      await askQuestion({
        question,
        locale,
        history,
        signal: controller.signal,
        handlers: {
          onDelta: appendToAssistant,
          onMeta: (meta) => {
            setTurns((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last && last.role === 'assistant') {
                next[next.length - 1] = { ...last, meta }
              }
              return next
            })
          },
          onError: () => setError(t('ai.chat.error')),
          onDone: () => {},
        },
      })
    } catch (err) {
      if (controller.signal.aborted) return
      if (err instanceof AiUnavailableError) setHidden(true)
      else setError(t('ai.chat.error'))
    } finally {
      if (!controller.signal.aborted) setStreaming(false)
    }
  }

  return (
    <div className="flow-chat" data-testid="flow-chat">
      {open && (
        <div
          className="flow-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-label={t('ai.chat.title')}
        >
          <header className="flow-chat-head">
            <strong>{t('ai.chat.title')}</strong>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
              aria-label={t('ai.chat.close')}
              data-testid="flow-chat-close"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </header>

          <p className="flow-chat-disclaimer">{t('ai.chat.disclaimer')}</p>

          <div className="flow-chat-scroll" ref={scrollRef} data-testid="flow-chat-scroll">
            {turns.length === 0 && (
              <p className="flow-chat-hint">{t('ai.chat.empty')}</p>
            )}

            {turns.map((turn, index) => (
              <div
                key={index}
                className={`flow-chat-turn ${turn.role}`}
                data-testid={`flow-chat-turn-${turn.role}`}
              >
                <div className="flow-chat-bubble">
                  {turn.content || (turn.role === 'assistant' && streaming ? t('ai.chat.thinking') : '')}
                </div>
                {turn.meta?.suggestedRoute && (
                  <button
                    type="button"
                    className="flow-chat-route"
                    onClick={() => {
                      navigate(turn.meta!.suggestedRoute!)
                      setOpen(false)
                    }}
                    data-testid="flow-chat-route"
                  >
                    {t('ai.chat.viewTab')}
                    <ArrowRight size={12} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}

            {error && (
              <p className="flow-chat-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <form
            className="flow-chat-compose"
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('ai.chat.placeholder')}
              aria-label={t('ai.chat.placeholder')}
              maxLength={500}
              data-testid="flow-chat-input"
            />
            <button
              type="submit"
              disabled={streaming || draft.trim().length === 0}
              aria-label={t('ai.chat.send')}
              data-testid="flow-chat-send"
            >
              <Send size={14} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        className="flow-chat-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={t('ai.chat.open')}
        title={t('ai.chat.open')}
        data-testid="flow-chat-trigger"
      >
        <MessageSquare size={18} aria-hidden="true" />
      </button>
    </div>
  )
}

export default ChatPanel
