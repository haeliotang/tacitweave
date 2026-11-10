// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { migrateLegacyLocalStorage, storageMigrationMarker } from './storage-migration'

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
    dump: () => Object.fromEntries(values),
  }
}

describe('legacy localStorage migration', () => {
  it('copies missing values from Familiweave to Tacitweave keys', () => {
    const storage = memoryStorage({ 'familiweave.theme': 'dark', 'familiweave.lang': 'en' })
    migrateLegacyLocalStorage(storage)
    expect(storage.dump()).toMatchObject({ 'tacitweave.theme': 'dark', 'tacitweave.lang': 'en', [storageMigrationMarker]: '1' })
    expect(storage.getItem('familiweave.theme')).toBeNull()
    expect(storage.getItem('familiweave.lang')).toBeNull()
  })

  it('never overwrites newer Tacitweave values and runs once', () => {
    const storage = memoryStorage({ 'familiweave.theme': 'dark', 'tacitweave.theme': 'light' })
    migrateLegacyLocalStorage(storage)
    expect(storage.getItem('tacitweave.theme')).toBe('light')
    storage.setItem('familiweave.lang', 'en')
    migrateLegacyLocalStorage(storage)
    expect(storage.getItem('tacitweave.lang')).toBeNull()
  })
})
