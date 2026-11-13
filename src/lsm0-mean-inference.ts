// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Group-mean inference audit for LSM-0.
 *
 * The per-participant interval audit found that bootstrap intervals under-cover.
 * This module changes the estimand to the group mean of within-person
 * Spearman correlations and compares participant-cluster bootstrap with a
 * naive participant-level normal interval. It is still a simulation, not an
 * empirical result.
 */
import { analyticPopulationSpearman } from './lsm0-precision'
import { spearmanRho } from './lsm0-eval'

export interface MeanScenario {
  participants: number
  sessions: number
  latentCoupling: number
  participantEffectSd: number
  autocorrelation: number
  signalNoise: number
  reportNoise: number
  missingRate: number
}

export interface MeanInterval {
  method: 'participant_cluster_bootstrap' | 'naive_normal'
  coverage: number | null
  meanWidth: number | null
}

export interface MeanSimulationResult {
  participants: number
  sessions: number
  replications: number
  targetMeanRho: number | null
  meanObservedRho: number | null
  participantRhoSd: number | null
  cluster: MeanInterval
  naive: MeanInterval
}

export interface MeanSimulationOptions {
  seed?: number
  replications?: number
  bootstrapReplicates?: number
}

function lcg(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function normal(random: () => number) {
  const u = Math.max(random(), Number.EPSILON)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

function percentile(sorted: readonly number[], p: number): number {
  if (!sorted.length) return Number.NaN
  const index = (sorted.length - 1) * p
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function sd(values: readonly number[]): number | null {
  if (values.length < 2) return null
  const average = mean(values) ?? 0
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1))
}

function participantRho(scenario: MeanScenario, coupling: number, random: () => number): number | null {
  let latent = normal(random)
  const xs: number[] = []
  const ys: number[] = []
  for (let session = 0; session < scenario.sessions; session += 1) {
    if (session > 0) latent = scenario.autocorrelation * latent + Math.sqrt(Math.max(0, 1 - scenario.autocorrelation ** 2)) * normal(random)
    const x = latent + scenario.signalNoise * normal(random)
    const y = coupling * latent + Math.sqrt(Math.max(0, 1 - coupling ** 2)) * normal(random) + scenario.reportNoise * normal(random)
    if (random() >= scenario.missingRate) { xs.push(x); ys.push(y) }
  }
  return xs.length >= 4 ? spearmanRho(xs, ys) : null
}

function interval(low: number[], high: number[], target: number[]): { coverage: number | null; meanWidth: number | null } {
  const usable = low.map((lowValue, index) => ({ low: lowValue, high: high[index], target: target[index] }))
    .filter(value => Number.isFinite(value.low) && Number.isFinite(value.high) && Number.isFinite(value.target))
  if (!usable.length) return { coverage: null, meanWidth: null }
  return {
    coverage: usable.filter(value => value.low <= value.target && value.target <= value.high).length / usable.length,
    meanWidth: usable.reduce((sum, value) => sum + Math.max(0, value.high - value.low), 0) / usable.length,
  }
}

/** Simulate and compare participant-cluster vs naive normal intervals for the group mean. */
export function simulateMeanInference(scenario: MeanScenario, options: MeanSimulationOptions = {}): MeanSimulationResult {
  const replications = options.replications ?? 100
  const bootstrapReplicates = options.bootstrapReplicates ?? 100
  const random = lcg(options.seed ?? 20261113)
  const observedMeans: number[] = []
  const targets: number[] = []
  const clusterLow: number[] = []
  const clusterHigh: number[] = []
  const naiveLow: number[] = []
  const naiveHigh: number[] = []
  const participantSds: number[] = []
  for (let replication = 0; replication < replications; replication += 1) {
    const rhos: number[] = []
    const trueTargets: number[] = []
    for (let participant = 0; participant < scenario.participants; participant += 1) {
      const coupling = Math.max(-0.95, Math.min(0.95, scenario.latentCoupling + scenario.participantEffectSd * normal(random)))
      const rho = participantRho(scenario, coupling, random)
      if (rho === null) continue
      rhos.push(rho)
      trueTargets.push(analyticPopulationSpearman(coupling, scenario))
    }
    if (rhos.length < 3) continue
    const observedMean = mean(rhos)
    const targetMean = mean(trueTargets)
    if (observedMean === null || targetMean === null) continue
    observedMeans.push(observedMean)
    targets.push(targetMean)
    const participantSd = sd(rhos)
    participantSds.push(participantSd ?? Number.NaN)
    const bootMeans: number[] = []
    for (let replicate = 0; replicate < bootstrapReplicates; replicate += 1) {
      const sample = Array.from({ length: rhos.length }, () => rhos[Math.floor(random() * rhos.length)])
      const sampleMean = mean(sample)
      if (sampleMean !== null) bootMeans.push(sampleMean)
    }
    bootMeans.sort((a, b) => a - b)
    clusterLow.push(percentile(bootMeans, 0.025))
    clusterHigh.push(percentile(bootMeans, 0.975))
    if (participantSd !== null) {
      const halfWidth = 1.96 * participantSd / Math.sqrt(rhos.length)
      naiveLow.push(observedMean - halfWidth)
      naiveHigh.push(observedMean + halfWidth)
    } else {
      naiveLow.push(Number.NaN)
      naiveHigh.push(Number.NaN)
    }
  }
  const cluster = interval(clusterLow, clusterHigh, targets)
  const naive = interval(naiveLow, naiveHigh, targets)
  return {
    participants: scenario.participants,
    sessions: scenario.sessions,
    replications: observedMeans.length,
    targetMeanRho: mean(targets),
    meanObservedRho: mean(observedMeans),
    participantRhoSd: mean(participantSds),
    cluster: { method: 'participant_cluster_bootstrap', ...cluster },
    naive: { method: 'naive_normal', ...naive },
  }
}
