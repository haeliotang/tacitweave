// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { createAppLockRecord } from './app-lock'
import { decryptLocalSnapshot, deriveDataKey, encryptLocalSnapshot, isEncryptedLocalState } from './encrypted-store'

const capture = {
  version: 'capture-v1' as const,
  captureId: 'capture-1',
  rendererKind: 'captured' as const,
  mimeType: 'video/mp4',
  durationSec: 75,
  sha256: 'a'.repeat(64),
  synthId: false,
  createdAt: '2026-11-01T00:00:00Z',
}
const snapshot = {
  motifs: [],
  relationships: [],
  field: { version: 'field-layout-v1' as const, positions: {}, links: [] },
  signals: [{
    version: 'signal-session-v2' as const,
    id: 'session-1',
    createdAt: '2026-11-01T00:00:16Z',
    startedAt: '2026-11-01T00:00:00Z',
    endedAt: '2026-11-01T00:00:15Z',
    sourceIds: ['bridge'],
    simulated: false,
    summary: { durationSec: 15, sampleCount: 1, byKind: [{ kind: 'heart_rate' as const, count: 1 }], bySource: [{ sourceId: 'bridge', sampleCount: 1, firstMs: 100, lastMs: 100, maxGapMs: null }], quality: { firstSampleMs: 100, lastSampleMs: 100, maxGapMs: null, gapsOverOneSecond: 0, samplesPerSecond: 0.067 } },
  }],
  captures: [capture],
}

describe('encrypted local state', () => {
  it('encrypts and decrypts with the lock pin', async () => {
    const record = await createAppLockRecord('2468')
    const key = await deriveDataKey('2468', record.salt, record.iterations)
    const payload = await encryptLocalSnapshot(snapshot, record, key)
    expect(isEncryptedLocalState(payload)).toBe(true)
    expect(payload.ciphertext).not.toContain('motifs')
    const restored = await decryptLocalSnapshot(payload, '2468')
    expect(restored.snapshot).toEqual(snapshot)
  })

  it('rejects a wrong pin and tampered ciphertext', async () => {
    const record = await createAppLockRecord('2468')
    const key = await deriveDataKey('2468', record.salt, record.iterations)
    const payload = await encryptLocalSnapshot(snapshot, record, key)
    await expect(decryptLocalSnapshot(payload, '0000')).rejects.toThrow()
    const first = payload.ciphertext[0]
    const tampered = `${first === 'A' ? 'B' : 'A'}${payload.ciphertext.slice(1)}`
    await expect(decryptLocalSnapshot({ ...payload, ciphertext: tampered }, '2468')).rejects.toThrow()
  })
})
