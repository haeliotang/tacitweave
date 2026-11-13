// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { summarizePhaseChange } from './phase-control'
import type { PublicDataSession } from './lsm0-public-data'

function session(participantCode: string, phase: 'relax' | 'stress', value: number | undefined): PublicDataSession {
  return {
    version: 'lsm0-public-session-v1',
    participantCode,
    sessionId: `${participantCode.toLowerCase()}-${phase}`,
    capturedAt: '2026-11-13T00:00:00.000Z',
    signals: value === undefined ? {} : { ecgHeartRateBpm: value },
    selfReport: {},
  }
}

describe('phase change positive control', () => {
  it('computes stress-minus-relax deltas without imputation', () => {
    const summary = summarizePhaseChange([
      session('P1', 'relax', 60), session('P1', 'stress', 70),
      session('P2', 'relax', 80), session('P2', 'stress', 75),
      session('P3', 'relax', 60), session('P3', 'stress', undefined),
    ], 'ecgHeartRateBpm')
    expect(summary.paired).toBe(2)
    expect(summary.missingStress).toBe(1)
    expect(summary.meanDelta).toBe(2.5)
    expect(summary.increased).toBe(1)
    expect(summary.decreased).toBe(1)
  })

  it('returns null summary values when no pair exists', () => {
    const summary = summarizePhaseChange([session('P1', 'relax', 60), session('P1', 'stress', undefined)], 'ecgHeartRateBpm')
    expect(summary.paired).toBe(0)
    expect(summary.meanDelta).toBeNull()
    expect(summary.medianDelta).toBeNull()
  })
})
