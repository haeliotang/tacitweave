// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { defaultPrecisionScenarios, estimatePopulationSpearman, estimatePopulationSpearmanMonteCarlo, formatPrecisionReport, movingBlockIndices, simulatePrecision } from './lsm0-precision'

describe('LSM-0 precision simulation', () => {
  it('is deterministic and reports both interval methods', () => {
    const first = simulatePrecision({ replications: 10, bootstrapReplicates: 10, scenarios: defaultPrecisionScenarios.slice(0, 2) })
    const second = simulatePrecision({ replications: 10, bootstrapReplicates: 10, scenarios: defaultPrecisionScenarios.slice(0, 2) })
    expect(first).toEqual(second)
    expect(first.scenarios[0].ordinary.method).toBe('ordinary_bootstrap')
    expect(first.scenarios[0].movingBlock.method).toBe('moving_block_bootstrap')
    expect(formatPrecisionReport(first)).toContain('Descriptive simulation only')
  })

  it('uses a population Spearman target rather than the latent coupling coefficient', () => {
    const target = estimatePopulationSpearman(defaultPrecisionScenarios[0])
    const monteCarlo = estimatePopulationSpearmanMonteCarlo(defaultPrecisionScenarios[0], 20_000)
    expect(target).not.toBeNull()
    expect(target).toBeGreaterThan(0.15)
    expect(target).toBeLessThan(0.35)
    expect(target).not.toBe(defaultPrecisionScenarios[0].latentCoupling)
    expect(monteCarlo).not.toBeNull()
    expect(Math.abs((target ?? 0) - (monteCarlo ?? 0))).toBeLessThan(0.02)
  })

  it('uses participant-specific true targets when heterogeneity is enabled', () => {
    const scenario = { ...defaultPrecisionScenarios[0], participantEffectSd: 0.2 }
    const report = simulatePrecision({ replications: 5, bootstrapReplicates: 5, scenarios: [scenario] })
    expect(report.scenarios[0].trueBetweenParticipantSd).toBe(0.2)
    expect(report.scenarios[0].ordinary.coverage).not.toBeNull()
    expect(report.scenarios[0].movingBlock.coverage).not.toBeNull()
  })

  it('handles session counts that are not divisible by the block length', () => {
    const scenario = { ...defaultPrecisionScenarios[0], sessions: 8 }
    const report = simulatePrecision({ replications: 5, bootstrapReplicates: 5, blockLength: 3, scenarios: [scenario] })
    expect(report.scenarios[0].movingBlock.meanWidth).not.toBeNull()
    const indices = movingBlockIndices(8, 3, () => 0.5)
    expect(indices).toHaveLength(8)
    expect(indices.every(index => index >= 0 && index < 8)).toBe(true)
  })

  it('flags the temporal-dependence limitation and never emits p-values', () => {
    const report = simulatePrecision({ replications: 5, bootstrapReplicates: 5, scenarios: [defaultPrecisionScenarios[0]] })
    expect(report.limitations.join(' ')).toContain('temporal dependence')
    expect(JSON.stringify(report)).not.toMatch(/"pValue"|"p_value"/)
  })
})
