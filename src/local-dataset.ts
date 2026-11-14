// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { isMotifEntry, loadMotifs, motifStorageKey, type MotifEntry, type StorageLike } from './motif-journal'
import { isRelationshipTrigger, loadRelationshipTriggers, relationshipStorageKey, type RelationshipStorageLike, type RelationshipTrigger } from './relationship'
import { clearFieldLayout, emptyFieldLayout, fieldStorageKey, isFieldLayout, loadFieldLayout, type FieldLayout } from './field'
import { clearSignalSessions, isSignalSession, loadSignalSessions, saveSignalSessions, signalSessionStorageKey, type SignalSession } from './signal-session'
import { captureStorageKey, clearCaptureProvenance, isCaptureLedger, loadCaptureProvenance } from './capture-ledger'
import type { CaptureProvenance } from './capture'
import { isSymbolicSession, loadSymbolicSessions, symbolicSessionStorageKey, type SymbolicSession } from './symbolic-session'
import { experienceSpaceStorageKey, isExperienceSpace, loadExperienceSpaces, saveExperienceSpaces, type ExperienceSpaceV2 } from './experience-space'

export interface LocalDataset {
  version: 'local-dataset-v1' | 'local-dataset-v2'
  exportedAt: string
  motifs: MotifEntry[]
  relationships: RelationshipTrigger[]
  field?: FieldLayout
  signals?: SignalSession[]
  captures?: CaptureProvenance[]
  symbolicSessions?: SymbolicSession[]
  spaces?: ExperienceSpaceV2[]
}

type DatasetStorage = StorageLike & RelationshipStorageLike

export function buildLocalDataset(storage: DatasetStorage, now = new Date().toISOString()): LocalDataset {
  return {
    version: 'local-dataset-v2',
    exportedAt: now,
    motifs: loadMotifs(storage),
    relationships: loadRelationshipTriggers(storage),
    field: loadFieldLayout(storage),
    signals: loadSignalSessions(storage),
    captures: loadCaptureProvenance(storage),
    symbolicSessions: loadSymbolicSessions(storage),
    spaces: loadExperienceSpaces(storage),
  }
}

export function exportLocalDataset(storage: DatasetStorage) {
  return JSON.stringify(buildLocalDataset(storage), null, 2)
}

export function clearLocalDataset(storage: DatasetStorage) {
  storage.removeItem(motifStorageKey)
  storage.removeItem(relationshipStorageKey)
  storage.removeItem(fieldStorageKey)
  storage.removeItem(signalSessionStorageKey)
  storage.removeItem(captureStorageKey)
  storage.removeItem(symbolicSessionStorageKey)
  storage.removeItem(experienceSpaceStorageKey)
}

export interface LocalSnapshot {
  motifs: MotifEntry[]
  relationships: RelationshipTrigger[]
  field?: FieldLayout
  signals?: SignalSession[]
  captures?: CaptureProvenance[]
  symbolicSessions?: SymbolicSession[]
  spaces?: ExperienceSpaceV2[]
}

export function localDatasetFromSnapshot(snapshot: LocalSnapshot, now = new Date().toISOString()): LocalDataset {
  return { version: 'local-dataset-v2', exportedAt: now, motifs: snapshot.motifs, relationships: snapshot.relationships, field: snapshot.field ?? emptyFieldLayout(), signals: snapshot.signals ?? [], captures: snapshot.captures ?? [], symbolicSessions: snapshot.symbolicSessions ?? [], spaces: snapshot.spaces ?? [] }
}

export function parseLocalDataset(text: string): LocalSnapshot {
  const parsed: unknown = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid_local_dataset')
  const data = parsed as { version?: unknown; motifs?: unknown; relationships?: unknown; field?: unknown; signals?: unknown; captures?: unknown; symbolicSessions?: unknown; spaces?: unknown }
  const version = data.version === 'local-dataset-v1' || data.version === 'local-dataset-v2'
  if (!version || !Array.isArray(data.motifs) || !Array.isArray(data.relationships)) throw new Error('invalid_local_dataset')
  if (!data.motifs.every(isMotifEntry) || !data.relationships.every(isRelationshipTrigger)) throw new Error('invalid_local_dataset')
  if (data.field !== undefined && !isFieldLayout(data.field)) throw new Error('invalid_local_dataset')
  if (data.signals !== undefined && (!Array.isArray(data.signals) || !data.signals.every(isSignalSession))) throw new Error('invalid_local_dataset')
  if (data.captures !== undefined && !isCaptureLedger(data.captures)) throw new Error('invalid_local_dataset')
  if (data.symbolicSessions !== undefined && (!Array.isArray(data.symbolicSessions) || !data.symbolicSessions.every(isSymbolicSession))) throw new Error('invalid_local_dataset')
  if (data.spaces !== undefined && (!Array.isArray(data.spaces) || !data.spaces.every(isExperienceSpace))) throw new Error('invalid_local_dataset')
  return { motifs: data.motifs, relationships: data.relationships, ...(data.field ? { field: data.field } : {}), ...(data.signals ? { signals: data.signals } : {}), ...(data.captures ? { captures: data.captures } : {}), ...(data.symbolicSessions ? { symbolicSessions: data.symbolicSessions } : {}), ...(data.spaces ? { spaces: data.spaces } : {}) }
}
