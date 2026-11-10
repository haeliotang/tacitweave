// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { grantLocalSignalConsent, isSignalConsent, isVoiceTrace, voiceTraceFromSamples } from './somatic-signal'

describe('local signal trace', () => {
  it('summarises voice amplitude without storing raw audio', () => {
    const trace = voiceTraceFromSamples([0.1, 0.2, 0.05, 0.3, 0.02], 8, 12.5)
    expect(trace).toMatchObject({ version: 'voice-v1', durationSec: 8, sampleCount: 5, sampleRate: 12.5 })
    expect(trace.rmsMean).toBeGreaterThan(0)
    expect(trace.pauseRatio).toBeGreaterThan(0)
    expect(isVoiceTrace(trace)).toBe(true)
    expect(JSON.stringify(trace)).not.toContain('audio')
  })

  it('records explicit local-only consent', () => {
    const consent = grantLocalSignalConsent('2026-11-01T00:00:00Z')
    expect(consent).toMatchObject({ version: 'signal-consent-v1', localOnly: true, purpose: 'local_research' })
    expect(isSignalConsent(consent)).toBe(true)
    expect(isSignalConsent({ ...consent, localOnly: false })).toBe(false)
  })

  it('rejects empty or negative samples', () => {
    expect(() => voiceTraceFromSamples([], 8, 10)).toThrow()
    const trace = voiceTraceFromSamples([-1, 0.2], 8, 10)
    expect(trace.sampleCount).toBe(1)
  })
})
