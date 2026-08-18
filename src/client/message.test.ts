import { describe, expect, it } from 'vitest'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { assistantTextOf, messageTextOf } from './message.ts'

describe('assistantTextOf', () => {
  it('joins text blocks', () => {
    const blocks = [
      { kind: 'text', text: '第一段' },
      { kind: 'text', text: '第二段' },
    ] as const
    expect(assistantTextOf(blocks as never)).toBe('第一段\n第二段')
  })

  it('skips reasoning, tool-call and image blocks', () => {
    const blocks = [
      { kind: 'reasoning', text: '（思考过程，不该朗读）' },
      { kind: 'text', text: '结论在此' },
      { kind: 'tool-call', callId: 'c1', name: 'bash', argsRaw: '{}' },
      { kind: 'image', attachment: { id: 'i1' } as never },
    ] as const
    expect(assistantTextOf(blocks as never)).toBe('结论在此')
  })

  it('returns empty for no text blocks', () => {
    const blocks = [{ kind: 'tool-call', callId: 'c1', name: 'bash', argsRaw: '{}' }] as const
    expect(assistantTextOf(blocks as never)).toBe('')
  })
})

describe('messageTextOf', () => {
  const snapshot = {
    nodes: [
      { kind: 'user', seq: 1, content: [] },
      { kind: 'assistant', seq: 2, messageId: 'msg-1', blocks: [{ kind: 'text', text: '你好' }] },
      { kind: 'assistant', seq: 3, blocks: [{ kind: 'text', text: '被中断，无 messageId' }] },
    ],
  } as unknown as ConversationSnapshot

  it('finds the assistant message by messageId', () => {
    expect(messageTextOf('msg-1', snapshot)).toBe('你好')
  })

  it('returns undefined for unknown ids', () => {
    expect(messageTextOf('nope', snapshot)).toBeUndefined()
  })

  it('returns undefined without a messageId or snapshot', () => {
    expect(messageTextOf(undefined, snapshot)).toBeUndefined()
    expect(messageTextOf('msg-1', undefined)).toBeUndefined()
  })

  it('returns undefined when the message has no text blocks', () => {
    const noText = {
      nodes: [{ kind: 'assistant', seq: 9, messageId: 'msg-9', blocks: [{ kind: 'tool-call', callId: 'c', name: 'bash', argsRaw: '{}' }] }],
    } as unknown as ConversationSnapshot
    expect(messageTextOf('msg-9', noText)).toBeUndefined()
  })
})
