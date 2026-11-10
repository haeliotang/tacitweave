// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { demoInnerEncounter, demoInnerSpaceEncounter } from './inner-encounter'
import { symbolicPhase, validateSymbolic } from './symbolic-renderer'

describe('symbolic renderer', () => {
  it('requires a supported inner plan and a positive duration', () => {
    expect(validateSymbolic(demoInnerEncounter())).toBeUndefined()
    expect(validateSymbolic(demoInnerSpaceEncounter())).toBeUndefined()
    expect(validateSymbolic({ ...demoInnerEncounter(), innerPlan: undefined })).toContain('没有内在景观计划')
    expect(validateSymbolic({ ...demoInnerEncounter(), innerPlan: { ...demoInnerEncounter().innerPlan!, durationSec: 0 } })).toContain('时长无效')
  })

  it('maps the 75 seconds to the six non-interpretive phases', () => {
    expect(symbolicPhase(0)).toBe('arrive')
    expect(symbolicPhase(12)).toBe('notice')
    expect(symbolicPhase(28)).toBe('approach')
    expect(symbolicPhase(43)).toBe('pause')
    expect(symbolicPhase(55)).toBe('transform')
    expect(symbolicPhase(68)).toBe('leave')
    expect(symbolicPhase(75)).toBe('leave')
    expect(symbolicPhase(120, 180, 'space')).toBe('pause')
  })
})
