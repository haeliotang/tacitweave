// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { lagOneAutocorrelation, summarizeLagOneAutocorrelation } from './lsm0-autocorrelation'

describe('lag-1 autocorrelation helper', () => {
  it('computes positive and negative lag-1 correlation', () => {
    expect(lagOneAutocorrelation([1, 2, 3, 4])).toBeCloseTo(1, 12)
    expect(lagOneAutocorrelation([1, -1, 1, -1])).toBeCloseTo(-1, 12)
  })

  it('returns null for short, non-finite or constant series', () => {
    expect(lagOneAutocorrelation([1, 2, 3])).toBeNull()
    expect(lagOneAutocorrelation([1, Number.NaN, 2, 3])).toBeNull()
    expect(lagOneAutocorrelation([2, 2, 2, 2])).toBeNull()
  })

  it('reports a median absolute value without turning it into a threshold decision', () => {
    const summary = summarizeLagOneAutocorrelation([
      { participantCode: 'P1', values: [1, 2, 3, 4] },
      { participantCode: 'P2', values: [1, -1, 1, -1] },
    ])
    expect(summary.participants).toBe(2)
    expect(summary.medianAbsoluteLagOne).toBeCloseTo(1, 12)
    expect(summary.values).toHaveLength(2)
  })
})
