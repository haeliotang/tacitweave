// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { evaluateLsm1, syntheticLsm1Rows } from './lsm1-eval'

describe('LSM-1 synthetic evaluation contract', () => {
  it('detects a planted incremental effect', () => {
    const result = evaluateLsm1(syntheticLsm1Rows('planted'))
    expect(result.status).toBe('evaluated')
    expect(result.decision).toBe('supports_incremental')
    expect(result.relativeImprovement).toBeGreaterThan(0.1)
  })

  it('does not turn a null effect into incremental evidence', () => {
    const result = evaluateLsm1(syntheticLsm1Rows('null'))
    expect(result.status).toBe('evaluated')
    expect(result.decision).toBe('no_incremental')
  })

  it('rejects an action derived from existing inputs', () => {
    const result = evaluateLsm1(syntheticLsm1Rows('derived_action'))
    expect(result.status).toBe('invalid')
    expect(result.reason).toBe('action_not_independent')
    expect(result.decision).toBe('invalid')
  })

  it('rejects a temporal leak where action follows the outcome', () => {
    const result = evaluateLsm1(syntheticLsm1Rows('leakage'))
    expect(result.status).toBe('invalid')
    expect(result.reason).toBe('action_after_outcome')
  })

  it('is deterministic and never emits p-values', () => {
    const first = evaluateLsm1(syntheticLsm1Rows('planted'))
    const second = evaluateLsm1(syntheticLsm1Rows('planted'))
    expect(first).toEqual(second)
    expect(JSON.stringify(first)).not.toMatch(/"pValue"|"p_value"/)
  })
})
