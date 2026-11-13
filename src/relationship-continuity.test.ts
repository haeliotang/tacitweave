// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { createRelationshipTrigger, type RelationshipTrigger } from './relationship'
import { buildRelationshipTrails, compareRelationshipContinuity, createRelationshipRevisit } from './relationship-continuity'

function trigger(now = '2026-11-14T00:00:00.000Z'): RelationshipTrigger {
  return createRelationshipTrigger({ role: '同事', situation: '没有回复', cue: '屏幕暗下去', region: 'chest', sensation: 'tightness', intensity: 3, breath: 'shallow', response: 'freeze', now })
}

describe('relationship continuity', () => {
  it('creates an immutable revisit with root, parent and visit', () => {
    const root = trigger()
    const second = createRelationshipRevisit([root], root.id, { role: '同事', situation: '没有回复', cue: '屏幕暗下去', region: 'chest', sensation: 'pressure', intensity: 4, breath: 'held', response: 'approach', note: '这次没有僵住', now: '2026-11-14T01:00:00.000Z' })
    expect(second.id).not.toBe(root.id)
    expect(second.continuity).toMatchObject({ rootId: root.id, parentId: root.id, visit: 2, action: 're-enter', note: '这次没有僵住' })
    expect(root.continuity).toBeUndefined()
    const third = createRelationshipRevisit([second, root], second.id, { role: '同事', situation: '没有回复', cue: '屏幕暗下去', region: 'chest', sensation: 'pressure', intensity: 5, breath: 'held', response: 'approach', now: '2026-11-14T02:00:00.000Z' })
    expect(third.continuity?.visit).toBe(3)
  })

  it('groups full history and compares only user fields', () => {
    const root = trigger()
    const second = createRelationshipRevisit([root], root.id, { role: '同事', situation: '没有回复', cue: '屏幕暗下去', region: 'chest', sensation: 'pressure', intensity: 4, breath: 'held', response: 'approach', now: '2026-11-14T01:00:00.000Z' })
    const trails = buildRelationshipTrails([second, root])
    expect(trails[0].visits).toHaveLength(2)
    expect(trails[0].latest.id).toBe(second.id)
    const changes = compareRelationshipContinuity(root, second)
    expect(changes.filter(change => change.changed).map(change => change.field).sort()).toEqual(['breath', 'intensity', 'response', 'sensation'])
  })
})
