/**
 * Draft composition for the composer.
 *
 * The draft write path is the session kit's public face: every session-scope
 * slot component receives `inputActions.setDraft(text)` (the ONLY public draft
 * write path, per the input machine contract) plus `useInput` (the live
 * InputState hook, whose `draft` field is the current text). Transcriptions
 * are appended to the existing draft, never replacing it.
 * @module dsh-voice-kit/client/draft
 */

/**
 * Append a transcript to the current draft with sane spacing.
 * @param current - current draft text (may be undefined/blank).
 * @param text - transcript to append (trimmed, whitespace-collapsed).
 * @returns the full next draft, or the current draft when text is blank.
 */
export function appendDraft(current: string | undefined, text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (clean === '') return current ?? ''
  if (current === undefined || current.trim() === '') return clean
  return `${current.replace(/\s+$/, '')} ${clean}`
}

/** The public draft write face the conversation session kit provides. */
export interface DraftActions {
  /** Single public draft write path (full next draft). */
  setDraft(text: string): void
  /** Enter submission (adjudication / claim transaction / default sink). */
  submit(): void
}

/** The public draft read face: selector hook over the session's InputState. */
export interface DraftRead {
  draft: string
}
