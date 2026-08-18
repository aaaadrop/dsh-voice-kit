import { describe, expect, it } from 'vitest'
import { appendDraft } from './draft.ts'

describe('appendDraft', () => {
  it('returns blank when transcript is blank', () => {
    expect(appendDraft('已有文本', '   ')).toBe('已有文本')
    expect(appendDraft(undefined, '')).toBe('')
  })

  it('returns the transcript alone when the draft is empty', () => {
    expect(appendDraft('', 'hello world')).toBe('hello world')
    expect(appendDraft(undefined, '  你好 世界 ')).toBe('你好 世界')
  })

  it('appends with a single space', () => {
    expect(appendDraft('先写一句', '再补一句')).toBe('先写一句 再补一句')
  })

  it('does not stack trailing whitespace', () => {
    expect(appendDraft('先写一句   ', '再补')).toBe('先写一句 再补')
  })

  it('collapses internal whitespace in the transcript', () => {
    expect(appendDraft('a', 'b   c\n\nd')).toBe('a b c d')
  })
})
