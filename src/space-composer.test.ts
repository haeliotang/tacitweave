// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { innerPlanFromCapture } from './inner'
import { composeInnerPlan } from './space-composition'
import type { SomaticCapture } from './somatic'

const capture: SomaticCapture = { region: 'chest', sensation: 'pressure', intensity: 3, breath: 'held', fragments: ['wet-corridor'], certainty: 'clear' }

describe('space composer', () => {
  it('lets the user choose motifs, figure and a 75s or 180s format', () => {
    const base = innerPlanFromCapture(capture)
    const plan = composeInnerPlan(base, { motifs: ['door', 'water'], figure: 'animal', durationSec: 180 })
    expect(plan.format).toBe('space')
    expect(plan.durationSec).toBe(180)
    expect(plan.motifs).toEqual(['door', 'water'])
    expect(plan.figure).toBe('animal')
    expect(plan.beats).toEqual([{ startSec: 0, endSec: 180, action: 'pause', intent: '可以待着；没有必须发生的事' }])
    expect(plan.prompts.negative).toContain('no diagnosis or psychological interpretation')
  })

  it('rejects empty motifs and invalid durations without interpreting the input', () => {
    const base = innerPlanFromCapture(capture)
    expect(() => composeInnerPlan(base, { motifs: [], figure: 'none', durationSec: 75 })).toThrow('choose_at_least_one_motif')
    expect(() => composeInnerPlan(base, { motifs: ['door'], figure: 'none', durationSec: 90 as 75 })).toThrow('invalid_duration')
    const plan = composeInnerPlan(base, { motifs: ['door'], figure: 'none', durationSec: 75 })
    expect(plan.safety).toEqual({ notDiagnosis: true, noInterpretation: true, userOwnsMeaning: true, exitAlwaysAvailable: true, noMemoriesClaimed: true })
    expect(plan.prompts.negative).toContain('no diagnosis or psychological interpretation')
  })
})
