// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LocalDataset } from './local-dataset'

export interface SecureBackup {
  format: 'tacitweave-encrypted-backup-v1'
  salt: string
  iterations: number
  iv: string
  ciphertext: string
}

export const secureBackupFormat = 'tacitweave-encrypted-backup-v1'
const iterations = 120_000

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${passphrase}\u0000tacitweave-backup-v1`), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export function isSecureBackup(value: unknown): value is SecureBackup {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<SecureBackup>
  return payload.format === secureBackupFormat
    && typeof payload.salt === 'string' && payload.salt.length > 0
    && typeof payload.iterations === 'number' && Number.isInteger(payload.iterations) && payload.iterations >= 10_000
    && typeof payload.iv === 'string' && payload.iv.length > 0
    && typeof payload.ciphertext === 'string' && payload.ciphertext.length > 0
}

export async function encryptBackup(dataset: LocalDataset, passphrase: string): Promise<SecureBackup> {
  if (passphrase.trim().length < 8) throw new Error('backup_passphrase_too_short')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(dataset))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return { format: secureBackupFormat, salt: bytesToBase64(salt), iterations, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)) }
}

export async function decryptBackup(payload: SecureBackup, passphrase: string): Promise<LocalDataset> {
  if (!isSecureBackup(payload)) throw new Error('invalid_secure_backup')
  const key = await deriveKey(passphrase, base64ToBytes(payload.salt))
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) as BufferSource },
    key,
    base64ToBytes(payload.ciphertext) as BufferSource,
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as LocalDataset
}
