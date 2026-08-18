/**
 * Settings model for the 'voice' namespace, shared by the client settings
 * card and the host-side schema (src/index.ts registers the same fields).
 * @module dsh-voice-kit/client/settings
 */

export interface VoiceSettings {
  /** Master switch for the whole kit. */
  enabled?: boolean
  /** TTS backend: 'edge' (Microsoft neural) or 'system' (speechSynthesis). */
  provider?: 'system' | 'edge'
  /** Recognition language: 'auto' | BCP-47 tag (e.g. 'zh-CN', 'en-US'). */
  language?: string
  /** speechSynthesis rate (0.5 – 2). */
  rate?: number
  /** speechSynthesis pitch (0 – 2). */
  pitch?: number
  /** Preferred voice (edge short name / system voice URI); empty = default. */
  voiceURI?: string
  /** Show the read-aloud button on assistant messages. */
  readAloud?: boolean
}

/** BCP-47 recognition languages offered in the settings card. */
export const LANGUAGE_CHOICES: readonly { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto / 自动' },
  { value: 'zh-CN', label: '中文（普通话）' },
  { value: 'zh-CN-shanghai', label: '中文（上海话）' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
]

/** Sanitize a value stored from a form control (numbers clamp, strings trim). */
export function normalizeSettings(patch: Partial<VoiceSettings>): Partial<VoiceSettings> {
  const out: Partial<VoiceSettings> = {}
  if (patch.enabled !== undefined) out.enabled = Boolean(patch.enabled)
  if (patch.provider !== undefined) {
    out.provider = patch.provider === 'system' ? 'system' : 'edge'
  }
  if (patch.language !== undefined) out.language = patch.language || 'auto'
  if (patch.rate !== undefined) out.rate = clampNumber(patch.rate, 0.5, 2)
  if (patch.pitch !== undefined) out.pitch = clampNumber(patch.pitch, 0, 2)
  if (patch.voiceURI !== undefined) out.voiceURI = patch.voiceURI || ''
  if (patch.readAloud !== undefined) out.readAloud = Boolean(patch.readAloud)
  return out
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}
