// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
export interface SignalConsent {
  version: 'signal-consent-v1'
  localOnly: true
  purpose: 'local_research'
  grantedAt: string
}

export interface VoiceTrace {
  version: 'voice-v1'
  durationSec: number
  sampleCount: number
  rmsMean: number
  rmsP95: number
  pauseRatio: number
  sampleRate: number
}

export interface MotifSignals {
  consent: SignalConsent
  voice?: VoiceTrace
}

export function grantLocalSignalConsent(now = new Date().toISOString()): SignalConsent {
  return { version: 'signal-consent-v1', localOnly: true, purpose: 'local_research', grantedAt: now }
}

export function voiceTraceFromSamples(rms: number[], durationSec: number, sampleRate: number): VoiceTrace {
  const values = rms.filter(value => Number.isFinite(value) && value >= 0)
  if (!values.length) throw new Error('no_voice_samples')
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const sorted = [...values].sort((a, b) => a - b)
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))]
  const quiet = mean > 0 ? values.filter(value => value < mean * .25).length / values.length : 0
  return {
    version: 'voice-v1',
    durationSec,
    sampleCount: values.length,
    rmsMean: Number(mean.toFixed(4)),
    rmsP95: Number(p95.toFixed(4)),
    pauseRatio: Number(quiet.toFixed(3)),
    sampleRate,
  }
}

export function isSignalConsent(value: unknown): value is SignalConsent {
  if (!value || typeof value !== 'object') return false
  const consent = value as Partial<SignalConsent>
  return consent.version === 'signal-consent-v1' && consent.localOnly === true && consent.purpose === 'local_research' && typeof consent.grantedAt === 'string' && !Number.isNaN(Date.parse(consent.grantedAt))
}

export function isVoiceTrace(value: unknown): value is VoiceTrace {
  if (!value || typeof value !== 'object') return false
  const trace = value as Partial<VoiceTrace>
  return trace.version === 'voice-v1'
    && typeof trace.durationSec === 'number' && trace.durationSec > 0
    && typeof trace.sampleCount === 'number' && trace.sampleCount > 0
    && typeof trace.rmsMean === 'number' && trace.rmsMean >= 0
    && typeof trace.rmsP95 === 'number' && trace.rmsP95 >= 0
    && typeof trace.pauseRatio === 'number' && trace.pauseRatio >= 0 && trace.pauseRatio <= 1
    && typeof trace.sampleRate === 'number' && trace.sampleRate > 0
}
