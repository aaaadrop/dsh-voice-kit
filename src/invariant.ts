/**
 * Package invariants — cheap structural checks run at import time on the
 * host side. Mirrors the pattern used by other dsh plugin packages.
 * @module dsh-voice-kit/invariant
 */

/** Assert a condition; throws a descriptive Error when violated. */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[dsh-voice-kit] ${message}`)
  }
}

/** Maximum utterance chunk for speechSynthesis (characters). */
const MAX_UTTERANCE_CHARS = 240

/** Run every package invariant once; throws on the first violation. */
export function runVoiceInvariants(): void {
  invariant(MAX_UTTERANCE_CHARS >= 80, 'MAX_UTTERANCE_CHARS must be >= 80')
}

// Run once on import (host half only; cheap and side-effect free).
runVoiceInvariants()
