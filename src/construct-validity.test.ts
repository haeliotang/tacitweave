// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { assertConstructValidityMatrix, constructValidityMatrix, validateConstructValidityMatrix, type ConstructClaim } from './construct-validity'

describe('construct-validity registry', () => {
  it('requires every claim to name competitors, tests and failure conditions', () => {
    expect(validateConstructValidityMatrix()).toEqual({ ok: true, issues: [] })
    expect(() => assertConstructValidityMatrix()).not.toThrow()
    for (const claim of constructValidityMatrix) {
      expect(claim.competitors.length).toBeGreaterThan(0)
      expect(claim.tests.length).toBeGreaterThan(0)
      expect(claim.tests.every(test => test.failureCondition.trim().length > 0)).toBe(true)
    }
  })

  it('does not mark any current claim as supported', () => {
    expect(constructValidityMatrix.every(claim => claim.status !== 'supported')).toBe(true)
  })

  it('rejects a supported claim with no evidence', () => {
    const claim: ConstructClaim = { ...constructValidityMatrix[0], status: 'supported', evidence: [] }
    const result = validateConstructValidityMatrix([claim])
    expect(result.issues.some(issue => issue.code === 'unsupported_claim')).toBe(true)
  })

  it('rejects a test without a failure condition', () => {
    const claim: ConstructClaim = {
      ...constructValidityMatrix[0],
      tests: [{ ...constructValidityMatrix[0].tests[0], failureCondition: '' }],
    }
    const result = validateConstructValidityMatrix([claim])
    expect(result.issues.some(issue => issue.code === 'missing_failure_condition')).toBe(true)
  })
})
