/**
 * speechSynthesis read-aloud wrapper: markdown/emoji stripping, chunking,
 * provider dispatch (system voices vs Edge neural TTS), queue control and
 * voice enumeration. Browser-only. Pure helpers (stripMarkdown, chunkForSpeech,
 * stripEmojis) are exported separately so they can be unit-tested in node.
 * @module dsh-voice-kit/client/tts
 */

/** Strip emoji (and their variation/ZWJ/modifier components) so the voice does not read pictograph names. */
export function stripEmojis(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\p{Emoji_Modifier}]/gu, ' ')
}

/** Strip markdown so the voice reads clean prose, not syntax. */
export function stripMarkdown(text: string): string {
  return stripEmojis(text)
    // Fenced code blocks (drop them: code is not prose)
    .replace(/```[\s\S]*?```/g, ' ')
    // Inline code
    .replace(/`([^`]*)`/g, '$1')
    // Images ![alt](url) → alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Links [text](url) → text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Headings
    .replace(/^#{1,6}\s+/gm, '')
    // Bold / italic / strikethrough
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    // Blockquotes
    .replace(/^>\s?/gm, '')
    // Table pipes → separators, drop divider rows
    .replace(/^\s*\|?[-:|\s]+\|?\s*$/gm, ' ')
    .replace(/\|/g, ' ')
    // Task list markers
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, '')
    // List markers
    .replace(/^\s*[-*+]\s+/gm, '')
    // HTML tags (rare in replies, cheap insurance)
    .replace(/<[^>]+>/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Sentence terminators for chunking. An ASCII `.` counts as a boundary ONLY
 * when followed by whitespace or end-of-text, so decimals ("25.5") and URLs
 * ("example.com/…") are never split mid-token. CJK/full-width terminators
 * (。！？；;…) always count.
 */
const SENTENCE_BOUNDARY = /(?<=[。！？!?；;])(?=\s|$)|(?<=\.)(?=\s|$)/g

/** Split text into speech-sized chunks at sentence boundaries. */
export function chunkForSpeech(text: string, maxChunk = 240): string[] {
  const clean = text.trim()
  if (clean === '') return []
  if (clean.length <= maxChunk) return [clean]

  // Keep the terminator with its sentence.
  const sentences = clean.split(SENTENCE_BOUNDARY).map((s) => s.trim()).filter(Boolean)

  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if (sentence.length > maxChunk) {
      // Oversized sentence: flush and hard-split.
      if (current !== '') {
        chunks.push(current)
        current = ''
      }
      for (let i = 0; i < sentence.length; i += maxChunk) {
        chunks.push(sentence.slice(i, i + maxChunk))
      }
      continue
    }
    if (current.length + sentence.length > maxChunk) {
      chunks.push(current)
      current = sentence
    } else {
      current = current === '' ? sentence : `${current} ${sentence}`
    }
  }
  if (current !== '') chunks.push(current)
  return chunks
}

/** TTS backends. */
export type TtsProvider = 'system' | 'edge'

export interface SpeakOptions {
  rate?: number
  pitch?: number
  voiceURI?: string
  provider?: TtsProvider
  onEnd?: () => void
}

export interface SpeakHandle {
  /** Stop this utterance (and the whole queue). */
  stop(): void
  /** Whether this handle is still speaking. */
  speaking(): boolean
}

/** Resolve the synthesis API; null when unsupported. */
export function getSynthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

/** Enumerate available voices (resolves once the voiceschanged event fires). */
export function listVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  const synth = getSynthesis()
  if (synth === null) return Promise.resolve([])
  const existing = synth.getVoices()
  if (existing.length > 0) return Promise.resolve(existing)
  return new Promise((resolve) => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      resolve(synth.getVoices())
    }
    const timer = setTimeout(finish, timeoutMs)
    synth.addEventListener('voiceschanged', () => {
      clearTimeout(timer)
      finish()
    }, { once: true })
  })
}

/** Stop everything currently queued on the system synthesis engine. */
export function stopSpeaking(): void {
  getSynthesis()?.cancel()
}

/**
 * Speak text with the selected provider. 'edge' uses the host's Edge neural
 * TTS endpoint (falls back to the system voice when offline/failing);
 * 'system' uses speechSynthesis.
 */
export function speak(text: string, options: SpeakOptions = {}): SpeakHandle {
  const provider = options.provider ?? 'edge'
  if (provider === 'edge' && typeof fetch === 'function') {
    const edgeHandle = startEdgeSpeech(text, options)
    if (edgeHandle !== null) return edgeHandle
  }
  return speakSystem(text, options)
}

/** Host endpoint that synthesizes mp3 (see src/routes.ts). */
const EDGE_TTS_ENDPOINT = '/api/voice-kit/tts'

/** Max text chars per edge synthesis request (kept well under URL/SSML limits). */
const EDGE_CHUNK_MAX = 800

/** Speak via the host's Edge TTS endpoint + <audio> playback. */
function startEdgeSpeech(text: string, options: SpeakOptions): SpeakHandle | null {
  if (typeof Audio !== 'function') return null
  const controller = new AbortController()
  let stopped = false
  let finished = false
  let audio: HTMLAudioElement | null = null
  const chunks = chunkForSpeech(stripMarkdown(text), EDGE_CHUNK_MAX)

  const finish = (): void => {
    if (!finished) {
      finished = true
      options.onEnd?.()
    }
  }
  if (chunks.length === 0) {
    finish()
    return { stop(): void {}, speaking(): boolean { return false } }
  }

  void (async () => {
    try {
      for (const chunk of chunks) {
        if (stopped) return
        await playEdgeChunk(chunk, options, controller, (element) => { audio = element })
      }
      finish()
    } catch {
      if (stopped) return
      // Offline / synthesis failure: fall back to the system voice.
      speakSystem(text, { ...options, onEnd: finish })
    }
  })()

  return {
    stop(): void {
      stopped = true
      controller.abort()
      if (audio !== null) audio.pause()
      stopSpeaking()
    },
    speaking(): boolean {
      return !finished
    },
  }
}

/** Synthesize one chunk through the host and play it to completion. */
async function playEdgeChunk(
  chunk: string,
  options: SpeakOptions,
  controller: AbortController,
  setAudio: (element: HTMLAudioElement) => void,
): Promise<void> {
  const response = await fetch(EDGE_TTS_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: chunk,
      voice: options.voiceURI,
      rate: options.rate,
      pitch: options.pitch,
    }),
    signal: controller.signal,
  })
  if (!response.ok) throw new Error(`edge-tts ${response.status}`)
  const blob = await response.blob()
  if (controller.signal.aborted) return
  const url = URL.createObjectURL(blob)
  const element = new Audio(url)
  setAudio(element)
  await new Promise<void>((resolve, reject) => {
    element.onended = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    element.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('edge-tts playback failed'))
    }
    element.play().catch((error: unknown) => {
      URL.revokeObjectURL(url)
      reject(error)
    })
  })
}

/** Speak via the system speechSynthesis engine (chunked queue). */
function speakSystem(text: string, options: SpeakOptions = {}): SpeakHandle {
  const synth = getSynthesis()
  const handle: SpeakHandle = {
    stop(): void {
      stopSpeaking()
      finished = true
    },
    speaking(): boolean {
      return !finished
    },
  }
  if (synth === null) return handle

  let finished = false
  const chunks = chunkForSpeech(stripMarkdown(text))
  const onChunkEnd = (): void => {
    if (finished) return
    if (chunks.length === 0) {
      finished = true
      options.onEnd?.()
      return
    }
    const next = chunks.shift()!
    const utterance = new SpeechSynthesisUtterance(next)
    utterance.rate = options.rate ?? 1
    utterance.pitch = options.pitch ?? 1
    if (options.voiceURI !== undefined && options.voiceURI !== '') {
      const voice = synth.getVoices().find((v) => v.voiceURI === options.voiceURI)
      if (voice !== undefined) utterance.voice = voice
    }
    utterance.onend = onChunkEnd
    utterance.onerror = onChunkEnd
    synth.speak(utterance)
  }
  onChunkEnd()
  return handle
}
