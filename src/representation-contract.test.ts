// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import {
  assertRepresentationLedger,
  isIndependentAgencyAction,
  validateRepresentationLedger,
  type RepresentationRecord,
} from './representation-contract'

const base: RepresentationRecord = {
  version: 'representation-contract-v0.1',
  id: 'r1',
  sessionId: 's1',
  kind: 'sensation',
  value: 'pressure',
  source: 'user_input',
  recordedAt: '2026-11-13T00:00:00.000Z',
  revision: 1,
}

describe('representation contract', () => {
  it('accepts direct user input', () => {
    expect(validateRepresentationLedger([base])).toEqual({ ok: true, issues: [] })
    expect(() => assertRepresentationLedger([base])).not.toThrow()
  })

  it('rejects an inference without a generator and basis', () => {
    const result = validateRepresentationLedger([{ ...base, source: 'system_inferred' }])
    expect(result.ok).toBe(false)
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['missing_generator', 'missing_basis']))
  })

  it('accepts an inference only with generator and explicit basis', () => {
    const result = validateRepresentationLedger([base, {
      ...base,
      id: 'r2',
      source: 'system_inferred',
      generator: 'contract-test',
      basis: ['r1'],
      value: 'tightness',
    }])
    expect(result.ok).toBe(true)
  })

  it('requires a matching confirmation target', () => {
    const result = validateRepresentationLedger([
      base,
      { ...base, id: 'r2', source: 'user_confirmed', confirms: 'r1', value: 'tightness' },
    ])
    expect(result.issues.some(issue => issue.code === 'confirmation_mismatch')).toBe(true)
  })

  it('enforces revision order and same session/kind', () => {
    const result = validateRepresentationLedger([
      base,
      { ...base, id: 'r2', revision: 3, replaces: 'r1' },
    ])
    expect(result.issues.some(issue => issue.code === 'invalid_revision')).toBe(true)
  })

  it('does not treat an inferred action as an independent observation', () => {
    const inferred: RepresentationRecord = {
      ...base,
      id: 'a1',
      kind: 'agency_action',
      value: 'approach',
      source: 'system_inferred',
      generator: 'ui-heuristic',
      basis: ['r1'],
      observedAt: '2026-11-13T00:00:01.000Z',
    }
    expect(isIndependentAgencyAction(inferred)).toBe(false)
    const direct: RepresentationRecord = { ...inferred, source: 'user_input', generator: undefined, basis: undefined }
    expect(isIndependentAgencyAction(direct)).toBe(true)
  })
})
