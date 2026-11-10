// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it } from 'vitest'
import type { LocalSnapshot } from './local-dataset'
import { createAppLockRecord } from './app-lock'
import { deriveDataKey, encryptLocalSnapshot } from './encrypted-store'
import { recoverEncryptedSnapshot } from './local-store'

const encryptedKey = 'tacitweave.encrypted-state.v1'

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

const snapshot: LocalSnapshot = { motifs: [], relationships: [], field: { version: 'field-layout-v1', positions: {}, links: [] }, signals: [], captures: [], symbolicSessions: [] }

afterEach(() => {
  delete (globalThis as { window?: unknown }).window
})

describe('encrypted recovery after a missing lock record', () => {
  it('recovers a snapshot with the old pin and installs a fresh lock record', async () => {
    const record = await createAppLockRecord('2468')
    const key = await deriveDataKey('2468', record.salt, record.iterations)
    const payload = await encryptLocalSnapshot(snapshot, record, key)
    ;(globalThis as { window?: unknown }).window = { localStorage: storage({ [encryptedKey]: JSON.stringify(payload) }) }

    const recovered = await recoverEncryptedSnapshot('2468')
    expect(recovered.snapshot).toEqual(snapshot)
    expect(recovered.record.version).toBe('app-lock-v1')
    const stored = JSON.parse((globalThis as { window: { localStorage: ReturnType<typeof storage> } }).window.localStorage.getItem(encryptedKey)!)
    expect(stored.version).toBe('encrypted-local-state-v1')
  })

  it('rejects a wrong pin without installing a record', async () => {
    const record = await createAppLockRecord('2468')
    const key = await deriveDataKey('2468', record.salt, record.iterations)
    const payload = await encryptLocalSnapshot(snapshot, record, key)
    ;(globalThis as { window?: unknown }).window = { localStorage: storage({ [encryptedKey]: JSON.stringify(payload) }) }
    await expect(recoverEncryptedSnapshot('0000')).rejects.toThrow()
  })
})
