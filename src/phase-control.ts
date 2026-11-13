// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Descriptive paired phase-change check for public stress datasets. This is a
 * positive-control for the import/feature pipeline, not a Tacitweave construct
 * or a causal effect estimate.
 */
import type { PublicDataSession } from './lsm0-public-data'

export interface PhaseChangeSummary {
  feature: string
  paired: number
  missingRelax: number
  missingStress: number
  meanDelta: number | null
  medianDelta: number | null
  increased: number
  decreased: number
  unchanged: number
}

function phaseOf(session: PublicDataSession): 'relax' | 'stress' | null {
  if (session.sessionId.endsWith('-relax')) return 'relax'
  if (session.sessionId.endsWith('-stress')) return 'stress'
  return null
}

function valueOf(session: PublicDataSession, feature: string): number | null {
  const value = session.signals[feature] ?? session.selfReport[feature]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/** Compute stress minus relax deltas per participant, without imputation. */
export function summarizePhaseChange(sessions: readonly PublicDataSession[], feature: string): PhaseChangeSummary {
  const byParticipant = new Map<string, { relax?: PublicDataSession; stress?: PublicDataSession }>()
  for (const session of sessions) {
    const phase = phaseOf(session)
    if (!phase) continue
    const entry = byParticipant.get(session.participantCode) ?? {}
    entry[phase] = session
    byParticipant.set(session.participantCode, entry)
  }
  const deltas: number[] = []
  let missingRelax = 0
  let missingStress = 0
  for (const entry of byParticipant.values()) {
    const relax = entry.relax ? valueOf(entry.relax, feature) : null
    const stress = entry.stress ? valueOf(entry.stress, feature) : null
    if (relax === null) missingRelax += 1
    if (stress === null) missingStress += 1
    if (relax !== null && stress !== null) deltas.push(stress - relax)
  }
  const meanDelta = deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : null
  return {
    feature,
    paired: deltas.length,
    missingRelax,
    missingStress,
    meanDelta,
    medianDelta: median(deltas),
    increased: deltas.filter(value => value > 0).length,
    decreased: deltas.filter(value => value < 0).length,
    unchanged: deltas.filter(value => value === 0).length,
  }
}
