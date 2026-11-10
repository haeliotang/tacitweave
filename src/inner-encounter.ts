// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Encounter } from './encounter'
import { innerPlan, innerPlanFromCapture, innerSpace, type InnerFeeling, type InnerFormat } from './inner'
import type { SomaticCapture } from './somatic'

// Local, synthetic entry points for the symbolic-space prototype. They never
// contain personal material and never call a model.
export function demoInnerEncounter(): Encounter {
  const inner = innerPlan({ fragment: '我总梦见一条走廊尽头有一扇门，门外是水。', feeling: 'unease' })
  return {
    id: 'demo-inner',
    seed: 1,
    durationSec: 75,
    createdAt: new Date().toISOString(),
    rendererKind: 'symbolic',
    innerPlan: inner,
    plan: { version: 'episode-plan-v1', kind: 'inner', rendererKind: 'symbolic', inner },
  }
}

export function demoInnerSpaceEncounter(): Encounter {
  const inner = innerSpace({ fragment: '一片有水的空地，远处有一扇门。', feeling: 'calm' })
  return {
    id: 'demo-inner-space',
    seed: 2,
    durationSec: 180,
    createdAt: new Date().toISOString(),
    rendererKind: 'symbolic',
    innerPlan: inner,
    plan: { version: 'episode-plan-v1', kind: 'inner', rendererKind: 'symbolic', inner },
  }
}

export function createInnerEncounter(input: { fragment: string; feeling?: InnerFeeling; format?: InnerFormat }): Encounter {
  const inner = input.format === 'space'
    ? innerSpace({ fragment: input.fragment, feeling: input.feeling })
    : innerPlan({ fragment: input.fragment, feeling: input.feeling })
  return {
    id: `demo-inner-${crypto.randomUUID()}`,
    seed: Math.floor(Math.random() * 0xffffffff),
    durationSec: inner.durationSec,
    createdAt: new Date().toISOString(),
    rendererKind: 'symbolic',
    innerPlan: inner,
    plan: { version: 'episode-plan-v1', kind: 'inner', rendererKind: 'symbolic', inner },
  }
}

export function createInnerCaptureEncounter(capture: SomaticCapture): Encounter {
  const inner = innerPlanFromCapture(capture)
  return {
    id: `demo-inner-${crypto.randomUUID()}`,
    seed: Math.floor(Math.random() * 0xffffffff),
    durationSec: inner.durationSec,
    createdAt: new Date().toISOString(),
    rendererKind: 'symbolic',
    innerPlan: inner,
    plan: { version: 'episode-plan-v1', kind: 'inner', rendererKind: 'symbolic', inner },
  }
}
