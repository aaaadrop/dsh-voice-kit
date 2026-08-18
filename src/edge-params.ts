/**
 * Edge TTS parameter mapping and curated voice list. Pure module shared by
 * the host half (ssml prosody mapping) and the client half (settings UI);
 * unit-tested in node.
 * @module dsh-voice-kit/edge-params
 */

/** Curated Microsoft neural voices (Edge Read Aloud API short names). */
export const EDGE_VOICES: readonly { value: string; label: string }[] = [
  { value: 'zh-CN-XiaoxiaoNeural', label: '晓晓（女·自然，推荐）' },
  { value: 'zh-CN-XiaoyiNeural', label: '晓伊（女）' },
  { value: 'zh-CN-YunxiNeural', label: '云希（男·年轻）' },
  { value: 'zh-CN-YunjianNeural', label: '云健（男·沉稳）' },
  { value: 'zh-CN-YunyangNeural', label: '云扬（男·新闻）' },
  { value: 'en-US-AriaNeural', label: 'Aria (English US)' },
  { value: 'en-US-JennyNeural', label: 'Jenny (English US)' },
  { value: 'ja-JP-NanamiNeural', label: 'Nanami (日本語)' },
] as const

/** Default edge voice when none is selected. */
export const DEFAULT_EDGE_VOICE = 'zh-CN-XiaoxiaoNeural'

/**
 * Map a 0.5–2 rate scale (speechSynthesis convention, 1 = normal) to the
 * SSML relative percentage edge-tts expects ('+50%' = faster).
 */
export function mapRateToEdge(rate: number): string {
  const delta = Math.round((rate - 1) * 100)
  return `${delta >= 0 ? '+' : ''}${delta}%`
}

/**
 * Map a 0–2 pitch scale (speechSynthesis convention, 1 = normal) to the SSML
 * relative frequency edge-tts expects ('+30Hz' = higher).
 */
export function mapPitchToEdge(pitch: number): string {
  const hz = Math.round((pitch - 1) * 30)
  return `${hz >= 0 ? '+' : ''}${hz}Hz`
}
