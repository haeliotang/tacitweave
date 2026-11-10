// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { researchCaptureSessionSchema } from './research-capture'

const base = {
  version: 'research-capture-v1' as const,
  participantCode: 'P01',
  sessionId: 's1',
  collectedAt: '2026-11-07T00:00:00.000Z',
  device: {
    manufacturer: 'OpenBCI', model: 'Cyton', firmware: '3.0.0', sdkVersion: '1.0.0',
    devicePseudonym: { value: 'a'.repeat(64), scheme: 'hmac-sha256' as const, keyVersion: 'v1' },
    channels: [{ name: 'ch1', physicalKind: 'ecg' as const, sampleRateHz: 250, unit: 'mV' }],
  },
  clock: { source: 'device' as const, deviceEpochMs: 0, hostEpochMs: 0, offsetMs: 0 },
  consent: { scope: 'features_only' as const, version: 'consent-v1', grantedAt: '2026-11-06T00:00:00.000Z' },
  capture: {
    rawFormat: 'none' as const, sampleCount: 10, featureVersion: 'features-v1',
    features: [{ name: 'heartRateBpm', value: 60, derivedFrom: ['ch1'], quality: 'good' as const }],
    quality: { maxGapMs: 1000, gapsOverOneSecond: 0, droppedSamples: 0, reconnects: 0 },
  },
  retention: { until: '2027-11-07T00:00:00.000Z', access: 'local_encrypted' as const, policy: 'delete on withdrawal' },
  deletion: { status: 'not_requested' as const },
}

describe('research capture schema', () => {
  it('accepts features-only capture with physical channels and derived features', () => {
    expect(researchCaptureSessionSchema.safeParse(base).success).toBe(true)
  })

  it('requires raw provenance when raw_signal consent is granted', () => {
    expect(researchCaptureSessionSchema.safeParse({ ...base, consent: { ...base.consent, scope: 'raw_signal' } }).success).toBe(false)
    const raw = { ...base, consent: { ...base.consent, scope: 'raw_signal' as const }, capture: { ...base.capture, rawFormat: 'jsonl' as const, rawSha256: 'b'.repeat(64), rawBytes: 100 } }
    expect(researchCaptureSessionSchema.safeParse(raw).success).toBe(true)
  })

  it('rejects raw bytes under features-only consent and missing device firmware', () => {
    expect(researchCaptureSessionSchema.safeParse({ ...base, capture: { ...base.capture, rawFormat: 'jsonl' as const } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, capture: { ...base.capture, rawSha256: 'b'.repeat(64) } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, capture: { ...base.capture, rawBytes: 100 } }).success).toBe(false)
    const { firmware: _firmware, ...device } = base.device
    expect(researchCaptureSessionSchema.safeParse({ ...base, device }).success).toBe(false)
  })

  it('rejects unknown derived channels and impossible lifecycle dates', () => {
    expect(researchCaptureSessionSchema.safeParse({ ...base, capture: { ...base.capture, features: [{ ...base.capture.features[0], derivedFrom: ['missing'] }] } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, consent: { ...base.consent, grantedAt: '2026-11-08T00:00:00.000Z' } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, consent: { ...base.consent, withdrawalAt: '2026-11-08T00:00:00.000Z' } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, consent: { ...base.consent, withdrawalAt: '2026-11-06T12:00:00.000Z' } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, deletion: { status: 'completed' as const, requestedAt: '2026-11-08T00:00:00.000Z', completedAt: '2026-11-07T00:00:00.000Z', method: 'x' } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, deletion: { status: 'completed' as const, completedAt: '2026-11-09T00:00:00.000Z', method: 'x' } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, deletion: { status: 'not_requested' as const, requestedAt: '2026-11-08T00:00:00.000Z' } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, deletion: { status: 'requested' as const, requestedAt: '2026-11-08T00:00:00.000Z', completedAt: '2026-11-09T00:00:00.000Z' } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, device: { ...base.device, channels: [base.device.channels[0], base.device.channels[0]] } }).success).toBe(false)
    expect(researchCaptureSessionSchema.safeParse({ ...base, device: { ...base.device, devicePseudonym: { ...base.device.devicePseudonym, value: 'short' } } }).success).toBe(false)
  })

  it('accepts a completed deletion with an explicit method and ordering', () => {
    expect(researchCaptureSessionSchema.safeParse({ ...base, deletion: { status: 'completed' as const, requestedAt: '2026-11-08T00:00:00.000Z', completedAt: '2026-11-09T00:00:00.000Z', method: 'encrypted erase' } }).success).toBe(true)
  })
})
