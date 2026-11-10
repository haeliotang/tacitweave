// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { runSilScenario, runSilSuite, silScenarios } from './sil-harness'

describe('Software-in-the-Loop harness', () => {
  it('passes every pre-registered SIL scenario', () => {
    const results = runSilSuite()
    expect(results).toHaveLength(silScenarios.length)
    expect(results.filter(result => !result.passed)).toEqual([])
  })

  it('is deterministic across runs', () => {
    expect(runSilScenario(silScenarios[1])).toEqual(runSilScenario(silScenarios[1]))
  })

  it('surfaces a failed assertion instead of silently accepting bad data', () => {
    const result = runSilScenario({
      ...silScenarios[0],
      expected: { ...silScenarios[0].expected, deliveredSamples: 999 },
    })
    expect(result.passed).toBe(false)
    expect(result.checks.find(check => check.name === 'deliveredSamples')?.passed).toBe(false)
  })
})
