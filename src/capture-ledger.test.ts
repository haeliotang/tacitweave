// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { addCaptureProvenance, captureStorageKey, clearCaptureProvenance, loadCaptureProvenance, removeCaptureProvenance, saveCaptureProvenance } from './capture-ledger'
import type { CaptureProvenance } from './capture'

const capture = (id: string, createdAt: string): CaptureProvenance => ({
  version: 'capture-v1',
  captureId: id,
  rendererKind: 'captured',
  mimeType: 'video/mp4',
  durationSec: 75,
  sha256: 'a'.repeat(64),
  synthId: false,
  createdAt,
})

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('capture provenance ledger', () => {
  it('round-trips only validated provenance', () => {
    const storage = memoryStorage()
    saveCaptureProvenance(storage, [capture('a', '2026-11-01T00:00:00Z')])
    expect(loadCaptureProvenance(storage)[0].captureId).toBe('a')
    storage.setItem(captureStorageKey, JSON.stringify([{ nope: true }]))
    expect(loadCaptureProvenance(storage)).toEqual([])
    clearCaptureProvenance(storage)
    expect(storage.getItem(captureStorageKey)).toBeNull()
  })

  it('deduplicates and keeps newest provenance', () => {
    const next = addCaptureProvenance([capture('a', '2026-11-01T00:00:00Z')], capture('a', '2026-11-02T00:00:00Z'))
    expect(next).toHaveLength(1)
    expect(next[0].createdAt).toBe('2026-11-02T00:00:00Z')
    expect(removeCaptureProvenance(next, 'a')).toEqual([])
  })
})
