// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { innerPlan, innerSpace, innerStoryboardMarkdown } from './inner'

describe('inner plan', () => {
  it('turns a fragment into a bounded symbolic space without interpreting it', () => {
    const plan = innerPlan({ fragment: '我总梦见一条走廊尽头有一扇门，门外是水。', feeling: 'unease' })
    expect(plan.version).toBe('inner-v1')
    expect(plan.format).toBe('encounter')
    expect(plan.motifs).toEqual(['water', 'door', 'corridor'])
    expect(plan.durationSec).toBe(75)
    expect(plan.beats[0].startSec).toBe(0)
    expect(plan.beats.at(-1)!.endSec).toBe(75)
    for (let index = 1; index < plan.beats.length; index++) expect(plan.beats[index].startSec).toBe(plan.beats[index - 1].endSec)
    expect(plan.prompts.negative.join(' ')).toContain('no diagnosis')
    expect(plan.prompts.negative.join(' ')).toContain('no real-person likeness')
    expect(plan.safety).toEqual({ notDiagnosis: true, noInterpretation: true, userOwnsMeaning: true, exitAlwaysAvailable: true, noMemoriesClaimed: true })
  })

  it('keeps the input out of the prompts and the storyboard', () => {
    const fragment = '张三总梦见一座房子'
    const plan = innerPlan({ fragment })
    expect(JSON.stringify(plan)).not.toContain('张三')
    expect(innerStoryboardMarkdown(plan)).not.toContain('张三')
    expect(innerStoryboardMarkdown(plan)).toContain('# Inner storyboard')
  })

  it('uses a safe default space and rejects empty input', () => {
    const plan = innerPlan({ fragment: '一种说不清的感觉' })
    expect(plan.motifs).toEqual(['corridor', 'door', 'water'])
    expect(plan.figure).toBe('shadow')
    expect(() => innerPlan({ fragment: '   ' })).toThrow()
  })

  it('creates a space without a required arc, figure or ending', () => {
    const space = innerSpace({ fragment: '一片有水的空地，远处有一扇门。', feeling: 'calm' })
    expect(space.format).toBe('space')
    expect(space.durationSec).toBe(180)
    expect(space.figure).toBe('none')
    expect(space.beats).toEqual([{ startSec: 0, endSec: 180, action: 'pause', intent: '可以待着；没有必须发生的事' }])
    expect(space.prompts.figure).toContain('No figure is required')
    expect(space.prompts.camera).toContain('no required arc')
    expect(innerStoryboardMarkdown(space)).toContain('- 形式：space')
    expect(innerStoryboardMarkdown(space)).toContain('| 0–180s | pause |')
  })

  it('changes atmosphere without turning a feeling into a diagnosis', () => {
    const calm = innerPlan({ fragment: '一片田野', feeling: 'calm' })
    const anger = innerPlan({ fragment: '一片田野', feeling: 'anger' })
    expect(calm.prompts.light).not.toBe(anger.prompts.light)
    expect(JSON.stringify(anger)).not.toMatch(/depressed|anxious|trauma|disorder/i)
  })
})

it('creates a local inner encounter from the default entry without a server round trip', async () => {
  const { createInnerEncounter } = await import('./inner-encounter')
  const encounter = createInnerEncounter({ fragment: '一条走廊尽头有一扇门', feeling: 'unease' })
  expect(encounter.rendererKind).toBe('symbolic')
  expect(encounter.id.startsWith('demo-inner-')).toBe(true)
  expect(encounter.innerPlan?.format).toBe('encounter')
  expect(encounter.plan).toMatchObject({ version: 'episode-plan-v1', kind: 'inner', rendererKind: 'symbolic' })
  const space = createInnerEncounter({ fragment: '一片有水的空地', format: 'space' })
  expect(space.innerPlan?.format).toBe('space')
  expect(space.durationSec).toBe(180)
})
