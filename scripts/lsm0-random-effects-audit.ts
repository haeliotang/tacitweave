#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { analyticPopulationSpearman } from '../src/lsm0-precision'
import { randomEffectsMean } from '../src/lsm0-random-effects'
import { spearmanRho } from '../src/lsm0-eval'

interface Scenario {
  participants: number
  sessions: number
  latentCoupling: number
  participantEffectSd: number
  autocorrelation: number
  signalNoise: number
  reportNoise: number
  missingRate: number
}

const base: Scenario = {
  participants: 12, sessions: 12, latentCoupling: 0.4, participantEffectSd: 0,
  autocorrelation: 0.3, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1,
}

function lcg(seed: number) {
  let state = seed >>> 0
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000 }
}
function normal(random: () => number) {
  const u = Math.max(random(), Number.EPSILON)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}
function mean(values: readonly number[]): number | null { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null }

function participantRho(scenario: Scenario, coupling: number, random: () => number): number | null {
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

function audit(label: string, scenario: Scenario) {
  const random = lcg(20261113 + scenario.participants * 101 + scenario.sessions)
  const replications = 80
  let covered = 0
  let total = 0
  let widthSum = 0
  let biasSum = 0
  let tauSum = 0
  let i2Sum = 0
  for (let replication = 0; replication < replications; replication += 1) {
    const estimates: Array<{ rho: number; pairs: number }> = []
    const targets: number[] = []
    for (let participant = 0; participant < scenario.participants; participant += 1) {
      const coupling = Math.max(-0.95, Math.min(0.95, scenario.latentCoupling + scenario.participantEffectSd * normal(random)))
      const rho = participantRho(scenario, coupling, random)
      if (rho === null) continue
      estimates.push({ rho, pairs: scenario.sessions })
      targets.push(analyticPopulationSpearman(coupling, scenario))
    }
    const result = randomEffectsMean(estimates)
    const target = mean(targets)
    if (!result || target === null) continue
    total += 1
    widthSum += result.ciHighRho - result.ciLowRho
    biasSum += result.meanRho - target
    tauSum += result.tau2
    i2Sum += result.i2 ?? 0
    if (result.ciLowRho <= target && target <= result.ciHighRho) covered += 1
  }
  console.log(`${label} | participants=${scenario.participants} sessions=${scenario.sessions} | coverage=${total ? (covered / total).toFixed(3) : 'n/a'} width=${total ? (widthSum / total).toFixed(3) : 'n/a'} bias=${total ? (biasSum / total).toFixed(3) : 'n/a'} tau2=${total ? (tauSum / total).toFixed(4) : 'n/a'} I2=${total ? (i2Sum / total).toFixed(3) : 'n/a'}`)
}

const scenarios: Array<[string, Scenario]> = [
  ['ar0', { ...base, autocorrelation: 0 }],
  ['ar0.5', { ...base, autocorrelation: 0.5 }],
  ['ar0.8', { ...base, autocorrelation: 0.8 }],
  ['missing0.4', { ...base, autocorrelation: 0.5, missingRate: 0.4 }],
  ['hetero0.2', { ...base, autocorrelation: 0.5, participantEffectSd: 0.2 }],
  ['sessions8', { ...base, autocorrelation: 0.5, sessions: 8 }],
  ['participants24', { ...base, autocorrelation: 0.5, participants: 24 }],
]
for (const [label, scenario] of scenarios) audit(label, scenario)
console.log('Descriptive simulation only; no p-values or approved-interval claim.')
