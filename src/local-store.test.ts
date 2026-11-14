// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { normalizeSnapshot, reconcileEncryptedPayload, reconcileSnapshots, snapshotHasData } from './local-store'
import type { LocalSnapshot } from './local-dataset'

const empty = (): LocalSnapshot => ({ motifs: [], relationships: [], field: { version: 'field-layout-v1', positions: {}, links: [] }, signals: [], captures: [] })
const withMotif = (): LocalSnapshot => ({
  ...empty(),
  motifs: [{ version: 'motif-v1', id: 'm', createdAt: '2026-11-01T00:00:00Z', name: 'x', capture: { region: 'chest', sensation: 'pressure', intensity: 2, breath: 'even', fragments: ['wet-corridor'] } }],
})

describe('desktop/web snapshot reconciliation', () => {
  it('treats an empty SQLite store as needing one-way migration from the web fallback', () => {
    expect(snapshotHasData(empty())).toBe(false)
    expect(reconcileSnapshots(empty(), withMotif())).toMatchObject({ source: 'fallback', action: 'migrate' })
  })

  it('treats a populated SQLite store as canonical and mirrors it over stale web data', () => {
    expect(reconcileSnapshots(withMotif(), empty())).toMatchObject({ source: 'host', action: 'mirror' })
  })

  it('does not invent data when both stores are empty', () => {
    expect(reconcileSnapshots(empty(), empty())).toMatchObject({ source: 'host', action: 'none' })
  })
})


describe('snapshot normalization', () => {
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

  it('preserves validated captures and symbolic sessions and rejects malformed ones', () => {
    const symbolic = { version: 'symbolic-session-v1' as const, id: 's1', createdAt: '2026-11-01T00:00:00Z', encounterId: 'e1', format: 'encounter' as const, durationSec: 75, completed: false, leftEarly: true, agency: [{ atSec: 12, action: 'leave' as const }] }
    expect(normalizeSnapshot({ motifs: [], relationships: [], symbolicSessions: [symbolic] }).symbolicSessions).toEqual([symbolic])
    expect(() => normalizeSnapshot({ motifs: [], relationships: [], symbolicSessions: [{ nope: true }] })).toThrow()
    expect(normalizeSnapshot({ motifs: [], relationships: [], captures: [capture] }).captures).toEqual([capture])
    expect(() => normalizeSnapshot({ motifs: [], relationships: [], captures: [{ nope: true }] })).toThrow()
    expect(snapshotHasData({ ...empty(), captures: [capture] })).toBe(true)
  })
})


describe('encrypted payload reconciliation', () => {
  it('treats SQLite as canonical and migrates a web-only payload once', () => {
    expect(reconcileEncryptedPayload('sqlite', 'web')).toEqual({ raw: 'sqlite', action: 'mirror-host' })
    expect(reconcileEncryptedPayload(null, 'web')).toEqual({ raw: 'web', action: 'migrate-web' })
    expect(reconcileEncryptedPayload(null, null)).toEqual({ raw: null, action: 'none' })
  })
})

describe('encrypted experience spaces', () => {
  it('includes spaces in the encrypted payload and removes plaintext copies', async () => {
    const { createExperienceSpace, placeObject } = await import('./experience-space')
    const { createAppLockRecord } = await import('./app-lock')
    const { deriveDataKey } = await import('./encrypted-store')
    const { enableLocalEncryption, unlockLocalSnapshot } = await import('./local-store')
    const space = placeObject(createExperienceSpace('blank'), 'door')
    const snapshot = { ...empty(), spaces: [space] }
    const values = new Map<string, string>()
    ;(globalThis as { window?: unknown }).window = { localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } } }
    const record = await createAppLockRecord('2468')
    await enableLocalEncryption(snapshot, '2468', record)
    expect(values.get('tacitweave.experience-spaces.v2')).toBeUndefined()
    const unlocked = await unlockLocalSnapshot('2468', record)
    expect(unlocked?.spaces?.[0].objects[0].kind).toBe('door')
    expect(deriveDataKey).toBeTypeOf('function')
  })
})
