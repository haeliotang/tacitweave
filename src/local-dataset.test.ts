// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { buildLocalDataset, clearLocalDataset, exportLocalDataset, localDatasetFromSnapshot, parseLocalDataset } from './local-dataset'
import { captureStorageKey } from './capture-ledger'
import { addMotif, motifStorageKey } from './motif-journal'
import { addRelationshipTrigger, relationshipStorageKey } from './relationship'
import type { SomaticCapture } from './somatic'
import { createRevisit } from './continuity'
import { attachFieldNode, fieldNodeKey, setFieldPosition } from './field'
import { createSymbolicSession } from './symbolic-session'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

const capture: SomaticCapture = { region: 'chest', sensation: 'pressure', intensity: 3, breath: 'held', fragments: ['wet-corridor'] }

describe('local dataset import/export', () => {
  it('round-trips a validated local snapshot', () => {
    const storage = memoryStorage()
    addMotif(storage, { name: '旧门', capture })
    addRelationshipTrigger(storage, { situation: '很久没回复', cue: '', region: 'chest', sensation: 'tightness', intensity: 4, breath: 'shallow', response: 'freeze' })
    const snapshot = { motifs: buildLocalDataset(storage).motifs, relationships: buildLocalDataset(storage).relationships }
    const parsed = parseLocalDataset(JSON.stringify(localDatasetFromSnapshot(snapshot, '2026-11-01T00:00:00Z')))
    expect(parsed.motifs[0].name).toBe('旧门')
    expect(parsed.relationships[0].situation).toBe('很久没回复')
  })

  it('round-trips continuity, field links and session source ids', () => {
    const storage = memoryStorage()
    const root = addMotif(storage, { name: '旧门', capture, now: '2026-11-01T00:00:00Z' })[0]
    const revised = createRevisit([root], root.id, { name: '旧门之后', note: '再次进入', now: '2026-11-02T00:00:00Z' })
    const layout = attachFieldNode(setFieldPosition({ version: 'field-layout-v1', positions: {}, links: [] }, fieldNodeKey('motif', root.id), { x: 0.4, y: 0.4 }), fieldNodeKey('motif', root.id), fieldNodeKey('motif', revised.id), '2026-11-02T00:00:00Z')
    const session = createSymbolicSession({ id: 'e1', seed: 1, durationSec: 75, createdAt: '2026-11-02T00:00:00Z', rendererKind: 'symbolic', motifId: revised.id, innerPlan: { version: 'inner-v1', format: 'encounter', durationSec: 75, motifs: ['door'], figure: 'none', beats: [], prompts: { space: '', figure: '', sound: '', light: '', camera: '', negative: [] }, safety: { notDiagnosis: true, noInterpretation: true, userOwnsMeaning: true, exitAlwaysAvailable: true, noMemoriesClaimed: true } }, agency: [{ atSec: 4, action: 'approach' }] }, '2026-11-02T00:01:00Z', 's1')
    const snapshot = parseLocalDataset(JSON.stringify({ version: 'local-dataset-v2', motifs: [revised, root], relationships: [], field: layout, symbolicSessions: [session] }))
    expect(snapshot.motifs[0].continuity).toMatchObject({ rootId: root.id, visit: 2, note: '再次进入' })
    expect(snapshot.field?.links).toHaveLength(1)
    expect(snapshot.symbolicSessions?.[0].motifId).toBe(revised.id)
    expect(JSON.stringify(snapshot)).not.toMatch(/diagnos|score|unconscious/i)
  })

  it('rejects a dataset with the wrong version or malformed records', () => {
    expect(() => parseLocalDataset('{}')).toThrow()
    expect(() => parseLocalDataset(JSON.stringify({ version: 'local-dataset-v1', motifs: [{ nope: true }], relationships: [] }))).toThrow()
    expect(() => parseLocalDataset(JSON.stringify({ version: 'local-dataset-v2', motifs: [], relationships: [], field: { version: 'nope' } }))).toThrow()
  })

  it('imports v1 datasets and round-trips v2 field layouts', () => {
    const v1 = parseLocalDataset(JSON.stringify({ version: 'local-dataset-v1', motifs: [], relationships: [] }))
    expect(v1.field).toBeUndefined()
    const v2 = parseLocalDataset(JSON.stringify({ version: 'local-dataset-v2', motifs: [], relationships: [], field: { version: 'field-layout-v1', positions: { 'motif:a': { x: 0.5, y: 0.5 } }, links: [] } }))
    expect(v2.field?.positions['motif:a']).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('local dataset export', () => {
  it('combines motifs and relationship triggers without a server', () => {
    const storage = memoryStorage()
    addMotif(storage, { name: '旧门', capture, now: '2026-11-01T00:00:00Z' })
    addRelationshipTrigger(storage, { role: '一个总在忙的人', situation: '很久没回复', cue: '屏幕暗下去', region: 'chest', sensation: 'tightness', intensity: 4, breath: 'shallow', response: 'freeze', now: '2026-11-01T00:00:00Z' })
    const dataset = buildLocalDataset(storage, '2026-11-01T00:00:00Z')
    expect(dataset).toMatchObject({ version: 'local-dataset-v2', motifs: [{ name: '旧门' }], relationships: [{ role: '一个总在忙的人' }] })
    expect(exportLocalDataset(storage)).not.toMatch(/audioData|rawAudio|diagnos|score/i)
  })

  it('clears both local stores explicitly', () => {
    const storage = memoryStorage()
    addMotif(storage, { capture })
    addRelationshipTrigger(storage, { situation: 'x', cue: '', region: 'chest', sensation: 'pressure', intensity: 1, breath: 'even', response: 'approach' })
    clearLocalDataset(storage)
    expect(storage.getItem(motifStorageKey)).toBeNull()
    expect(storage.getItem(relationshipStorageKey)).toBeNull()
  })
})


describe('local dataset captures', () => {
  const capture = {
    version: 'capture-v1' as const,
    captureId: 'capture-1',
    rendererKind: 'captured' as const,
    mimeType: 'video/mp4',
    durationSec: 75,
    sha256: 'a'.repeat(64),
    synthId: false,
    createdAt: '2026-11-01T00:00:00Z',
  }

  it('round-trips capture provenance without media bytes', () => {
    const snapshot = parseLocalDataset(JSON.stringify({ version: 'local-dataset-v2', motifs: [], relationships: [], captures: [capture] }))
    expect(snapshot.captures).toEqual([capture])
    const json = JSON.stringify(localDatasetFromSnapshot(snapshot))
    expect(json).toContain('capture-1')
    expect(json).not.toMatch(/raw|audioData|videoBytes/i)
  })

  it('rejects malformed capture provenance and clears the capture key', () => {
    expect(() => parseLocalDataset(JSON.stringify({ version: 'local-dataset-v2', motifs: [], relationships: [], captures: [{ nope: true }] }))).toThrow()
    const storage = memoryStorage()
    storage.setItem(captureStorageKey, JSON.stringify([capture]))
    clearLocalDataset(storage)
    expect(storage.getItem(captureStorageKey)).toBeNull()
  })
})


describe('local dataset symbolic sessions', () => {
  const session = {
    version: 'symbolic-session-v1' as const,
    id: 'symbolic-1',
    createdAt: '2026-11-01T00:00:00Z',
    encounterId: 'encounter-1',
    format: 'encounter' as const,
    durationSec: 75,
    completed: false,
    leftEarly: true,
    agency: [{ atSec: 10, action: 'approach' as const }, { atSec: 30, action: 'leave' as const }],
  }

  it('round-trips agency summaries without treating them as scores', () => {
    const snapshot = parseLocalDataset(JSON.stringify({ version: 'local-dataset-v2', motifs: [], relationships: [], symbolicSessions: [session] }))
    expect(snapshot.symbolicSessions).toEqual([session])
    const json = JSON.stringify(localDatasetFromSnapshot(snapshot))
    expect(json).toContain('symbolic-1')
    expect(json).not.toMatch(/score|diagnos|interpretation/i)
  })

  it('rejects malformed symbolic sessions', () => {
    expect(() => parseLocalDataset(JSON.stringify({ version: 'local-dataset-v2', motifs: [], relationships: [], symbolicSessions: [{ nope: true }] }))).toThrow()
  })
})
