// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import type { ResearchCaptureSession } from './research-capture'
import { SyntheticResearchStore } from './research-lifecycle'

const session: ResearchCaptureSession = {
  version: 'research-capture-v1',
  participantCode: 'P01',
  sessionId: 's1',
  collectedAt: '2026-11-13T00:00:00.000Z',
  device: {
    manufacturer: 'OpenBCI', model: 'Cyton', firmware: '3.0.0', sdkVersion: '1.0.0',
    devicePseudonym: { value: 'a'.repeat(64), scheme: 'hmac-sha256', keyVersion: 'v1' },
    channels: [{ name: 'ch1', physicalKind: 'ecg', sampleRateHz: 250, unit: 'mV' }],
  },
  clock: { source: 'device', deviceEpochMs: 0, hostEpochMs: 0, offsetMs: 0 },
  consent: { scope: 'features_only', version: 'consent-v1', grantedAt: '2026-11-12T00:00:00.000Z' },
  capture: {
    rawFormat: 'none', sampleCount: 10, featureVersion: 'features-v1',
    features: [{ name: 'heartRateBpm', value: 60, derivedFrom: ['ch1'], quality: 'good' }],
    quality: { maxGapMs: 1000, gapsOverOneSecond: 0, droppedSamples: 0, reconnects: 0 },
  },
  retention: { until: '2027-11-13T00:00:00.000Z', access: 'local_encrypted', policy: 'delete on withdrawal' },
  deletion: { status: 'not_requested' },
}

describe('synthetic research lifecycle', () => {
  it('stores encrypted references and returns the session only while the key exists', () => {
    const store = new SyntheticResearchStore()
    const result = store.collect(session, { keyId: 'k1', ciphertext: 'opaque-ciphertext', backupCopies: ['backup-a'] })
    expect(result.ok).toBe(true)
    expect(store.read('s1')).toEqual(session)
    const snapshot = store.snapshot()
    expect(JSON.stringify(snapshot)).not.toContain('heartRateBpm')
    expect(snapshot.records[0].ciphertext).toBe('opaque-ciphertext')
  })

  it('stops collection and deletes keys/records on withdrawal, leaving an auditable tombstone', () => {
    const store = new SyntheticResearchStore()
    store.collect(session, { keyId: 'k1', ciphertext: 'opaque-ciphertext', backupCopies: ['backup-a'] })
    const result = store.withdraw('P01', '2026-11-14T00:00:00.000Z')
    expect(result).toMatchObject({ deletedSessions: 1, deletedKeys: 1, status: 'deletion_requested' })
    expect(store.read('s1')).toBeNull()
    expect(store.collect({ ...session, sessionId: 's2' }, { keyId: 'k2', ciphertext: 'x' }).reason).toBe('withdrawn_participant')
    expect(store.snapshot().records).toEqual([])
    expect(store.snapshot().tombstones[0]).toMatchObject({ status: 'deletion_requested', reason: 'withdrawn' })
  })

  it('does not claim deletion while a backup copy remains, then completes after copy removal', () => {
    const store = new SyntheticResearchStore()
    store.collect(session, { keyId: 'k1', ciphertext: 'opaque-ciphertext', backupCopies: ['backup-a'] })
    store.withdraw('P01')
    expect(store.snapshot().tombstones[0].status).toBe('deletion_requested')
    expect(store.deleteBackupCopy('s1', 'backup-a')).toBe(true)
    expect(store.snapshot().tombstones[0].status).toBe('deleted')
  })

  it('has no accessible residue after snapshot/restart', () => {
    const first = new SyntheticResearchStore()
    first.collect(session, { keyId: 'k1', ciphertext: 'opaque-ciphertext' })
    first.withdraw('P01')
    const second = first.restart(first.snapshot())
    expect(second.read('s1')).toBeNull()
    expect(second.snapshot().records).toEqual([])
  })

  it('deletes expired retention records and rejects collection past retention', () => {
    const store = new SyntheticResearchStore()
    store.collect(session, { keyId: 'k1', ciphertext: 'opaque-ciphertext' })
    expect(store.deleteExpired('2028-11-14T00:00:00.000Z')).toBe(1)
    expect(store.read('s1')).toBeNull()
    expect(store.snapshot().tombstones[0].reason).toBe('expired')
    expect(store.collect(session, { keyId: 'k2', ciphertext: 'x', now: '2028-11-14T00:00:00.000Z' })).toEqual({ ok: false, reason: 'expired_retention' })
  })
})
