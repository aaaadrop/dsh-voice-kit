# dsh-voice-kit 🎙️

DeepSeek Harness Web GUI 的语音输入（Web Speech API）与回复朗读（speechSynthesis）套件。

[English](README.md)

> **状态：v0.3.1，已发布 npm** — `pnpm typecheck` 通过、35 个单测通过、
> `pnpm build` 产出生态标准 closure-factory bundle（宿主半区 + 浏览器半区）。
> 语音输入与回复朗读已按真实 conversation API 接线（session kit 的
> `inputActions`/`useInput`/`useSession`）；朗读支持**微软 Edge 神经语音**
> （host 侧经 `msedge-tts` 合成、带缓存、失败自动回退系统语音）。
> 已在真实 DSH Desktop profile 里验证通过。安装：`dsh plugin add dsh-voice-kit`。

## 功能

- 🎤 **语音输入** — 输入框左侧麦克风按钮；语音转写（Chrome/Edge
  `webkitSpeechRecognition`）后**追加**进草稿。自动跨过 Chrome ~60 秒会话
  上限；`Esc` 取消。
- 🔊 **神经语音朗读** — 每条 assistant 消息尾部朗读按钮。默认引擎为
  **微软 Edge 神经语音**（晓晓/云希/云健/云扬…），host 侧合成后以
  `<audio>` 播放；离线或失败时自动回退 `speechSynthesis`。朗读前剥离
  markdown 与 emoji；长回复按句子边界分段（小数/URL 永不被切断）；同一时刻
  只读一条；播放时消息自动滚到视野中央并弹出气泡显示正在读的内容。
- ⚙️ **设置** — 一级设置页：语音引擎（神经/系统）、音色、语速、音调、识别
  语言、开关——持久化在 `voice` 命名空间（host 侧经 `@deepseek-ai/dsh-settings` 注册）。

## 安装

```bash
# npm 发布后
dsh plugin add dsh-voice-kit

# 本地开发
dsh plugin --profile web add link:/path/to/dsh-voice-kit
```

重启 harness 并刷新 Web GUI。

> ⚠️ **语音输入为实验特性。** `webkitSpeechRecognition` 是 Chromium 的功能，
> 在 Electron（DSH Desktop）里**不工作**：麦克风按钮会进入聆听状态，但
> 不会产生任何转写文字。在普通浏览器（Chrome/Edge）里打开 DSH 时可能可用。
> **朗读功能在所有环境可用**（含系统语音回退）。

## 开发

```bash
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest（纯逻辑：markdown 剥离 / 分块）
pnpm build       # tsdown → lib/index.js（宿主）+ lib/client.js（浏览器）
```

构建链路采用生态标准 closure-factory bundle
（`window.__ModuleLoader__.load`），由 `shared/tsdown.client.ts` 驱动
（改编自官方 DeepSeek Harness `packages/client/tsdown.client.ts`，MIT；
`libExternal` 选项来自 dsh-web-ui 全家桶，Apache-2.0，见文件头注明）。

### 接线状态

- [x] 语言注册 — `ctx.locale.register(ns, locale, dict)` 三参重载
- [x] 草稿插入 — session kit 的 `inputActions.setDraft(appendDraft(current, text))`，
      用 `useInput((s) => s.draft)` 读当前草稿（`src/client/draft.ts`）
- [x] 消息正文解析 — `conversation.chat.assistant-actions` owner 的
      `messageId` + `useSession` 快照查找，只取 text 块（`src/client/message.ts`）
- [ ] **运行时验证** — 装进真实 DSH profile（`dsh plugin --profile desktop add link:...`）
      确认三个插槽在 GUI 里真实渲染；若渲染端给的 props 有出入再修正
- [ ] 设置持久化 — 若 `voice` 命名空间重启后丢失，在 `src/index.ts` 用
      `@deepseek-ai/dsh-settings`（installSettingsSection）宿主侧注册

## Roadmap

- v0.1 — 朗读（无权限依赖，先做稳）+ 设置骨架
- v0.2 — 语音输入 + 草稿插入（依赖草稿 API 与麦克风权限）
- v0.3 — 语音结束自动发送、快捷键、双语打磨、对 DSH 新 rc 的 CI 兼容实测

## License

MIT。内置的 `shared/tsdown.client.ts` 改编自官方 DSH 构建工具（MIT）与
dsh-web-ui 的 `libExternal` 选项（Apache-2.0），详见文件头。
