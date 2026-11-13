// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CaptureProvenance } from './capture'
import type { InnerPlan } from './inner'
import type { EpisodePlan } from './episode-plan'

export type RendererKind = 'genie4' | 'marble' | 'captured' | 'symbolic'

export type SymbolicAgencyAction = 'approach' | 'stay' | 'resume' | 'leave' | 'reenter' | 'extend'

export interface SymbolicAgencyEvent {
  atSec: number
  action: SymbolicAgencyAction
  /** For `extend`, the new total duration chosen by the user. */
  durationSec?: number
}

export interface Encounter {
  id: string
  seed: number
  durationSec: number
  createdAt: string
  rendererKind?: RendererKind
  manifestHash?: string
  manifestVerified?: boolean
  capture?: CaptureProvenance
  innerPlan?: InnerPlan
  plan?: EpisodePlan
  /** User-authored agency events from the symbolic renderer. */
  agency?: SymbolicAgencyEvent[]
  /** Optional local motif this encounter was opened from; not a psychological link. */
  motifId?: string
}
