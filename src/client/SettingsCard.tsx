import { useEffect, useState } from 'react'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { LANGUAGE_CHOICES, normalizeSettings, type VoiceSettings } from './settings.ts'
import { EDGE_VOICES } from '../edge-params.ts'
import { listVoices } from './tts.ts'
import { t } from './locales.ts'
import css from './voice.module.css'

/**
 * Settings card for the 'voice' namespace, rendered as a first-level
 * settings section (`settings.section` slot).
 *
 * The scope is bound client-side (settingsScope.bind({ namespace: 'voice' }))
 * and written with scope.set / scope.unset. TODO(verify): if settings do not
 * persist across restarts, register the namespace host-side through
 * @deepseek-ai/dsh-settings (installSettingsSection) in src/index.ts.
 */
export interface VoiceSettingsCardProps {
  /** Bound settings scope (injected by the slot). */
  scope?: SettingsScope<VoiceSettings>
  /** Active locale ('zh' | 'en'). */
  locale?: string
  className?: string
}

export function VoiceSettingsCard(props: VoiceSettingsCardProps): JSX.Element {
  const { scope, locale, className } = props
  const [snapshot, setSnapshot] = useState<SettingsScopeSnapshot<VoiceSettings> | null>(
    () => scope?.getSnapshot() ?? null,
  )
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (scope === undefined) return
    setSnapshot(scope.getSnapshot())
    const unsubscribe = scope.subscribe(() => setSnapshot(scope.getSnapshot()))
    return unsubscribe
  }, [scope])

  // Resolved settings: only the schema-resolved section is authoritative.
  const settings: VoiceSettings = snapshot?.status === 'ready' ? (snapshot.value ?? {}) : {}

  useEffect(() => {
    void listVoices().then(setVoices)
  }, [])

  const update = (patch: Partial<VoiceSettings>): void => {
    if (scope === undefined) return
    const normalized = normalizeSettings(patch)
    for (const [key, value] of Object.entries(normalized)) {
      if (value === undefined) scope.unset(key as keyof VoiceSettings)
      else void scope.set(key as keyof VoiceSettings, value)
    }
  }

  return (
    <section className={`${css.settingsCard} ${className ?? ''}`} data-plugin-ns="voice-kit">
      <h2>{t(locale, 'settingsTitle')}</h2>

      <label className={css.field}>
        <input
          type="checkbox"
          checked={settings.enabled !== false}
          onChange={(event) => update({ enabled: event.target.checked })}
        />
        {t(locale, 'settingsEnabled')}
      </label>

      <label className={css.field}>
        <span>{t(locale, 'settingsProvider')}</span>
        <select
          value={settings.provider ?? 'edge'}
          onChange={(event) => update({ provider: event.target.value as 'system' | 'edge' })}
        >
          <option value="edge">{t(locale, 'settingsProviderEdge')}</option>
          <option value="system">{t(locale, 'settingsProviderSystem')}</option>
        </select>
      </label>

      <label className={css.field}>
        <span>{t(locale, 'settingsLanguage')}</span>
        <select
          value={settings.language ?? 'auto'}
          onChange={(event) => update({ language: event.target.value })}
        >
          {LANGUAGE_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>{choice.label}</option>
          ))}
        </select>
      </label>

      <label className={css.field}>
        <span>{t(locale, 'settingsRate')}: {settings.rate?.toFixed(2) ?? '1.00'}</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.05}
          value={settings.rate ?? 1}
          onChange={(event) => update({ rate: Number(event.target.value) })}
        />
      </label>

      <label className={css.field}>
        <span>{t(locale, 'settingsPitch')}: {settings.pitch?.toFixed(2) ?? '1.00'}</span>
        <input
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={settings.pitch ?? 1}
          onChange={(event) => update({ pitch: Number(event.target.value) })}
        />
      </label>

      <label className={css.field}>
        <span>{t(locale, 'settingsVoice')}</span>
        <select
          value={settings.voiceURI ?? ''}
          onChange={(event) => update({ voiceURI: event.target.value })}
        >
          <option value="">{t(locale, 'settingsVoiceDefault')}</option>
          {(settings.provider ?? 'edge') === 'edge'
            ? EDGE_VOICES.map((voice) => (
              <option key={voice.value} value={voice.value}>{voice.label}</option>
            ))
            : voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))}
        </select>
      </label>

      <label className={css.field}>
        <input
          type="checkbox"
          checked={settings.readAloud !== false}
          onChange={(event) => update({ readAloud: event.target.checked })}
        />
        {t(locale, 'settingsReadAloud')}
      </label>
    </section>
  )
}
