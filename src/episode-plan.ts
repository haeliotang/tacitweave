// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { InnerPlan } from './inner'

/** A single plan envelope for symbolic episodes. */
export type EpisodePlan = {
  version: 'episode-plan-v1'
  kind: 'inner'
  rendererKind: 'symbolic'
  inner: InnerPlan
}
