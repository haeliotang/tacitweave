// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { addRelationshipTrigger, clearRelationshipTriggers, exportRelationshipTriggers, isRelationshipTrigger, loadRelationshipTriggers, removeRelationshipTrigger, type RelationshipStorageLike } from './relationship'

function memoryStorage(): RelationshipStorageLike {
  const values = new Map<string, string>()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) }, removeItem: key => { values.delete(key) } }
}

const base = { role: '一个总在忙的人', situation: '对方很久没有回复', cue: '看到屏幕暗下去', region: 'chest' as const, sensation: 'tightness' as const, intensity: 4 as const, breath: 'shallow' as const, response: 'freeze' as const }

describe('relationship trigger journal', () => {
  it('stores only user-authored trigger records locally', () => {
    const storage = memoryStorage()
    const entries = addRelationshipTrigger(storage, { ...base, now: '2026-11-01T00:00:00Z' })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ version: 'relationship-trigger-v1', ...base })
    expect(loadRelationshipTriggers(storage)).toEqual(entries)
    expect(isRelationshipTrigger(entries[0])).toBe(true)
  })

  it('trims long fields and rejects empty triggers', () => {
    const storage = memoryStorage()
    const entries = addRelationshipTrigger(storage, { ...base, situation: 'x'.repeat(200), cue: '' })
    expect(entries[0].situation).toHaveLength(100)
    expect(() => addRelationshipTrigger(storage, { ...base, situation: ' ', cue: '' })).toThrow()
  })

  it('ignores corrupt storage and supports delete/clear', () => {
    const storage = memoryStorage()
    storage.setItem('tacitweave.relationship-triggers.v1', '{bad')
    expect(loadRelationshipTriggers(storage)).toEqual([])
    const entries = addRelationshipTrigger(storage, base)
    expect(removeRelationshipTrigger(storage, entries[0].id)).toEqual([])
    addRelationshipTrigger(storage, base)
    expect(clearRelationshipTriggers(storage)).toEqual([])
  })

  it('exports user-authored records without analysis fields', () => {
    const exported = JSON.parse(exportRelationshipTriggers(addRelationshipTrigger(memoryStorage(), base)))
    expect(exported).toMatchObject({ version: 'relationship-export-v1' })
    expect(exported.entries[0]).toMatchObject(base)
    expect(JSON.stringify(exported)).not.toMatch(/attachment|diagnos|score|matching/i)
  })
})

it('describes counts of user-chosen fields without inferring causes', async () => {
  const { summarizeRelationshipTriggers } = await import('./relationship')
  const entries = [
    { ...addRelationshipTrigger(memoryStorage(), base)[0] },
    { ...addRelationshipTrigger(memoryStorage(), { ...base, region: 'chest', response: 'flee' })[0] },
    { ...addRelationshipTrigger(memoryStorage(), { ...base, region: 'stomach', response: 'freeze' })[0] },
  ]
  const summary = summarizeRelationshipTriggers(entries)
  expect(summary.total).toBe(3)
  expect(summary.regions[0]).toMatchObject({ value: 'chest', count: 2 })
  expect(summary.responses.find(item => item.value === 'freeze')?.count).toBe(2)
  expect(JSON.stringify(summary)).not.toMatch(/because|cause|attachment|score|diagnos/i)
})
