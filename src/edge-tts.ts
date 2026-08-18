/**
 * Edge TTS synthesis host service: Microsoft Edge Read Aloud API via
 * msedge-tts. Requires network; results are cached in-memory so repeated
 * readings of the same text are instant.
 * @module dsh-voice-kit/edge-tts
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { DEFAULT_EDGE_VOICE, mapPitchToEdge, mapRateToEdge } from './edge-params.ts'

export interface EdgeTtsRequest {
  /** Text to synthesize (already markdown/emoji-stripped by the client). */
  text: string
  /** Edge voice short name; defaults to 晓晓. */
  voice?: string
  /** Rate in speechSynthesis convention (0.5–2, 1 = normal). */
  rate?: number
  /** Pitch in speechSynthesis convention (0–2, 1 = normal). */
  pitch?: number
}

const CACHE_LIMIT = 100
const cache = new Map<string, Buffer>()

/** Synthesize text to an mp3 Buffer (cached per voice/rate/pitch/text). */
export async function synthesizeEdge(request: EdgeTtsRequest): Promise<Buffer> {
  const voice = request.voice !== undefined && request.voice !== '' ? request.voice : DEFAULT_EDGE_VOICE
  const key = `${voice}|${request.rate ?? 1}|${request.pitch ?? 1}|${request.text}`
  const hit = cache.get(key)
  if (hit !== undefined) return hit

  const tts = new MsEdgeTTS()
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
    const { audioStream } = tts.toStream(request.text, {
      rate: mapRateToEdge(request.rate ?? 1),
      pitch: mapPitchToEdge(request.pitch ?? 1),
    })
    const audio = await collectStream(audioStream)
    if (audio.length === 0) throw new Error('edge-tts returned empty audio')
    if (cache.size >= CACHE_LIMIT) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined) cache.delete(oldest)
    }
    cache.set(key, audio)
    return audio
  } finally {
    tts.close()
  }
}

/** Drop the synthesis cache (memory bound / config changes). */
export function clearEdgeCache(): void {
  cache.clear()
}

function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
