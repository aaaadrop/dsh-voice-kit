import { describe, expect, it } from 'vitest'
import { chunkForSpeech, stripMarkdown } from './tts.ts'

describe('stripMarkdown', () => {
  it('drops fenced code blocks', () => {
    const input = '说明如下：\n```ts\nconst x = 1\n```\n完毕。'
    const out = stripMarkdown(input)
    expect(out).not.toContain('const x = 1')
    expect(out).toContain('说明如下')
    expect(out).toContain('完毕')
  })

  it('keeps inline code text without backticks', () => {
    expect(stripMarkdown('运行 `npm install` 即可')).toBe('运行 npm install 即可')
  })

  it('turns links into their label', () => {
    expect(stripMarkdown('看 [文档](https://example.com)')).toBe('看 文档')
  })

  it('strips headings, emphasis and blockquote markers', () => {
    expect(stripMarkdown('## 标题\n> 引用 **加粗** _斜体_')).toBe('标题 引用 加粗 斜体')
  })

  it('flattens tables to readable prose', () => {
    const table = '| A | B |\n|---|---|\n| 1 | 2 |'
    const out = stripMarkdown(table)
    expect(out).toContain('1')
    expect(out).toContain('2')
    expect(out).not.toContain('|')
  })

  it('collapses whitespace', () => {
    expect(stripMarkdown('a\n\n  b   c')).toBe('a b c')
  })

  it('strips emoji so the voice does not read pictograph names', () => {
    expect(stripMarkdown('🚀 出发 😄 测试')).toBe('出发 测试')
  })

  it('strips emoji ZWJ sequences and variation selectors', () => {
    expect(stripMarkdown('👨💻 和 ❤️')).toBe('和')
  })

  it('keeps digits and decimals intact', () => {
    expect(stripMarkdown('温度 25.5℃，占比 87.3%')).toBe('温度 25.5℃，占比 87.3%')
  })
})

describe('chunkForSpeech', () => {
  it('returns one chunk for short text', () => {
    expect(chunkForSpeech('你好')).toEqual(['你好'])
  })

  it('returns nothing for blank text', () => {
    expect(chunkForSpeech('   ')).toEqual([])
  })

  it('splits at sentence boundaries under the max', () => {
    const text = '第一句。第二句！Third?'
    const chunks = chunkForSpeech(text, 10)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join(' ').replace(/\s+/g, '')).toContain('第一句')
  })

  it('does NOT split decimals at the dot', () => {
    const chunks = chunkForSpeech('温度 25.5 度', 20)
    expect(chunks).toEqual(['温度 25.5 度'])
  })

  it('does NOT split URLs at the dot', () => {
    const chunks = chunkForSpeech('看 https://example.com/voice-kit 文档', 40)
    expect(chunks).toEqual(['看 https://example.com/voice-kit 文档'])
  })

  it('splits at a period followed by whitespace', () => {
    const chunks = chunkForSpeech('第一段。 第二段。', 5)
    expect(chunks).toEqual(['第一段。', '第二段。'])
  })

  it('hard-splits oversized sentences', () => {
    const long = '啊'.repeat(100)
    const chunks = chunkForSpeech(long, 30)
    expect(chunks.length).toBe(4)
    expect(chunks.every((c) => c.length <= 30)).toBe(true)
  })

  it('respects the max chunk size', () => {
    const text = '句子一。句子二。句子三。句子四。句子五。句子六。'
    for (const chunk of chunkForSpeech(text, 12)) {
      expect(chunk.length).toBeLessThanOrEqual(12)
    }
  })
})
