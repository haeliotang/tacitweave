// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { createAppLockRecord, isAppLockRecord, lockoutRemainingMs, registerFailedAttempt, verifyAppLock, type LockoutState } from './app-lock'

describe('app lock', () => {
  it('derives a salted verifier and verifies the pin', async () => {
    const record = await createAppLockRecord('2468')
    expect(isAppLockRecord(record)).toBe(true)
    expect(record.hash).not.toContain('2468')
    expect(await verifyAppLock('2468', record)).toBe(true)
    expect(await verifyAppLock('1357', record)).toBe(false)
  })

  it('rejects short pins and malformed records', async () => {
    await expect(createAppLockRecord('12')).rejects.toThrow()
    expect(isAppLockRecord({ version: 'app-lock-v1' })).toBe(false)
  })

  it('blocks after five failures for thirty seconds', () => {
    let state: LockoutState = { failed: 0, blockedUntil: 0 }
    for (let attempt = 0; attempt < 4; attempt += 1) state = registerFailedAttempt(state, 1000)
    expect(state).toEqual({ failed: 4, blockedUntil: 0 })
    state = registerFailedAttempt(state, 1000)
    expect(state.failed).toBe(0)
    expect(lockoutRemainingMs(state, 1000)).toBe(30_000)
    expect(lockoutRemainingMs(state, 40_000)).toBe(0)
  })
})
