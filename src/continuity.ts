// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createMotif, type ContinuityRef, type MotifEntry } from './motif-journal'
import type { SomaticCapture } from './somatic'

export interface ContinuityTrail {
  rootId: string
  root: MotifEntry
  visits: MotifEntry[]
  latest: MotifEntry
}

export interface ContinuityFieldChange {
  field: 'name' | 'region' | 'sensation' | 'intensity' | 'breath' | 'certainty' | 'fragments'
  before: string
  after: string
  changed: boolean
}

export interface ContinuityComparison {
  beforeId: string
  afterId: string
  changes: ContinuityFieldChange[]
  changedCount: number
}

export function continuityRootId(entry: MotifEntry): string {
  return entry.continuity?.rootId ?? entry.id
}

function compareStrings(left: readonly string[], right: readonly string[]): [string, string] {
  return [[...left].sort().join(' / '), [...right].sort().join(' / ')]
}

/** Group motifs by their original root; every root keeps its full revision history. */
export function buildContinuityTrails(motifs: readonly MotifEntry[]): ContinuityTrail[] {
  const groups = new Map<string, MotifEntry[]>()
  for (const entry of motifs) {
    const rootId = continuityRootId(entry)
    const group = groups.get(rootId) ?? []
    group.push(entry)
    groups.set(rootId, group)
  }
  return [...groups.entries()].map(([rootId, entries]) => {
    const visits = [...entries].sort((left, right) => (left.continuity?.visit ?? 1) - (right.continuity?.visit ?? 1) || Date.parse(left.createdAt) - Date.parse(right.createdAt))
    const root = visits.find(entry => entry.id === rootId) ?? visits[0]
    return { rootId, root, visits, latest: visits[visits.length - 1] }
  }).sort((left, right) => Date.parse(right.latest.createdAt) - Date.parse(left.latest.createdAt))
}

export interface RevisitInput {
  capture?: SomaticCapture
  name?: string
  note?: string
  now?: string
}

/** Create a new immutable revision; the source motif is never overwritten. */
export function createRevisit(motifs: readonly MotifEntry[], sourceId: string, input: RevisitInput = {}): MotifEntry {
  const source = motifs.find(entry => entry.id === sourceId)
  if (!source) throw new Error('motif_not_found')
  const rootId = continuityRootId(source)
  const rootVisits = motifs.filter(entry => continuityRootId(entry) === rootId)
  const visit = Math.max(1, ...rootVisits.map(entry => entry.continuity?.visit ?? 1)) + 1
  const continuity: ContinuityRef = {
    version: 'continuity-v1',
    rootId,
    parentId: source.id,
    visit,
    action: 're-enter',
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, 200) } : {}),
  }
  return createMotif({
    name: input.name ?? source.name,
    capture: input.capture ?? source.capture,
    continuity,
    ...(input.now ? { now: input.now } : {}),
  })
}

/** Compare two user-authored snapshots; only field differences, no interpretation. */
export function compareContinuity(before: MotifEntry, after: MotifEntry): ContinuityComparison {
  const [beforeFragments, afterFragments] = compareStrings(before.capture.fragments, after.capture.fragments)
  const changes: ContinuityFieldChange[] = [
    { field: 'name', before: before.name, after: after.name, changed: before.name !== after.name },
    { field: 'region', before: before.capture.region, after: after.capture.region, changed: before.capture.region !== after.capture.region },
    { field: 'sensation', before: before.capture.sensation, after: after.capture.sensation, changed: before.capture.sensation !== after.capture.sensation },
    { field: 'intensity', before: String(before.capture.intensity), after: String(after.capture.intensity), changed: before.capture.intensity !== after.capture.intensity },
    { field: 'breath', before: before.capture.breath, after: after.capture.breath, changed: before.capture.breath !== after.capture.breath },
    { field: 'certainty', before: before.capture.certainty ?? '', after: after.capture.certainty ?? '', changed: before.capture.certainty !== after.capture.certainty },
    { field: 'fragments', before: beforeFragments, after: afterFragments, changed: beforeFragments !== afterFragments },
  ]
  return { beforeId: before.id, afterId: after.id, changes, changedCount: changes.filter(change => change.changed).length }
}
