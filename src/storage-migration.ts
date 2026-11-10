// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * One-time migration from the former Familiweave localStorage namespace.
 * Keep these legacy strings here only; the rest of the app uses Tacitweave keys.
 */
export const legacyStoragePrefix = 'familiweave.'
export const storageMigrationMarker = 'tacitweave.storage-migration.v1'

const suffixes = [
  'motifs.v1',
  'relationship-triggers.v1',
  'field-layout.v1',
  'signal-sessions.v1',
  'captures.v1',
  'symbolic-sessions.v1',
  'app-lock.v1',
  'app-lock-lockout.v1',
  'autolock-ms',
  'theme',
  'lang',
  'encrypted-state.v1',
]

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Copy legacy values only into missing Tacitweave keys; never overwrite newer data. */
export function migrateLegacyLocalStorage(storage: StorageLike): void {
  if (storage.getItem(storageMigrationMarker) === '1') return
  for (const suffix of suffixes) {
    const legacyKey = `${legacyStoragePrefix}${suffix}`
    const currentKey = `tacitweave.${suffix}`
    if (storage.getItem(currentKey) !== null) continue
    const value = storage.getItem(legacyKey)
    if (value !== null) {
      try {
        storage.setItem(currentKey, value)
      } catch {
        continue
      }
    }
    // The legacy copy is safe to remove once the new key exists.
    if (storage.getItem(currentKey) !== null) storage.removeItem(legacyKey)
  }
  storage.setItem(storageMigrationMarker, '1')
}

/** Remove any remaining legacy keys, including ones added after migration ran. */
export function removeLegacyLocalStorage(storage: StorageLike): void {
  for (const suffix of suffixes) storage.removeItem(`${legacyStoragePrefix}${suffix}`)
}
