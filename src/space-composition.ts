// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { InnerFigure, InnerFormat, InnerMotif, InnerPlan } from './inner'

export interface SpaceComposition {
  motifs: InnerMotif[]
  figure: InnerFigure
  durationSec: 75 | 180 | 'open'
}

export function composeInnerPlan(base: InnerPlan, composition: SpaceComposition): InnerPlan {
  const motifs = [...new Set(composition.motifs)].slice(0, 3)
  if (!motifs.length) throw new Error('choose_at_least_one_motif')
  if (composition.durationSec !== 75 && composition.durationSec !== 180 && composition.durationSec !== 'open') throw new Error('invalid_duration')
  const format: InnerFormat = composition.durationSec === 'open' ? 'open' : composition.durationSec === 180 ? 'space' : 'encounter'
  const totalSeconds = composition.durationSec === 'open' ? 180 : composition.durationSec
  const figure = composition.figure
  const figurePrompt = figure === 'none'
    ? 'No figure is required. The space can stay empty of figures; no presence is implied.'
    : `A ${figure} presence at the edge of the space; it does not speak, judge, or explain. No real-person likeness, no identity, no diagnosis.`
  return {
    ...base,
    format,
    durationSec: totalSeconds,
    motifs,
    figure,
    prompts: {
      ...base.prompts,
      space: `A symbolic, dreamlike space built from: ${motifs.join(', ')}. Not a literal location; no readable text, no maps, no labels.`,
      figure: figurePrompt,
    },
    beats: format === 'space' || format === 'open'
      ? [{ startSec: 0, endSec: totalSeconds, action: 'pause', intent: '可以待着；没有必须发生的事' }]
      : base.beats.map(beat => ({ ...beat })),
  }
}
