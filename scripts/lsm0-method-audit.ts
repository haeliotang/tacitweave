#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { simulatePrecision, type PrecisionScenario } from '../src/lsm0-precision'

const base: PrecisionScenario = {
  participants: 12,
  sessions: 12,
  latentCoupling: 0.4,
  participantEffectSd: 0,
  autocorrelation: 0.3,
  signalNoise: 0.7,
  reportNoise: 0.7,
  missingRate: 0.1,
}

const scenarios: Array<{ label: string; scenario: PrecisionScenario }> = [
  { label: 'ar0', scenario: { ...base, autocorrelation: 0 } },
  { label: 'ar0.5', scenario: { ...base, autocorrelation: 0.5 } },
  { label: 'ar0.8', scenario: { ...base, autocorrelation: 0.8 } },
  { label: 'missing0', scenario: { ...base, autocorrelation: 0.5, missingRate: 0 } },
  { label: 'missing0.2', scenario: { ...base, autocorrelation: 0.5, missingRate: 0.2 } },
  { label: 'missing0.4', scenario: { ...base, autocorrelation: 0.5, missingRate: 0.4 } },
  { label: 'hetero0.2', scenario: { ...base, autocorrelation: 0.5, participantEffectSd: 0.2 } },
  { label: 'sessions8', scenario: { ...base, autocorrelation: 0.5, sessions: 8 } },
  { label: 'participants24', scenario: { ...base, autocorrelation: 0.5, participants: 24 } },
]

const report = simulatePrecision({ replications: 80, bootstrapReplicates: 80, scenarios: scenarios.map(item => item.scenario) })
console.log('label | participants | sessions | autocorrelation | missing | effectSD | population | ordinary coverage | block coverage | ordinary width | block width')
for (let index = 0; index < report.scenarios.length; index += 1) {
  const result = report.scenarios[index]
  const label = scenarios[index].label
  const format = (value: number | null) => value === null ? 'n/a' : value.toFixed(3)
  console.log(`${label} | ${result.participants} | ${result.sessions} | ${result.autocorrelation} | ${result.missingRate} | ${result.participantEffectSd} | ${format(result.populationSpearman)} | ${format(result.ordinary.coverage)} | ${format(result.movingBlock.coverage)} | ${format(result.ordinary.meanWidth)} | ${format(result.movingBlock.meanWidth)}`)
}
console.log('Descriptive simulation only; no p-values or clinical claims.')
