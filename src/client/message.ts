/**
 * Resolve an assistant message's text from its messageId.
 *
 * The `conversation.chat.assistant-actions` slot owner carries only
 * `messageId`; the message body is read from the conversation snapshot the
 * session kit exposes through `useSession`. Only `text` blocks are read aloud
 * — `reasoning` (chain of thought), tool calls and images are skipped.
 * @module dsh-voice-kit/client/message
 */

import type { AssistantBlock, AssistantMessageNode, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

/** Join an assistant node's text blocks into speakable prose. */
export function assistantTextOf(blocks: readonly AssistantBlock[]): string {
  return blocks
    .filter((block): block is Extract<AssistantBlock, { kind: 'text' }> => block.kind === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim()
}

/**
 * Find an assistant message by id and return its text-block content.
 * @param messageId - assistant message identity (slot owner currency).
 * @param snapshot - conversation snapshot from the session kit's useSession.
 * @returns the speakable text, or undefined when unknown or empty.
 */
export function messageTextOf(
  messageId: string | undefined,
  snapshot: ConversationSnapshot | undefined,
): string | undefined {
  if (messageId === undefined || snapshot === undefined) return undefined
  const node = findAssistantNode(messageId, snapshot)
  if (node === undefined) return undefined
  const text = assistantTextOf(node.blocks)
  return text === '' ? undefined : text
}

/** Locate the assistant node carrying a messageId (shared lookup). */
function findAssistantNode(
  messageId: string,
  snapshot: ConversationSnapshot,
): AssistantMessageNode | undefined {
  return snapshot.nodes.find(
    (n): n is AssistantMessageNode => n.kind === 'assistant' && n.messageId === messageId,
  )
}

/**
 * Compact diagnostic describing what WOULD be read for a messageId. Logged by
 * the read-aloud button so real-browser mismatches can be diagnosed from the
 * console (block kinds + spoken text preview).
 */
export function debugMessageInfo(
  messageId: string | undefined,
  snapshot: ConversationSnapshot | undefined,
): string {
  if (messageId === undefined || snapshot === undefined) {
    return `no messageId/snapshot (messageId=${String(messageId)}, snapshot=${snapshot !== undefined})`
  }
  const node = findAssistantNode(messageId, snapshot)
  if (node === undefined) {
    const candidates = snapshot.nodes
      .filter((n): n is AssistantMessageNode => n.kind === 'assistant')
      .map((n) => `${n.messageId ?? '(no-id)'}@${n.seq}`)
    return `no assistant node with messageId=${messageId}; present: ${candidates.join(', ') || '(none)'}`
  }
  const kinds = node.blocks.map((b) => b.kind).join(',')
  const text = assistantTextOf(node.blocks)
  return `matched messageId=${messageId} seq=${node.seq} blocks=[${kinds}] text(${text.length})="${text.slice(0, 80)}"`
}
