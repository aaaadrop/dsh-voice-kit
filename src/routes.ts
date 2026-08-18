/**
 * Voice HTTP routes — the browser half asks the host to synthesize speech
 * through a same-origin endpoint and plays the returned mp3 with an <audio>
 * element. Same pattern as dsh-pet's '/api/pet/*' family.
 * @module dsh-voice-kit/routes
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '@deepseek-ai/dsh-host-webserver'
import { synthesizeEdge } from './edge-tts.ts'

/** Browser-facing base path of the voice API. */
export const VOICE_API_PREFIX = '/api/voice-kit'

/** Max text length per synthesis request (chars). */
const MAX_TEXT_LENGTH = 2000

/** Write one JSON response. */
function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Read a JSON request body (bounded). */
function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > 64 * 1024) {
        reject(new Error('body-too-large'))
        queueMicrotask(() => req.destroy())
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {})
      } catch {
        reject(new Error('invalid-json'))
      }
    })
    req.on('error', reject)
  })
}

/** Build the voice API routes. */
export function makeVoiceRoutes(): WebRoute[] {
  return [
    {
      kind: 'exact',
      path: VOICE_API_PREFIX + '/tts',
      handler: async (req, res): Promise<void> => {
        if (req.method !== 'POST') {
          json(res, 405, { error: 'method-not-allowed' })
          return
        }
        let body: Record<string, unknown>
        try {
          body = await readJsonBody(req)
        } catch (error) {
          json(res, 400, { error: String((error as Error).message ?? error) })
          return
        }
        const text = typeof body.text === 'string' ? body.text.trim() : ''
        if (text === '' || text.length > MAX_TEXT_LENGTH) {
          json(res, 400, { error: 'invalid-text' })
          return
        }
        const voice = typeof body.voice === 'string' ? body.voice : undefined
        const rate = typeof body.rate === 'number' && Number.isFinite(body.rate) ? body.rate : undefined
        const pitch = typeof body.pitch === 'number' && Number.isFinite(body.pitch) ? body.pitch : undefined
        try {
          const audio = await synthesizeEdge({ text, voice, rate, pitch })
          res.writeHead(200, {
            'content-type': 'audio/mpeg',
            'content-length': audio.length,
            'cache-control': 'no-store',
          })
          res.end(audio)
        } catch (error) {
          json(res, 502, { error: 'tts-failed', detail: String((error as Error).message ?? error) })
        }
      },
    },
  ]
}
