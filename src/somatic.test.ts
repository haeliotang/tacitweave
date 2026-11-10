// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { innerPlanFromCapture } from './inner'
import { createInnerCaptureEncounter } from './inner-encounter'
import { isSomaticCapture, type SomaticCapture } from './somatic'

const capture: SomaticCapture = { region: 'chest', sensation: 'pressure', intensity: 4, breath: 'held', fragments: ['wet-corridor', 'dusk-stairs'] }

describe('pre-verbal capture', () => {
  it('turns body location, sensation, breath and fragments into a symbolic plan', () => {
    const plan = innerPlanFromCapture(capture)
    expect(plan.format).toBe('encounter')
    expect(plan.durationSec).toBe(75)
    expect(plan.figure).toBe('none')
    expect(plan.somatic).toEqual(capture)
    expect(plan.motifs).toEqual(expect.arrayContaining(['corridor', 'water']))
    expect(plan.prompts.space).toContain('pressure')
    expect(plan.prompts.space).toContain('chest')
    expect(plan.prompts.figure).toContain('No figure')
  })

  it('keeps the plan free of free text and keeps the non-diagnostic boundary', () => {
    const plan = innerPlanFromCapture(capture)
    expect(JSON.stringify(plan.somatic)).not.toContain('张三')
    expect(plan.prompts.negative.join(' ')).toContain('no diagnosis')
    expect(plan.safety).toMatchObject({ notDiagnosis: true, noInterpretation: true, userOwnsMeaning: true })
  })

  it('rejects incomplete or malformed captures', () => {
    expect(isSomaticCapture(capture)).toBe(true)
    expect(isSomaticCapture({ ...capture, fragments: [] })).toBe(false)
    expect(isSomaticCapture({ ...capture, intensity: 9 })).toBe(false)
    expect(isSomaticCapture({ ...capture, certainty: 'unsure' })).toBe(true)
    expect(isSomaticCapture({ ...capture, certainty: 'definitely' })).toBe(false)
    expect(() => innerPlanFromCapture({ ...capture, fragments: [] })).toThrow()
  })

  it('creates a local symbolic encounter without a server round trip', () => {
    const encounter = createInnerCaptureEncounter(capture)
    expect(encounter.rendererKind).toBe('symbolic')
    expect(encounter.id.startsWith('demo-inner-')).toBe(true)
    expect(encounter.innerPlan?.somatic).toEqual(capture)
    expect(encounter.plan).toMatchObject({ version: 'episode-plan-v1', kind: 'inner' })
  })
})
