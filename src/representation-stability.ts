// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Representation stability metrics for the v0.1 contract.
 *
 * These are descriptive metrics for repeated probes. They do not establish a
 * psychological structure; they only make agreement, revision and source mix
 * visible before a study interprets them.
 */
import type { RepresentationRecord, RepresentationSource } from './representation-contract'

export interface RepresentationProbe {
  probeId: string
  records: readonly RepresentationRecord[]
}

export interface RepresentationStabilityReport {
  version: 'representation-stability-v0.1'
  probeId: string
  beforeRecords: number
  afterRecords: number
  matchedKinds: string[]
  kindAgreement: Record<string, number | null>
  exactAgreement: number | null
  meanJaccard: number | null
  revisionRate: number | null
  sourceShare: Record<RepresentationSource, number>
  limitations: string[]
}

function normalize(value: RepresentationRecord['value']): string {
  if (Array.isArray(value)) return `[${[...value].sort().join('\u0001')}]`
  return String(value)
}

function jaccard(left: readonly string[], right: readonly string[]): number | null {
  const a = new Set(left)
  const b = new Set(right)
  if (!a.size && !b.size) return null
  let intersection = 0
  for (const value of a) if (b.has(value)) intersection += 1
  return intersection / (a.size + b.size - intersection)
}

function sourceCounts(records: readonly RepresentationRecord[]): Record<RepresentationSource, number> {
  const counts: Record<RepresentationSource, number> = {
    user_input: 0,
    user_confirmed: 0,
    system_generated: 0,
    system_inferred: 0,
  }
  for (const record of records) counts[record.source] += 1
  return counts
}

function revisionRate(records: readonly RepresentationRecord[]): number | null {
  if (!records.length) return null
  return records.filter(record => record.revision > 1).length / records.length
}

/** Compare two repeated probes by kind; values are compared as multisets. */
export function compareRepresentationProbes(before: RepresentationProbe, after: RepresentationProbe): RepresentationStabilityReport {
  if (before.probeId !== after.probeId) throw new Error('probe_ids_must_match')
  const byKindBefore = new Map<string, string[]>()
  const byKindAfter = new Map<string, string[]>()
  for (const record of before.records) {
    const values = byKindBefore.get(record.kind) ?? []
    values.push(normalize(record.value))
    byKindBefore.set(record.kind, values)
  }
  for (const record of after.records) {
    const values = byKindAfter.get(record.kind) ?? []
    values.push(normalize(record.value))
    byKindAfter.set(record.kind, values)
  }
  const kinds = [...new Set([...byKindBefore.keys(), ...byKindAfter.keys()])].sort()
  const kindAgreement: Record<string, number | null> = {}
  const jaccards: number[] = []
  for (const kind of kinds) {
    const left = byKindBefore.get(kind) ?? []
    const right = byKindAfter.get(kind) ?? []
    const value = jaccard(left, right)
    kindAgreement[kind] = value
    if (value !== null) jaccards.push(value)
  }
  const exactAgreement = kinds.length
    ? kinds.filter(kind => JSON.stringify([...(byKindBefore.get(kind) ?? [])].sort()) === JSON.stringify([...(byKindAfter.get(kind) ?? [])].sort())).length / kinds.length
    : null
  return {
    version: 'representation-stability-v0.1',
    probeId: before.probeId,
    beforeRecords: before.records.length,
    afterRecords: after.records.length,
    matchedKinds: kinds,
    kindAgreement,
    exactAgreement,
    meanJaccard: jaccards.length ? jaccards.reduce((sum, value) => sum + value, 0) / jaccards.length : null,
    revisionRate: revisionRate(after.records),
    sourceShare: sourceCounts(after.records),
    limitations: [
      'Descriptive agreement only; no test-retest reliability or construct validity claim.',
      'Probe order and prompt/layout must be reported; this metric does not control them.',
      'A stable record can still be a prompt artifact; a changing record can still be meaningful.',
      'No p-values, clinical claims or psychological-structure inference are produced.',
    ],
  }
}
