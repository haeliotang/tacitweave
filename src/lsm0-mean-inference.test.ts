// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { simulateMeanInference, type MeanScenario } from './lsm0-mean-inference'

const scenario: MeanScenario = {
  participants: 12, sessions: 12, latentCoupling: 0.4, participantEffectSd: 0,
  autocorrelation: 0.5, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1,
}

describe('LSM-0 group-mean inference audit', () => {
  it('is deterministic and reports both group-mean interval methods', () => {
    const first = simulateMeanInference(scenario, { replications: 10, bootstrapReplicates: 10 })
    const second = simulateMeanInference(scenario, { replications: 10, bootstrapReplicates: 10 })
    expect(first).toEqual(second)
    expect(first.cluster.method).toBe('participant_cluster_bootstrap')
    expect(first.naive.method).toBe('naive_normal')
    expect(first.meanObservedRho).not.toBeNull()
    expect(first.participantRhoSd).not.toBeNull()
  })

  it('does not emit p-values or claim an approved interval', () => {
    const result = simulateMeanInference(scenario, { replications: 5, bootstrapReplicates: 5 })
    expect(JSON.stringify(result)).not.toMatch(/"pValue"|"p_value"/)
    expect(result.cluster.coverage === null || result.cluster.coverage >= 0).toBe(true)
  })
})
