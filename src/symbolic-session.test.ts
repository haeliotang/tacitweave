// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { createSymbolicSession, isSymbolicSession, loadSymbolicSessions, removeSymbolicSession, saveSymbolicSessions } from './symbolic-session'
import type { Encounter } from './encounter'

const encounter: Encounter = {
  id: 'encounter-1',
  seed: 1,
  durationSec: 75,
  createdAt: '2026-11-01T00:00:00Z',
  rendererKind: 'symbolic',
  innerPlan: { version: 'inner-v1', format: 'encounter', durationSec: 75, motifs: ['door'], figure: 'none', beats: [], prompts: { space: '', figure: '', sound: '', light: '', camera: '', negative: [] }, safety: { notDiagnosis: true, noInterpretation: true, userOwnsMeaning: true, exitAlwaysAvailable: true, noMemoriesClaimed: true } },
  agency: [{ atSec: 10, action: 'approach' }, { atSec: 30, action: 'leave' }],
}

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('symbolic sessions', () => {
  it('summarizes agency events without treating them as a score', () => {
    const session = createSymbolicSession(encounter, '2026-11-01T00:01:00Z', 'session-1')
    expect(session).toMatchObject({ version: 'symbolic-session-v1', encounterId: 'encounter-1', format: 'encounter', leftEarly: true, completed: false })
    expect(session.agency).toEqual(encounter.agency)
    expect(isSymbolicSession(session)).toBe(true)
    expect(JSON.stringify(session)).not.toMatch(/score|diagnos|interpretation/i)
  })

  it('preserves the optional source motif on a session', () => {
    const session = createSymbolicSession({ ...encounter, motifId: 'motif-1' }, '2026-11-01T00:01:00Z', 'session-m')
    expect(session.motifId).toBe('motif-1')
    expect(isSymbolicSession(session)).toBe(true)
  })

  it('records an explicit extension without rewriting the original plan', () => {
    const extended = { ...encounter, durationSec: 105, agency: [...(encounter.agency ?? []), { atSec: 75, action: 'extend' as const, durationSec: 105 }] }
    const session = createSymbolicSession(extended, '2026-11-01T00:02:00Z', 'session-2')
    expect(session.durationSec).toBe(105)
    expect(session.agency).toContainEqual({ atSec: 75, action: 'extend', durationSec: 105 })
    expect(isSymbolicSession(session)).toBe(true)
  })

  it('accepts an open-ended session format', () => {
    const open = { ...encounter, innerPlan: { ...encounter.innerPlan!, format: 'open' as const } }
    const session = createSymbolicSession(open, '2026-11-01T00:03:00Z', 'session-open')
    expect(session.format).toBe('open')
    expect(session.openEnded).toBe(true)
    expect(isSymbolicSession(session)).toBe(true)
  })

  it('validates an in-space figure change event', () => {
    const session = createSymbolicSession({ ...encounter, agency: [{ atSec: 10, action: 'change', change: { field: 'figure', value: 'animal' } }] }, '2026-11-01T00:04:00Z', 'session-change')
    expect(isSymbolicSession(session)).toBe(true)
    expect(session.agency[0].change).toEqual({ field: 'figure', value: 'animal' })
    expect(isSymbolicSession({ ...session, agency: [{ atSec: 1, action: 'change', change: { field: 'figure', value: '' } }] })).toBe(false)
    expect(isSymbolicSession({ ...session, agency: [{ atSec: 2, action: 'change', change: { field: 'motif', value: 'water' } }] })).toBe(true)
  })

  it('persists, validates and explicitly removes sessions', () => {
    const storage = memoryStorage()
    const session = createSymbolicSession(encounter, '2026-11-01T00:01:00Z', 'session-1')
    saveSymbolicSessions(storage, [session])
    expect(loadSymbolicSessions(storage)).toEqual([session])
    expect(removeSymbolicSession([session], 'session-1')).toEqual([])
    storage.setItem('tacitweave.symbolic-sessions.v1', JSON.stringify([{ nope: true }]))
    expect(loadSymbolicSessions(storage)).toEqual([])
  })
})
