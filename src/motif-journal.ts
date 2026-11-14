// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { isSomaticCapture, type SomaticCapture } from './somatic'
import { isSignalConsent, isVoiceTrace, type MotifSignals } from './somatic-signal'

export interface MotifSymbolic {
  format: 'encounter' | 'space' | 'open'
  motifs: string[]
  figure: string
}

export interface ContinuityRef {
  version: 'continuity-v1'
  rootId: string
  parentId: string | null
  visit: number
  action: 're-enter' | 'revise'
  note?: string
}

export interface MotifEntry {
  version: 'motif-v1'
  id: string
  createdAt: string
  name: string
  capture: SomaticCapture
  signals?: MotifSignals
  /** Derived symbolic-space parameters kept with the motif for local evaluation. */
  symbolic?: MotifSymbolic
  /** Optional trace when this entry was created by revisiting an earlier motif. */
  continuity?: ContinuityRef
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const motifStorageKey = 'tacitweave.motifs.v1'
export const motifCapacity = 1000
const maxEntries = motifCapacity

function normalizeName(name: string) {
  return name.trim().slice(0, 60)
}

function isMotifSymbolic(value: unknown): value is MotifSymbolic {
  if (!value || typeof value !== 'object') return false
  const symbolic = value as Partial<MotifSymbolic>
  return (symbolic.format === 'encounter' || symbolic.format === 'space' || symbolic.format === 'open')
    && Array.isArray(symbolic.motifs) && symbolic.motifs.length > 0 && symbolic.motifs.length <= 3
    && symbolic.motifs.every(motif => typeof motif === 'string' && motif.trim().length > 0 && motif.length <= 120)
    && typeof symbolic.figure === 'string' && symbolic.figure.trim().length > 0 && symbolic.figure.length <= 120
}

function isContinuityRef(value: unknown): value is ContinuityRef {
  if (!value || typeof value !== 'object') return false
  const ref = value as Partial<ContinuityRef>
  return ref.version === 'continuity-v1'
    && typeof ref.rootId === 'string' && ref.rootId.length > 0
    && (ref.parentId === null || typeof ref.parentId === 'string')
    && Number.isInteger(ref.visit) && (ref.visit as number) >= 2
    && (ref.action === 're-enter' || ref.action === 'revise')
    && (ref.note === undefined || (typeof ref.note === 'string' && ref.note.length <= 200))
}

export function isMotifEntry(value: unknown): value is MotifEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<MotifEntry>
  return entry.version === 'motif-v1'
    && typeof entry.id === 'string' && entry.id.length > 0
    && typeof entry.createdAt === 'string' && !Number.isNaN(Date.parse(entry.createdAt))
    && typeof entry.name === 'string'
    && isSomaticCapture(entry.capture)
    && (entry.signals === undefined || (isSignalConsent(entry.signals.consent) && (entry.signals.voice === undefined || isVoiceTrace(entry.signals.voice))))
    && (entry.symbolic === undefined || isMotifSymbolic(entry.symbolic))
    && (entry.continuity === undefined || isContinuityRef(entry.continuity))
}

export function loadMotifs(storage: StorageLike): MotifEntry[] {
  try {
    const raw = storage.getItem(motifStorageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isMotifEntry).slice(0, maxEntries) : []
  } catch {
    return []
  }
}

export function saveMotifs(storage: StorageLike, entries: MotifEntry[]) {
  storage.setItem(motifStorageKey, JSON.stringify(entries.slice(0, maxEntries)))
}

export function createMotif(input: { name?: string; capture: SomaticCapture; signals?: MotifSignals; symbolic?: MotifSymbolic; continuity?: ContinuityRef; now?: string }): MotifEntry {
  if (!isSomaticCapture(input.capture)) throw new Error('capture is incomplete')
  if (input.signals && (!isSignalConsent(input.signals.consent) || (input.signals.voice && !isVoiceTrace(input.signals.voice)))) throw new Error('signals are incomplete')
  if (input.symbolic && !isMotifSymbolic(input.symbolic)) throw new Error('symbolic is incomplete')
  if (input.continuity && !isContinuityRef(input.continuity)) throw new Error('continuity is incomplete')
  return {
    version: 'motif-v1',
    id: crypto.randomUUID(),
    createdAt: input.now ?? new Date().toISOString(),
    name: normalizeName(input.name ?? ''),
    capture: input.capture,
    ...(input.signals ? { signals: input.signals } : {}),
    ...(input.symbolic ? { symbolic: { format: input.symbolic.format, motifs: [...input.symbolic.motifs], figure: input.symbolic.figure } } : {}),
    ...(input.continuity ? { continuity: { ...input.continuity } } : {}),
  }
}

export function addMotif(storage: StorageLike, input: { name?: string; capture: SomaticCapture; signals?: MotifSignals; symbolic?: MotifSymbolic; now?: string }): MotifEntry[] {
  const entry = createMotif(input)
  const entries = [entry, ...loadMotifs(storage)].slice(0, maxEntries)
  saveMotifs(storage, entries)
  return entries
}

export function removeMotif(storage: StorageLike, id: string): MotifEntry[] {
  const entries = loadMotifs(storage).filter(entry => entry.id !== id)
  saveMotifs(storage, entries)
  return entries
}

export function clearMotifs(storage: StorageLike): MotifEntry[] {
  storage.removeItem(motifStorageKey)
  return []
}

export function exportMotifs(entries: MotifEntry[]) {
  return JSON.stringify({ version: 'motif-export-v1', exportedAt: new Date().toISOString(), entries }, null, 2)
}

export function motifDisplayName(entry: MotifEntry) {
  return entry.name || '未命名'
}
