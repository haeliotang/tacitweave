// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { decryptBackup, encryptBackup, isSecureBackup } from './secure-backup'
import type { LocalDataset } from './local-dataset'

const dataset: LocalDataset = {
  version: 'local-dataset-v2',
  exportedAt: '2026-11-04T00:00:00.000Z',
  motifs: [],
  relationships: [],
  field: { version: 'field-layout-v1', positions: { 'motif:a': { x: 0.5, y: 0.5 } }, links: [] },
  signals: [],
}

describe('encrypted backup', () => {
  it('round-trips a dataset with a passphrase', async () => {
    const backup = await encryptBackup(dataset, 'correct horse battery')
    expect(isSecureBackup(backup)).toBe(true)
    expect(backup.ciphertext).not.toContain('motif')
    await expect(decryptBackup(backup, 'correct horse battery')).resolves.toEqual(dataset)
  })

  it('rejects short passphrases, wrong passphrases and malformed payloads', async () => {
    await expect(encryptBackup(dataset, 'short')).rejects.toThrow()
    const backup = await encryptBackup(dataset, 'correct horse battery')
    await expect(decryptBackup(backup, 'wrong passphrase')).rejects.toThrow()
    expect(isSecureBackup({ format: 'nope' })).toBe(false)
  })
})
