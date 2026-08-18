/**
 * Locale dictionaries for the 'voice-kit' namespace. Registered client-side
 * via ctx.locale.register(NS, 'zh'|'en', dict); components receive the active
 * locale through the slot's composed props and translate with t(). The
 * namespace is declared on @deepseek-ai/dsh-client-ui-slots' LocaleNamespaceMap
 * so `locale: 'voice-kit'` and `ctx.locale.bind('voice-kit')` typecheck in
 * slot registrations (mirrors the dsh-pet pattern).
 * @module dsh-voice-kit/client/locales
 */

/** Locale namespace registered with the dsh client locale service. */
export const NS = 'voice-kit'

export const zh = {
  micStart: '语音输入',
  micListening: '正在聆听…（再次点击或按 Esc 结束）',
  micUnsupported: '当前浏览器不支持语音识别',
  micError: '语音识别出错',
  micStop: '停止',
  readStart: '朗读',
  readStop: '停止朗读',
  readUnsupported: '当前浏览器不支持语音合成',
  readingNow: '正在朗读',
  settingsTitle: '语音',
  settingsDescription: '语音输入与回复朗读设置',
  settingsEnabled: '启用语音套件',
  settingsProvider: '语音引擎',
  settingsProviderEdge: '微软神经语音（推荐）',
  settingsProviderSystem: '系统语音',
  settingsLanguage: '识别语言',
  settingsLanguageAuto: '自动',
  settingsRate: '语速',
  settingsPitch: '音调',
  settingsVoice: '朗读音色',
  settingsVoiceDefault: '默认音色',
  settingsReadAloud: '在回复尾部显示朗读按钮',
  draftNotWired: '语音转写完成，但草稿插入尚未接线（开发中）',
  // First-level settings section label (rendered in the settings nav).
  'settings.title': '语音',
  'settings.description': '语音输入与回复朗读设置',
} as const

export const en = {
  micStart: 'Voice input',
  micListening: 'Listening… (click again or press Esc to stop)',
  micUnsupported: 'Speech recognition is not supported in this browser',
  micError: 'Speech recognition error',
  micStop: 'Stop',
  readStart: 'Read aloud',
  readStop: 'Stop',
  readUnsupported: 'Speech synthesis is not supported in this browser',
  readingNow: 'Reading',
  settingsTitle: 'Voice',
  settingsDescription: 'Voice input and read-aloud settings',
  settingsEnabled: 'Enable voice kit',
  settingsProvider: 'Voice engine',
  settingsProviderEdge: 'Microsoft neural (recommended)',
  settingsProviderSystem: 'System voice',
  settingsLanguage: 'Recognition language',
  settingsLanguageAuto: 'Auto',
  settingsRate: 'Rate',
  settingsPitch: 'Pitch',
  settingsVoice: 'Voice',
  settingsVoiceDefault: 'Default voice',
  settingsReadAloud: 'Show read-aloud button on replies',
  draftNotWired: 'Transcription ready, but draft insertion is not wired yet (WIP)',
  // First-level settings section label (rendered in the settings nav).
  'settings.title': 'Voice',
  'settings.description': 'Voice input and read-aloud settings',
} as const

export type VoiceLocaleKey = keyof typeof zh

/** Key union for this namespace (feeds the LocaleNamespaceMap declaration). */
export type VoiceKey = VoiceLocaleKey

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-voice-kit UI copy. */
    'voice-kit': VoiceKey
  }
}

/** Translate a key against the active locale ('zh' or 'en'). */
export function t(locale: string | undefined, key: VoiceLocaleKey): string {
  const dict = locale === 'zh' ? zh : en
  return dict[key]
}
