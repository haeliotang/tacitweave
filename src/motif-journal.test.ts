// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { addMotif, clearMotifs, createMotif, exportMotifs, loadMotifs, motifCapacity, motifDisplayName, motifStorageKey, removeMotif, saveMotifs, type StorageLike } from './motif-journal'
import type { SomaticCapture } from './somatic'
import { grantLocalSignalConsent, voiceTraceFromSamples } from './somatic-signal'

function memoryStorage(): StorageLike {
  const values = new Map<string, string>()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value) },
    removeItem: key => { values.delete(key) },
  }
}

const capture: SomaticCapture = { region: 'chest', sensation: 'pressure', intensity: 4, breath: 'held', fragments: ['wet-corridor'] }

describe('local motif journal', () => {
  it('stores user-named entries locally', () => {
    const storage = memoryStorage()
    const entries = addMotif(storage, { name: '胸口的旧门', capture, now: '2026-11-01T00:00:00Z' })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ version: 'motif-v1', name: '胸口的旧门', capture })
    expect(loadMotifs(storage)).toEqual(entries)
    expect(motifDisplayName(entries[0])).toBe('胸口的旧门')
  })

  it('trims names and uses an unnamed fallback', () => {
    const storage = memoryStorage()
    const entries = addMotif(storage, { name: '   ', capture })
    expect(entries[0].name).toBe('')
    expect(motifDisplayName(entries[0])).toBe('未命名')
    expect(addMotif(storage, { name: 'x'.repeat(80), capture })[0].name).toHaveLength(60)
  })

  it('ignores corrupt storage and removes/clears entries', () => {
    const storage = memoryStorage()
    storage.setItem('tacitweave.motifs.v1', 'not-json')
    expect(loadMotifs(storage)).toEqual([])
    const entries = addMotif(storage, { name: '可删除', capture })
    expect(removeMotif(storage, entries[0].id)).toEqual([])
    addMotif(storage, { name: 'a', capture })
    expect(clearMotifs(storage)).toEqual([])
    expect(loadMotifs(storage)).toEqual([])
  })

  it('keeps optional local signal summaries with consent', () => {
    const storage = memoryStorage()
    const signals = { consent: grantLocalSignalConsent('2026-11-01T00:00:00Z'), voice: voiceTraceFromSamples([0.1, 0.2, 0.05], 8, 10) }
    const entries = addMotif(storage, { name: '带声音', capture, signals })
    expect(entries[0].signals?.voice?.version).toBe('voice-v1')
    expect(loadMotifs(storage)[0].signals?.consent.localOnly).toBe(true)
  })

  it('keeps optional derived symbolic parameters with the motif', () => {
    const storage = memoryStorage()
    const entries = addMotif(storage, { name: '符号', capture, symbolic: { format: 'encounter', motifs: ['door', 'corridor'], figure: 'shadow' } })
    expect(entries[0].symbolic).toEqual({ format: 'encounter', motifs: ['door', 'corridor'], figure: 'shadow' })
    expect(loadMotifs(storage)[0].symbolic?.figure).toBe('shadow')
    expect(JSON.stringify(entries)).not.toMatch(/diagnos|interpretation|score/i)
  })

  it('exposes and enforces an explicit retention ceiling', () => {
    const storage = memoryStorage()
    const entries = Array.from({ length: motifCapacity + 1 }, (_, index) => createMotif({ name: `motif-${index}`, capture, now: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString() }))
    saveMotifs(storage, entries)
    expect(JSON.parse(storage.getItem(motifStorageKey) ?? '[]')).toHaveLength(motifCapacity)
    expect(motifCapacity).toBe(1000)
  })

  it('exports a portable local JSON record without interpretation', () => {
    const entries = addMotif(memoryStorage(), { name: '雨', capture, now: '2026-11-01T00:00:00Z' })
    const exported = JSON.parse(exportMotifs(entries))
    expect(exported).toMatchObject({ version: 'motif-export-v1', entries: [{ name: '雨' }] })
    expect(JSON.stringify(exported)).not.toMatch(/diagnos|interpretation|score/i)
  })
})
