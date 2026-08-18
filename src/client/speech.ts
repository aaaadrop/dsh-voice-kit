/**
 * Web Speech API (SpeechRecognition) wrapper with transparent session
 * auto-restart. Browser-only: everything here touches the DOM globals and is
 * never imported by the node half.
 *
 * Lifecycle rules (learned from real-browser behavior):
 * - The recognizer keeps listening until the user stops it (click / Esc) or
 *   the browser ends the session (~60s in Chromium); a session end restarts
 *   transparently and the UI state never dips out of 'listening'.
 * - Fatal errors ('not-allowed') surface as 'error'; transient ones
 *   ('no-speech', 'aborted') just roll into the next session.
 *
 * Compatibility: only Chromium-based browsers (Chrome / Edge / Electron)
 * ship SpeechRecognition today; on other engines the recognizer constructor
 * returns null and callers surface `unsupported`.
 * @module dsh-voice-kit/client/speech
 */

export type RecognizerState = 'idle' | 'listening' | 'stopped' | 'unsupported' | 'error'

export interface VoiceRecognizerCallbacks {
  /** Interim (isFinal=false) or final (isFinal=true) transcript fragments. */
  onResult(text: string, isFinal: boolean): void
  onStateChange(state: RecognizerState): void
}

export interface VoiceRecognizer {
  /** Begin (or resume) listening. */
  start(): void
  /** Graceful stop: lets pending final results land before ending. */
  stop(): void
  /** Abort immediately, discarding the current buffer. */
  cancel(): void
}

/** Chrome ends recognition sessions after ~60s; restart transparently. */
const SESSION_RESTART_MS = 60_000

/** Delay before re-arming the recognizer after a browser-ended session. */
const RESTART_GRACE_MS = 100

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: RecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

interface RecognitionResultLike {
  isFinal: boolean
  length: number
  [index: number]: { transcript: string }
}

interface RecognitionEventLike {
  resultIndex: number
  results: {
    length: number
    [index: number]: RecognitionResultLike
  }
}

/** Detect the browser's SpeechRecognition constructor (Chromium prefix). */
export function speechRecognitionAvailable(): boolean {
  return typeof window !== 'undefined'
    && ((window as unknown as Record<string, unknown>).SpeechRecognition !== undefined
      || (window as unknown as Record<string, unknown>).webkitSpeechRecognition !== undefined)
}

function getConstructor(): (new () => RecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  const ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as (new () => RecognitionLike) | undefined
  return ctor ?? null
}

/**
 * Create a recognizer. Returns null when the API is unavailable.
 * The recognizer keeps itself alive across Chrome's ~60s session limit; the
 * caller stops it explicitly (click / Esc / unmount).
 */
export function createVoiceRecognizer(
  lang: string,
  callbacks: VoiceRecognizerCallbacks,
): VoiceRecognizer | null {
  const Ctor = getConstructor()
  if (Ctor === null) {
    callbacks.onStateChange('unsupported')
    return null
  }

  let manualStop = false
  let restartTimer: ReturnType<typeof setTimeout> | undefined

  const api: RecognitionLike = new Ctor()
  api.lang = lang
  api.continuous = true
  api.interimResults = true
  api.maxAlternatives = 1

  const clearTimers = (): void => {
    if (restartTimer !== undefined) clearTimeout(restartTimer)
    restartTimer = undefined
  }

  api.onresult = (event: RecognitionEventLike): void => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result: RecognitionResultLike = event.results[i]
      const transcript = result[0]?.transcript ?? ''
      if (result.isFinal) {
        callbacks.onResult(transcript.trim(), true)
      } else {
        interim += transcript
      }
    }
    if (interim.trim() !== '') callbacks.onResult(interim.trim(), false)
  }

  api.onerror = (event: { error: string }): void => {
    // Fatal: the user must grant the microphone. Everything else
    // ('no-speech', 'aborted', …) rolls into the next session via onend.
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      manualStop = true
      clearTimers()
      callbacks.onStateChange('error')
    }
  }

  api.onend = (): void => {
    clearTimers()
    if (manualStop) {
      manualStop = false
      callbacks.onStateChange('idle')
      return
    }
    // Browser ended the session (~60s cap): re-arm without ever leaving the
    // 'listening' state, so the UI cannot flicker into an idle window the
    // user might mistake for "stopped".
    callbacks.onStateChange('listening')
    restartTimer = setTimeout(() => {
      if (manualStop) return
      try {
        api.start()
      } catch {
        callbacks.onStateChange('error')
      }
    }, RESTART_GRACE_MS)
  }

  return {
    start(): void {
      clearTimers()
      manualStop = false
      callbacks.onStateChange('listening')
      try {
        api.start()
      } catch {
        callbacks.onStateChange('error')
      }
    },
    stop(): void {
      manualStop = true
      clearTimers()
      try {
        api.stop()
      } catch {
        // Fall through: emit idle below regardless.
      }
      // Idle now; onend (if it fires) repeats it harmlessly.
      callbacks.onStateChange('idle')
    },
    cancel(): void {
      manualStop = true
      clearTimers()
      try {
        api.abort()
      } catch {
        // Fall through: emit idle below regardless.
      }
      callbacks.onStateChange('idle')
    },
  }
}

/** Exported for diagnostics / tuning. */
export const SPEECH_CONSTANTS = { SESSION_RESTART_MS, RESTART_GRACE_MS } as const
