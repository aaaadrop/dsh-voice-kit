import { describe, expect, it } from 'vitest'
import { mapPitchToEdge, mapRateToEdge } from './edge-params.ts'

describe('mapRateToEdge', () => {
  it('maps normal rate to +0%', () => {
    expect(mapRateToEdge(1)).toBe('+0%')
  })

  it('maps faster rates to positive percentages', () => {
    expect(mapRateToEdge(1.5)).toBe('+50%')
    expect(mapRateToEdge(2)).toBe('+100%')
  })

  it('maps slower rates to negative percentages', () => {
    expect(mapRateToEdge(0.5)).toBe('-50%')
    expect(mapRateToEdge(0.75)).toBe('-25%')
  })
})

describe('mapPitchToEdge', () => {
  it('maps normal pitch to +0Hz', () => {
    expect(mapPitchToEdge(1)).toBe('+0Hz')
  })

  it('maps higher pitch to positive Hz', () => {
    expect(mapPitchToEdge(1.5)).toBe('+15Hz')
    expect(mapPitchToEdge(2)).toBe('+30Hz')
  })

  it('maps lower pitch to negative Hz', () => {
    expect(mapPitchToEdge(0.5)).toBe('-15Hz')
    expect(mapPitchToEdge(0)).toBe('-30Hz')
  })
})
