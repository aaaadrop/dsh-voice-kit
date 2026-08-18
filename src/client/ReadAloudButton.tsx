import { useEffect, useRef, useState } from 'react'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { getSynthesis, speak, stopSpeaking, stripMarkdown, type SpeakHandle, type TtsProvider } from './tts.ts'
import { debugMessageInfo, messageTextOf } from './message.ts'
import type { VoiceSettings } from './settings.ts'
import { t } from './locales.ts'
import css from './voice.module.css'

/**
 * Read-aloud button mounted on each assistant message's action strip
 * (`conversation.chat.assistant-actions` slot).
 *
 * The slot owner carries `messageId`; the message body is resolved from the
 * conversation snapshot through the session kit's `useSession` hook (see
 * ./message.ts). While the kit hook or the message is unavailable the button
 * stays hidden. Only `text` blocks are spoken (reasoning / tool calls /
 * images are skipped); markdown is stripped before speaking.
 *
 * On play the button logs a diagnostic line (matched messageId, block kinds,
 * spoken text preview) and scrolls itself into view, so the message being
 * read is always visible.
 */
export interface ReadAloudButtonProps {
  /** Assistant message id (injected by the slot owner). */
  messageId?: string
  /** Conversation session id (runtime share). */
  sessionId?: string
  /** Active locale ('zh' | 'en'), runtime share. */
  locale?: string
  /** Session kit: selector hook over the conversation snapshot. */
  useSession?: SnapshotSelectorHook<ConversationSnapshot>
  /** Live thunk over the 'voice' settings (provider/voice/rate/pitch). */
  voiceSettings?: () => Partial<VoiceSettings>
  /** speechSynthesis rate. */
  rate?: number
  /** Preferred voice URI. */
  voiceURI?: string
  className?: string
}

export function ReadAloudButton(props: ReadAloudButtonProps): JSX.Element | null {
  const { messageId, locale, rate = 1, voiceURI, className } = props
  const [speaking, setSpeaking] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const handleRef = useRef<SpeakHandle | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  // The session kit's hook is stable-present for session-scope slots; the
  // guard exists only for type-safety (the action strip only mounts inside a
  // real session).
  const useSession = props.useSession
  const snapshot = useSession !== undefined ? useSession((s) => s) : undefined
  const text = messageTextOf(messageId, snapshot)
  // What the voice will actually say: sanitized (markdown + emoji stripped).
  const spokenText = text !== undefined ? stripMarkdown(text) : undefined

  // Clean up speech on unmount (session switch / new conversation).
  useEffect(() => {
    return () => {
      handleRef.current?.stop()
      handleRef.current = null
    }
  }, [])

  const supported = typeof window !== 'undefined' && getSynthesis() !== null
  if (!supported || spokenText === undefined || spokenText.trim() === '') return null

  const clearReading = (): void => {
    handleRef.current = null
    setSpeaking(false)
    setPreview(null)
  }

  const toggle = (): void => {
    if (speaking) {
      handleRef.current?.stop()
      clearReading()
      return
    }
    // Diagnostic: what exactly is about to be spoken (real-browser ground truth).
    // eslint-disable-next-line no-console
    console.info('[dsh-voice-kit] read:', debugMessageInfo(messageId, snapshot))
    // One voice at a time: kill any other utterance still queued anywhere.
    stopSpeaking()
    // Live settings (read at click time, so changes apply immediately).
    const settings = props.voiceSettings?.() ?? {}
    const provider = (settings.provider ?? 'edge') as TtsProvider
    const handle = speak(spokenText, {
      provider,
      rate: settings.rate ?? rate ?? 1,
      pitch: settings.pitch ?? 1,
      voiceURI: settings.voiceURI ?? voiceURI,
      onEnd: () => {
        clearReading()
      },
    })
    handleRef.current = handle
    setSpeaking(true)
    // In-GUI proof of what is being read: show the first ~60 chars in a bubble.
    setPreview(spokenText.length > 60 ? `${spokenText.slice(0, 60)}…` : spokenText)
    // Anchor the reading: bring this message's action row into the viewport.
    buttonRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  return (
    <span className={css.readerWrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${css.iconButton} ${speaking ? css.speaking : ''} ${className ?? ''}`}
        onClick={() => void toggle()}
        // Hover shows what will be read (first ~40 chars) — no DevTools needed.
        title={speaking
          ? `${t(locale, 'readStop')} · ${spokenText.slice(0, 40)}`
          : `${t(locale, 'readStart')}：${spokenText.slice(0, 40)}`}
        aria-label={speaking ? t(locale, 'readStop') : t(locale, 'readStart')}
      >
        {speaking ? '⏹' : '🔊'}
      </button>
      {preview !== null && (
        <span className={css.readingBubble} role="status">
          {t(locale, 'readingNow')}：「{preview}」
        </span>
      )}
    </span>
  )
}
