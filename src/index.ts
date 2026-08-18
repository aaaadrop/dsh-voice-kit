/**
 * dsh-voice-kit host half — hosts the Edge TTS synthesis endpoint
 * ('/api/voice-kit/tts', same pattern as dsh-pet's '/api/pet/*') and
 * registers the 'voice' settings namespace so provider/voice/rate/pitch
 * selections persist and resolve through the official settings service.
 * The browser half (lib/client.js) reads the same namespace client-side via
 * settingsScope and plays the synthesized mp3 with an <audio> element.
 *
 * Install via `dsh plugin --profile <name> add dsh-voice-kit` (npm) or
 * `add link:<path>` (local).
 * @module dsh-voice-kit
 */

import { Context } from '@deepseek-ai/cordis'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-host-webserver'
import z from '@deepseek-ai/schemastery'
import { runVoiceInvariants } from './invariant.ts'
import { makeVoiceRoutes } from './routes.ts'

/** Plugin id used by the profile loader and the web plugin roster. */
export const name = 'dsh-voice-kit'

/** Settings namespace shared with the browser half. */
export const VOICE_SETTINGS_NAMESPACE = 'voice'

/** Default voice settings (also the composition 'base' layer). */
const voiceDefaults = {
  provider: 'edge',
  enabled: true,
  language: 'auto',
  rate: 1,
  pitch: 1,
  voiceURI: '',
  readAloud: true,
} as const

/** Schema resolving the 'voice' namespace (defaults, then base, then user layer). */
const voiceSettingsSchema = z.object({
  provider: z.union(['system', 'edge'] as const).default('edge'),
  enabled: z.boolean().default(true),
  language: z.string().default('auto'),
  rate: z.number().min(0.5).max(2).default(1),
  pitch: z.number().min(0).max(2).default(1),
  voiceURI: z.string().default(''),
  readAloud: z.boolean().default(true),
})

/** Services required before the host can mount its surfaces. */
export const inject = ['webServer']

/**
 * Register the Edge TTS routes and the 'voice' settings namespace.
 * @param ctx - host context.
 */
export function apply(ctx: Context): void {
  runVoiceInvariants()

  // TTS synthesis endpoint (browser half POSTs text, gets mp3 back).
  ctx.effect(() => {
    const disposers = makeVoiceRoutes().map((route) => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'voice-kit: routes')

  // 'voice' namespace so provider/voice/rate/pitch persist and the client
  // scope resolves to 'ready'.
  installSettingsSection(
    ctx,
    settingsNamespace(VOICE_SETTINGS_NAMESPACE),
    voiceSettingsSchema,
    voiceDefaults,
    {
      setSource: () => {},
      onChange: () => {},
    },
  )
}
