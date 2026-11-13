// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { fisherZ, inverseFisherZ, randomEffectsMean } from './lsm0-random-effects'

describe('Fisher-z random-effects estimator', () => {
  it('round-trips Fisher z and returns a group interval', () => {
    const z = fisherZ(0.4)
    expect(inverseFisherZ(z)).toBeCloseTo(0.4, 12)
    const result = randomEffectsMean([{ rho: 0.2, pairs: 12 }, { rho: 0.5, pairs: 12 }, { rho: 0.35, pairs: 12 }])
    expect(result).not.toBeNull()
    expect(result!.k).toBe(3)
    expect(result!.meanRho).toBeGreaterThan(0.2)
    expect(result!.meanRho).toBeLessThan(0.5)
    expect(result!.ciLowRho).toBeLessThan(result!.ciHighRho)
  })

  it('returns null for insufficient or invalid estimates', () => {
    expect(randomEffectsMean([])).toBeNull()
    expect(randomEffectsMean([{ rho: 0.2, pairs: 2 }])).toBeNull()
    expect(randomEffectsMean([{ rho: 1, pairs: 12 }, { rho: 0.2, pairs: 12 }])).toBeNull()
  })

  it('reports no p-value or approved-interval claim', () => {
    const result = randomEffectsMean([{ rho: 0.1, pairs: 12 }, { rho: 0.3, pairs: 12 }])
    expect(JSON.stringify(result)).not.toMatch(/"pValue"|"p_value"/)
  })
})
