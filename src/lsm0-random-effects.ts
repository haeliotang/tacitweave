// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Fisher-z random-effects estimator for the group mean of within-person
 * correlations. This is a candidate method for the LSM-0 interval audit; it is
 * not an approved analysis until its coverage is demonstrated.
 */

export interface ParticipantCorrelationEstimate {
  rho: number
  pairs: number
}

export interface RandomEffectsResult {
  k: number
  meanRho: number
  ciLowRho: number
  ciHighRho: number
  meanZ: number
  ciLowZ: number
  ciHighZ: number
  tau2: number
  q: number
  i2: number | null
}

/** Fisher z transform; rho must be strictly between -1 and 1. */
export function fisherZ(rho: number): number {
  return 0.5 * Math.log((1 + rho) / (1 - rho))
}

/** Inverse Fisher z transform. */
export function inverseFisherZ(z: number): number {
  return Math.tanh(z)
}

function variance(estimate: ParticipantCorrelationEstimate): number | null {
  return estimate.pairs > 3 ? 1 / (estimate.pairs - 3) : null
}

/**
 * DerSimonian-Laird random-effects estimate on Fisher-z correlations.
 * Returns null when fewer than two valid estimates exist.
 */
export function randomEffectsMean(estimates: readonly ParticipantCorrelationEstimate[]): RandomEffectsResult | null {
  const usable = estimates.filter(estimate => Number.isFinite(estimate.rho) && estimate.rho > -1 && estimate.rho < 1 && variance(estimate) !== null)
  if (usable.length < 2) return null
  const zs = usable.map(estimate => fisherZ(estimate.rho))
  const variances = usable.map(estimate => variance(estimate) as number)
  const weights = variances.map(value => 1 / value)
  const totalWeight = weights.reduce((sum, value) => sum + value, 0)
  const fixedMean = zs.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight
  const q = zs.reduce((sum, value, index) => sum + weights[index] * (value - fixedMean) ** 2, 0)
  const df = usable.length - 1
  const c = totalWeight - weights.reduce((sum, value) => sum + value ** 2, 0) / totalWeight
  const tau2 = c > 0 ? Math.max(0, (q - df) / c) : 0
  const randomWeights = variances.map(value => 1 / (value + tau2))
  const randomTotal = randomWeights.reduce((sum, value) => sum + value, 0)
  const meanZ = zs.reduce((sum, value, index) => sum + value * randomWeights[index], 0) / randomTotal
  const se = Math.sqrt(1 / randomTotal)
  return {
    k: usable.length,
    meanRho: inverseFisherZ(meanZ),
    ciLowRho: inverseFisherZ(meanZ - 1.96 * se),
    ciHighRho: inverseFisherZ(meanZ + 1.96 * se),
    meanZ,
    ciLowZ: meanZ - 1.96 * se,
    ciHighZ: meanZ + 1.96 * se,
    tau2,
    q,
    i2: q > 0 ? Math.max(0, (q - df) / q) : null,
  }
}
