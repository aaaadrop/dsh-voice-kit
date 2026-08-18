/**
 * dsh-voice-kit browser half — mounts the mic button (composer left rail),
 * the per-message read-aloud button (assistant message action strip) and the
 * settings card (settings section), all through the official slot registry.
 *
 * Slot names verified against @deepseek-ai/dsh-client-ui-conversation's
 * SlotMap: `conversation.input.left`, `conversation.chat.assistant-actions`;
 * the settings entry `settings.section` comes from @deepseek-ai/dsh-client-ui-settings.
 *
 * Draft writes and snapshot reads ride the conversation session kit
 * (useInput/inputActions/useSession), which every session-scope slot
 * component receives — see ./draft.ts and ./message.ts. The 'voice' settings
 * namespace is bound once here and handed to components through their inject
 * faces (read at interaction time, so live changes apply on the next click).
 * @module dsh-voice-kit/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the settings-surface Context merge (ctx.settingsScope) and its SlotMap merge.
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the conversation SlotMap merge (input.left / assistant-actions entries).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: slot registry types (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { NS, zh, en } from './locales.ts'
import type { VoiceSettings } from './settings.ts'
import { MicButton } from './MicButton.tsx'
import { ReadAloudButton } from './ReadAloudButton.tsx'
import { VoiceSettingsCard } from './SettingsCard.tsx'

/** Required services. */
export const inject = ['slots', 'locale', 'settingsScope']

/**
 * Client plugin body: register dictionaries, bind the 'voice' settings scope,
 * seat the mic button in the composer, seat the read-aloud button on
 * assistant messages, and mount the settings card as a first-level settings
 * section.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    // 3-arg overload registers one locale at a time under any namespace;
    // each call returns a disposer, so combine them.
    const disposeZh = ctx.locale.register(NS, 'zh', zh)
    const disposeEn = ctx.locale.register(NS, 'en', en)
    return () => {
      disposeZh()
      disposeEn()
    }
  }, 'voice-kit: dictionaries')

  // The 'voice' namespace is registered host-side (src/index.ts), so this
  // scope resolves to 'ready' and persists. Components read it lazily via a
  // thunk so live settings changes apply on the next interaction.
  const voiceScope = ctx.settingsScope.bind<VoiceSettings>({ namespace: 'voice' })
  const voiceSettingsAt = (): Partial<VoiceSettings> => {
    const snapshot = voiceScope.getSnapshot()
    return snapshot.status === 'ready' ? (snapshot.value ?? {}) : {}
  }

  // Mic button in the composer's left rail. Draft writes ride the session
  // kit's public face (useInput + inputActions); recognition language comes
  // from the voice settings.
  ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
    name: 'conversation.input.left',
    id: 'voice-mic',
    order: 200,
    // 'common' is one of the shell's declared locale namespaces; the
    // component receives the active UI locale through PropsLocale and
    // translates with our own t() helper.
    locale: 'common',
    inject: () => ({ voiceSettings: voiceSettingsAt }),
  }, MicButton))

  // Read-aloud button on each assistant message's action strip. The inject
  // face receives the session id + the live settings thunk; messageId arrives
  // from the slot owner and the rest of the kit (useSession) through the
  // runtime share.
  ctx.slots.inject('conversation.chat.assistant-actions', () => ctx.slots.register({
    name: 'conversation.chat.assistant-actions',
    id: 'voice-read',
    order: 200,
    locale: 'common',
    inject: (sessionId) => ({ sessionId, voiceSettings: voiceSettingsAt }),
  }, ReadAloudButton))

  // Settings card as a first-level settings section (host-side registered
  // namespace → the card's scope is live and writable).
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'voice-settings',
    order: 100,
    label: () => ctx.locale.bind('voice-kit')('settings.title'),
    locale: 'voice-kit',
    inject: () => ({ scope: voiceScope }),
  }, VoiceSettingsCard))
}
