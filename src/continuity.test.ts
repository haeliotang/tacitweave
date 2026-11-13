// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { createMotif, type MotifEntry } from './motif-journal'
import { buildContinuityTrails, compareContinuity, createRevisit } from './continuity'

function motif(name: string, capture: Partial<MotifEntry['capture']> = {}, now = '2026-11-14T00:00:00.000Z'): MotifEntry {
  return createMotif({
    name,
    now,
    capture: { region: 'chest', sensation: 'pressure', intensity: 3, breath: 'even', fragments: ['wet-corridor'], certainty: 'clear', ...capture },
  })
}

describe('symbolic continuity', () => {
  it('creates a new immutable revision with a root and increasing visit', () => {
    const root = motif('第一版')
    const second = createRevisit([root], root.id, { name: '第二版', note: '再次进入时更靠近门口', now: '2026-11-14T01:00:00.000Z' })
    expect(second.id).not.toBe(root.id)
    expect(second.continuity).toMatchObject({ rootId: root.id, parentId: root.id, visit: 2, action: 're-enter', note: '再次进入时更靠近门口' })
    const third = createRevisit([second, root], second.id, { now: '2026-11-14T02:00:00.000Z' })
    expect(third.continuity?.visit).toBe(3)
    expect(third.continuity?.parentId).toBe(second.id)
    expect(root.continuity).toBeUndefined()
  })

  it('keeps the source symbolic configuration on a revision', () => {
    const root = createMotif({ name: '旧门', capture: { region: 'chest', sensation: 'pressure', intensity: 3, breath: 'even', fragments: ['wet-corridor'], certainty: 'clear' }, symbolic: { format: 'space', motifs: ['door', 'water'], figure: 'animal' }, now: '2026-11-01T00:00:00Z' })
    const revised = createRevisit([root], root.id, { name: '旧门之后', now: '2026-11-02T00:00:00Z' })
    expect(revised.symbolic).toEqual({ format: 'space', motifs: ['door', 'water'], figure: 'animal' })
    expect(root.symbolic).toEqual({ format: 'space', motifs: ['door', 'water'], figure: 'animal' })
  })

  it('groups full history and exposes the latest visit', () => {
    const root = motif('第一版')
    const second = createRevisit([root], root.id, { now: '2026-11-14T01:00:00.000Z' })
    const trails = buildContinuityTrails([second, root])
    expect(trails).toHaveLength(1)
    expect(trails[0].root.id).toBe(root.id)
    expect(trails[0].visits.map(entry => entry.continuity?.visit ?? 1)).toEqual([1, 2])
    expect(trails[0].latest.id).toBe(second.id)
  })

  it('compares user-authored fields without inferring meaning', () => {
    const before = motif('第一版')
    const after = createRevisit([before], before.id, {
      name: '第一版',
      capture: { ...before.capture, intensity: 4, fragments: ['wet-corridor', 'dusk-stairs'] },
      now: '2026-11-14T01:00:00.000Z',
    })
    const comparison = compareContinuity(before, after)
    expect(comparison.changedCount).toBe(2)
    expect(comparison.changes.find(change => change.field === 'intensity')).toMatchObject({ before: '3', after: '4', changed: true })
    expect(comparison.changes.find(change => change.field === 'fragments')?.changed).toBe(true)
    expect(JSON.stringify(comparison)).not.toMatch(/interpret|diagnos|meaning/i)
  })
})
