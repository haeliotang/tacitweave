// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { AppLockRecord } from './app-lock'
import type { LocalSnapshot } from './local-dataset'

export interface EncryptedLocalState {
  version: 'encrypted-local-state-v1'
  salt: string
  iterations: number
  iv: string
  ciphertext: string
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

export function isEncryptedLocalState(value: unknown): value is EncryptedLocalState {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<EncryptedLocalState>
  return payload.version === 'encrypted-local-state-v1'
    && typeof payload.salt === 'string' && payload.salt.length > 0
    && typeof payload.iterations === 'number' && Number.isInteger(payload.iterations) && payload.iterations >= 10_000
    && typeof payload.iv === 'string' && payload.iv.length > 0
    && typeof payload.ciphertext === 'string' && payload.ciphertext.length > 0
}

export async function deriveDataKey(pin: string, salt: string, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(`${pin}\u0000tacitweave-data-v1`), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: base64ToBytes(salt) as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptLocalSnapshot(snapshot: LocalSnapshot, record: AppLockRecord, key: CryptoKey): Promise<EncryptedLocalState> {
  const encryptionKey = key
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(snapshot))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, encryptionKey, plaintext)
  return {
    version: 'encrypted-local-state-v1',
    salt: record.salt,
    iterations: record.iterations,
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  }
}

export async function decryptLocalSnapshot(payload: EncryptedLocalState, pin: string): Promise<{ snapshot: LocalSnapshot; key: CryptoKey }> {
  if (!isEncryptedLocalState(payload)) throw new Error('invalid_encrypted_state')
  const key = await deriveDataKey(pin, payload.salt, payload.iterations)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(payload.iv) as BufferSource },
    key,
    base64ToBytes(payload.ciphertext) as BufferSource,
  )
  const snapshot = JSON.parse(new TextDecoder().decode(plaintext)) as LocalSnapshot
  return { snapshot, key }
}
