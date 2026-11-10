// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
export interface AppLockRecord {
  version: 'app-lock-v1'
  salt: string
  hash: string
  iterations: number
}

export const appLockStorageKey = 'tacitweave.app-lock.v1'
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

async function derive(pin: string, salt: Uint8Array, rounds: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: rounds, hash: 'SHA-256' }, key, 256)
  return new Uint8Array(bits)
}

export function isAppLockRecord(value: unknown): value is AppLockRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<AppLockRecord>
  return record.version === 'app-lock-v1'
    && typeof record.salt === 'string' && record.salt.length > 0
    && typeof record.hash === 'string' && record.hash.length > 0
    && typeof record.iterations === 'number' && Number.isInteger(record.iterations) && record.iterations >= 10_000
}

export async function createAppLockRecord(pin: string, now = new Date().toISOString()): Promise<AppLockRecord> {
  void now
  if (pin.trim().length < 4) throw new Error('app_lock_pin_too_short')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt, iterations)
  return { version: 'app-lock-v1', salt: bytesToBase64(salt), hash: bytesToBase64(hash), iterations }
}

export async function verifyAppLock(pin: string, record: AppLockRecord): Promise<boolean> {
  if (!isAppLockRecord(record)) return false
  const salt = base64ToBytes(record.salt)
  const actual = await derive(pin, salt, record.iterations)
  const expected = base64ToBytes(record.hash)
  if (actual.length !== expected.length) return false
  let difference = 0
  for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index]
  return difference === 0
}

export function loadAppLockRecord(storage: Pick<Storage, 'getItem'>): AppLockRecord | null {
  try {
    const raw = storage.getItem(appLockStorageKey)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isAppLockRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveAppLockRecord(storage: Pick<Storage, 'setItem'>, record: AppLockRecord) {
  storage.setItem(appLockStorageKey, JSON.stringify(record))
}

export interface LockoutState {
  failed: number
  blockedUntil: number
}

export const lockoutStorageKey = 'tacitweave.app-lock-lockout.v1'
export const maxLockoutAttempts = 5
export const lockoutDurationMs = 30_000

export function isLockoutState(value: unknown): value is LockoutState {
  if (!value || typeof value !== 'object') return false
  const state = value as Partial<LockoutState>
  return typeof state.failed === 'number' && Number.isInteger(state.failed) && state.failed >= 0
    && typeof state.blockedUntil === 'number' && Number.isFinite(state.blockedUntil) && state.blockedUntil >= 0
}

export function lockoutRemainingMs(state: LockoutState, now = Date.now()) {
  return Math.max(0, state.blockedUntil - now)
}

export function registerFailedAttempt(state: LockoutState, now = Date.now()): LockoutState {
  const failed = state.failed + 1
  if (failed >= maxLockoutAttempts) return { failed: 0, blockedUntil: now + lockoutDurationMs }
  return { failed, blockedUntil: 0 }
}

export function loadLockout(storage: Pick<Storage, 'getItem'>): LockoutState {
  try {
    const raw = storage.getItem(lockoutStorageKey)
    if (!raw) return { failed: 0, blockedUntil: 0 }
    const parsed: unknown = JSON.parse(raw)
    return isLockoutState(parsed) ? parsed : { failed: 0, blockedUntil: 0 }
  } catch {
    return { failed: 0, blockedUntil: 0 }
  }
}

export function saveLockout(storage: Pick<Storage, 'setItem'>, state: LockoutState) {
  storage.setItem(lockoutStorageKey, JSON.stringify(state))
}
