#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { simulateMeanInference, type MeanScenario } from '../src/lsm0-mean-inference'

const base: MeanScenario = {
  participants: 12, sessions: 12, latentCoupling: 0.4, participantEffectSd: 0,
  autocorrelation: 0.3, signalNoise: 0.7, reportNoise: 0.7, missingRate: 0.1,
}
const scenarios: Array<{ label: string; scenario: MeanScenario }> = [
  { label: 'ar0', scenario: { ...base, autocorrelation: 0 } },
  { label: 'ar0.5', scenario: { ...base, autocorrelation: 0.5 } },
  { label: 'ar0.8', scenario: { ...base, autocorrelation: 0.8 } },
  { label: 'missing0.4', scenario: { ...base, autocorrelation: 0.5, missingRate: 0.4 } },
  { label: 'hetero0.2', scenario: { ...base, autocorrelation: 0.5, participantEffectSd: 0.2 } },
  { label: 'sessions8', scenario: { ...base, autocorrelation: 0.5, sessions: 8 } },
  { label: 'participants24', scenario: { ...base, autocorrelation: 0.5, participants: 24 } },
]
console.log('label | participants | sessions | target mean | observed mean | cluster coverage (width) | naive coverage (width) | replications')
for (const item of scenarios) {
  const result = simulateMeanInference(item.scenario, { replications: 80, bootstrapReplicates: 100 })
  const fmt = (value: number | null) => value === null ? 'n/a' : value.toFixed(3)
  console.log(`${item.label} | ${result.participants} | ${result.sessions} | ${fmt(result.targetMeanRho)} | ${fmt(result.meanObservedRho)} | ${fmt(result.cluster.coverage)} (${fmt(result.cluster.meanWidth)}) | ${fmt(result.naive.coverage)} (${fmt(result.naive.meanWidth)}) | ${result.replications}`)
}
console.log('Descriptive simulation only; no p-values or clinical claims.')
