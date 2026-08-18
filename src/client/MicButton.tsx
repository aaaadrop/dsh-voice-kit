import { useEffect, useRef, useState } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { VoiceRecognizer } from './speech.ts'
import { createVoiceRecognizer } from './speech.ts'
import { appendDraft, type DraftActions } from './draft.ts'
import type { VoiceSettings } from './settings.ts'
import { t } from './locales.ts'
import css from './voice.module.css'

/**
 * Mic button mounted in the composer's left rail
 * (`conversation.input.left` slot).
 *
 * The draft write path is the conversation session kit: every session-scope
 * slot component receives `useInput` (live InputState hook) and
 * `inputActions` (the public draft face). Transcriptions are appended to the
 * existing draft via `inputActions.setDraft(appendDraft(current, text))`.
 */
export interface MicButtonProps {
  /** Conversation session id (injected by the slot). */
  sessionId?: string
  /** Active locale ('zh' | 'en'), injected by the slot. */
  locale?: string
  /** Speech-recognition language override (defaults to settings). */
  language?: string
  /** Session kit: selector hook over the live InputState (draft read). */
  useInput?: SnapshotSelectorHook<{ draft: string }>
  /** Session kit: the public draft write face. */
  inputActions?: DraftActions
  /** Live thunk over the 'voice' settings (recognition language). */
  voiceSettings?: () => Partial<VoiceSettings>
  className?: string
}

type ListeningState = 'idle' | 'listening' | 'unsupported' | 'error'

export function MicButton(props: MicButtonProps): JSX.Element {
  const { sessionId, locale, language, className } = props
  const [state, setState] = useState<ListeningState>('idle')
  const recognizerRef = useRef<VoiceRecognizer | null>(null)
  const bufferRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      recognizerRef.current?.cancel()
      recognizerRef.current = null
    }
  }, [])

  /** Commit buffered transcripts into the composer draft (appended). */
  const commitTranscript = (): void => {
    const transcript = bufferRef.current.join(' ')
    bufferRef.current = []
    if (transcript.trim() === '') return
    // The session kit's hook is stable-present for session-scope slots; the
    // guard exists only for type-safety (the composer left rail only mounts
    // inside a real session).
    const useInput = props.useInput
    const current = useInput !== undefined ? useInput((s) => s.draft) : undefined
    props.inputActions?.setDraft(appendDraft(current, transcript))
  }

  const stop = (): void => {
    recognizerRef.current?.stop()
    commitTranscript()
  }

  const toggle = (): void => {
    if (state === 'listening') {
      stop()
      return
    }
    // Kill any previous recognizer first (its auto-restart timer would
    // otherwise outlive this click and keep listening forever). Clear the
    // buffer BEFORE cancelling so the stale recognizer's cancel-flush is a
    // no-op and old transcripts are not committed twice.
    bufferRef.current = []
    recognizerRef.current?.cancel()
    recognizerRef.current = null
    // Recognition language from live settings ('auto' falls back to zh-CN).
    const settings = props.voiceSettings?.() ?? {}
    const settingLang = settings.language ?? 'auto'
    const recogLang = settingLang === 'auto' || settingLang === '' ? 'zh-CN' : settingLang
    const recognizer = createVoiceRecognizer(language ?? recogLang, {
      onResult: (text, isFinal) => {
        if (isFinal) {
          bufferRef.current.push(text)
        }
      },
      onStateChange: (next) => {
        if (next === 'stopped' || next === 'idle') {
          // Auto-stopped (silence / session end): flush what we heard.
          setState((prev) => (prev === 'listening' ? 'idle' : prev))
          commitTranscript()
        } else {
          setState(next === 'unsupported' ? 'unsupported' : next === 'error' ? 'error' : next === 'listening' ? 'listening' : 'idle')
        }
      },
    })
    if (recognizer === null) {
      setState('unsupported')
      return
    }
    recognizerRef.current = recognizer
    recognizer.start()
  }

  // Esc cancels recording.
  useEffect(() => {
    if (state !== 'listening') return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        recognizerRef.current?.cancel()
        bufferRef.current = []
        setState('idle')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  const label = state === 'listening'
    ? t(locale, 'micListening')
    : state === 'unsupported'
      ? t(locale, 'micUnsupported')
      : state === 'error'
        ? t(locale, 'micError')
        : t(locale, 'micStart')

  return (
    <button
      type="button"
      className={`${css.iconButton} ${state === 'listening' ? css.listening : ''} ${className ?? ''}`}
      onClick={() => void toggle()}
      disabled={state === 'unsupported'}
      title={label}
      aria-label={label}
    >
      {state === 'listening' ? '◉' : '🎤'}
    </button>
  )
}
