// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { adjustObject, createExperienceSpace, isExperienceSpace, loadExperienceSpaces, moveObject, placeObject, removeObject, saveExperienceSpaces, setObjectVisibility, setViewpoint, undoLastAction } from './experience-space'

function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('experience space v2', () => {
  it('creates a blank space without asking for labels', () => {
    const space = createExperienceSpace('blank', undefined, undefined, '2026-11-14T00:00:00Z')
    expect(space.objects).toEqual([])
    expect(space.actions).toEqual([])
    expect(isExperienceSpace(space)).toBe(true)
  })

  it('places, moves, adjusts, hides and removes objects with explicit actions', () => {
    let space = createExperienceSpace('blank', undefined, undefined, '2026-11-14T00:00:00Z')
    space = placeObject(space, 'door', 0.3, 0.4, '2026-11-14T00:01:00Z')
    const id = space.objects[0].id
    space = moveObject(space, id, 0.7, 0.8)
    space = adjustObject(space, id, { depth: 0.2, scale: 1.4, opacity: 0.6 })
    space = setObjectVisibility(space, id, false)
    expect(space.objects[0]).toMatchObject({ x: 0.7, y: 0.8, depth: 0.2, scale: 1.4, opacity: 0.6, visible: false })
    expect(space.actions.map(action => action.type)).toEqual(['place', 'move', 'adjust', 'visibility'])
    space = removeObject(space, id)
    expect(space.objects).toEqual([])
  })

  it('undoes the latest action and can restore a removed object', () => {
    let space = createExperienceSpace('imagery', undefined, 'water')
    const id = space.objects[0].id
    space = moveObject(space, id, 0.8, 0.8)
    space = removeObject(space, id)
    expect(space.objects).toEqual([])
    space = undoLastAction(space)
    expect(space.objects[0]).toMatchObject({ id, x: 0.8, y: 0.8 })
    space = undoLastAction(space)
    expect(space.objects[0]).toMatchObject({ x: 0.5, y: 0.5 })
  })

  it('persists validated spaces and rejects malformed records', () => {
    const store = storage()
    const space = createExperienceSpace('body', { x: 0.4, y: 0.3 })
    saveExperienceSpaces(store, [space])
    expect(loadExperienceSpaces(store)).toEqual([space])
    store.setItem('tacitweave.experience-spaces.v2', JSON.stringify([{ version: 'experience-space-v2', objects: 'bad' }]))
    expect(loadExperienceSpaces(store)).toEqual([])
  })

  it('stores viewpoint distance as an explicit action', () => {
    const space = setViewpoint(createExperienceSpace('blank'), 0.8)
    expect(space.viewpoint.distance).toBe(0.8)
    expect(space.actions.at(-1)?.type).toBe('viewpoint')
  })
})
