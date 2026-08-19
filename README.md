# dsh-voice-kit 🎙️

Voice input (Web Speech API) and read-aloud (speechSynthesis) for the
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web GUI.

[中文说明](README.zh.md)

> **Status: v0.3.1, published on npm** — `pnpm typecheck` passes, 35 unit
> tests pass, `pnpm build` emits the ecosystem-standard closure-factory bundle
> (host half + browser half). Voice input and read-aloud are wired against
> the real conversation API (session kit's `inputActions`/`useInput`/
> `useSession`), and read-aloud supports **Microsoft Edge neural voices**
> (host-side synthesis via `msedge-tts`, cached, with automatic fallback to
> the system voice). Verified inside a real DSH Desktop profile. Install:
> `dsh plugin add dsh-voice-kit`.

## Features

- 🎤 **Voice input** — mic button in the composer's left rail; speech is
  transcribed (Chrome/Edge `webkitSpeechRecognition`) and appended to the
  draft. Auto-restarts across Chrome's ~60s session limit; `Esc` cancels.
- 🔊 **Read aloud with neural voices** — per-message button at each assistant
  message tail. Default engine is **Microsoft Edge neural TTS** (晓晓/云希/
  云健/云扬…), synthesized host-side and played back with an `<audio>`
  element; falls back to `speechSynthesis` when offline or on failure.
  Markdown and emoji are stripped before speaking; long replies are chunked
  at sentence boundaries (decimals/URLs never split); only one voice at a
  time; the playing message is scrolled into view with an on-screen bubble
  showing what is being read.
- ⚙️ **Settings** — a first-level settings section: voice engine
  (neural/system), voice, rate, pitch, recognition language, toggles —
  persisted in the `voice` settings namespace (registered host-side via
  `@deepseek-ai/dsh-settings`).

## Install

```bash
# from npm (after publish)
dsh plugin add dsh-voice-kit

# or from a local checkout (development)
dsh plugin --profile web add link:/path/to/dsh-voice-kit
```

Restart the harness, refresh the web GUI.

> ⚠️ **Voice input is experimental.** `webkitSpeechRecognition` is a
> Chromium feature and does **not** work inside Electron (DSH Desktop): the
> mic button enters the listening state but no transcript ever lands. It may
> work in Chrome/Edge when DSH is served in a regular browser. **Read-aloud
> works everywhere** (system voice fallback included).

## Development

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest (pure logic: markdown stripping / chunking)
pnpm build       # tsdown → lib/index.js (host) + lib/client.js (browser)
```

Build pipeline is the ecosystem-standard closure-factory bundle
(`window.__ModuleLoader__.load`) driven by `shared/tsdown.client.ts`
(adapted from the official DeepSeek Harness `packages/client/tsdown.client.ts`,
MIT; `libExternal` option from the dsh-web-ui family bucket, Apache-2.0).

### Wiring status

- [x] Locale registration — 3-arg `ctx.locale.register(ns, locale, dict)` overload.
- [x] Draft insertion — session kit's `inputActions.setDraft(appendDraft(current, text))`
      with `useInput((s) => s.draft)` reads (`src/client/draft.ts`).
- [x] Message text resolution — `conversation.chat.assistant-actions` owner's
      `messageId` + `useSession` snapshot lookup, text blocks only
      (`src/client/message.ts`).
- [ ] **Runtime verification** — install into a real DSH profile
      (`dsh plugin --profile desktop add link:...`) and confirm the three slots
      render in the GUI; adjust composed-prop details if the renderer disagrees.
- [ ] Settings persistence — if the `voice` namespace does not survive a
      restart, register it host-side via `@deepseek-ai/dsh-settings`
      (`installSettingsSection`) in `src/index.ts`.

## Roadmap

- v0.1 — read-aloud (safe, no permissions) + settings scaffold
- v0.2 — voice input with draft insertion (needs the draft API + mic permission)
- v0.3 — auto-send on voice stop, keyboard shortcut, bilingual polish, CI
  compat checks against new DSH rc releases

## License

MIT. The bundled `shared/tsdown.client.ts` adapts official DSH build tooling
(MIT) plus the dsh-web-ui `libExternal` option (Apache-2.0); see the file header.
