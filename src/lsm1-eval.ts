// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * LSM-1 synthetic evaluation contract.
 *
 * This is not a trained longitudinal model. It is a leakage-aware evaluator
 * that asks whether a direct user action A adds out-of-sample information over
 * X + H. Synthetic scenarios plant a real effect, a null effect, a derived
 * action and a temporal leak; the evaluator must distinguish them.
 */

export type Lsm1ActionSource = 'user_input' | 'system_inferred' | 'derived_from_inputs'

export interface Lsm1Row {
  participantCode: string
  sessionIndex: number
  inputAt: string
  action: number
  actionObservedAt: string
  actionSource: Lsm1ActionSource
  outcomeAt: string
  x: number[]
  history: number[]
  y: number
}

export interface Lsm1EvaluationOptions {
  trainRatio?: number
  minRelativeImprovement?: number
}

export type Lsm1Decision = 'supports_incremental' | 'no_incremental' | 'invalid'

export interface Lsm1Evaluation {
  status: 'evaluated' | 'invalid'
  reason?: 'no_rows' | 'invalid_row' | 'action_not_independent' | 'action_after_outcome' | 'temporal_split_unavailable' | 'singular_fit'
  trainRows: number
  testRows: number
  baselineMse: number | null
  fullMse: number | null
  relativeImprovement: number | null
  decision: Lsm1Decision
  limitations: string[]
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value)
}

function timestamp(value: string): number {
  return Date.parse(value)
}

function fit(rows: readonly Lsm1Row[], withAction: boolean): number[] | null {
  const rowsFeatures = rows.map(row => [...row.x, ...row.history, 1, ...(withAction ? [row.action] : [])])
  const width = rowsFeatures[0]?.length ?? 0
  if (!width || rowsFeatures.some(features => features.length !== width || features.some(value => !isFiniteNumber(value)))) return null
  const matrix = Array.from({ length: width }, () => Array.from({ length: width }, () => 0))
  const target = Array.from({ length: width }, () => 0)
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const features = rowsFeatures[rowIndex]
    for (let left = 0; left < width; left += 1) {
      target[left] += features[left] * rows[rowIndex].y
      for (let right = 0; right < width; right += 1) matrix[left][right] += features[left] * features[right]
    }
  }
  for (let index = 0; index < width; index += 1) matrix[index][index] += 1e-9
  for (let column = 0; column < width; column += 1) {
    let pivot = column
    for (let row = column + 1; row < width; row += 1) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row
    if (Math.abs(matrix[pivot][column]) < 1e-12) return null
    if (pivot !== column) {
      ;[matrix[pivot], matrix[column]] = [matrix[column], matrix[pivot]]
      ;[target[pivot], target[column]] = [target[column], target[pivot]]
    }
    const divisor = matrix[column][column]
    for (let index = column; index < width; index += 1) matrix[column][index] /= divisor
    target[column] /= divisor
    for (let row = 0; row < width; row += 1) {
      if (row === column) continue
      const factor = matrix[row][column]
      if (factor === 0) continue
      for (let index = column; index < width; index += 1) matrix[row][index] -= factor * matrix[column][index]
      target[row] -= factor * target[column]
    }
  }
  return target
}

function mse(rows: readonly Lsm1Row[], weights: readonly number[], withAction: boolean): number {
  let total = 0
  for (const row of rows) {
    const features = [...row.x, ...row.history, 1, ...(withAction ? [row.action] : [])]
    const prediction = features.reduce((sum, value, index) => sum + value * weights[index], 0)
    total += (prediction - row.y) ** 2
  }
  return total / rows.length
}

/** Evaluate a synthetic or imported longitudinal table with a fixed time split. */
export function evaluateLsm1(rows: readonly Lsm1Row[], options: Lsm1EvaluationOptions = {}): Lsm1Evaluation {
  const trainRatio = options.trainRatio ?? 2 / 3
  const minRelativeImprovement = options.minRelativeImprovement ?? 0.1
  const limitations = [
    'Synthetic/imported evaluation only; no trained LSM-1 model is produced.',
    'The split is temporal, not random; no future outcome may enter training.',
    'A direct user action is required; system-inferred and derived actions are rejected.',
    'No p-values or clinical claims are produced.',
  ]
  if (!rows.length) return { status: 'invalid', reason: 'no_rows', trainRows: 0, testRows: 0, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
  for (const row of rows) {
    if (!Number.isInteger(row.sessionIndex) || row.sessionIndex < 0 || !isFiniteNumber(row.y) || !isFiniteNumber(row.action)) {
      return { status: 'invalid', reason: 'invalid_row', trainRows: 0, testRows: 0, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
    }
    if (row.actionSource !== 'user_input') {
      return { status: 'invalid', reason: 'action_not_independent', trainRows: 0, testRows: 0, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
    }
    const inputAt = timestamp(row.inputAt)
    const actionAt = timestamp(row.actionObservedAt)
    const outcomeAt = timestamp(row.outcomeAt)
    if ([inputAt, actionAt, outcomeAt].some(value => Number.isNaN(value))) {
      return { status: 'invalid', reason: 'invalid_row', trainRows: 0, testRows: 0, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
    }
    if (actionAt < inputAt || outcomeAt <= actionAt) {
      return { status: 'invalid', reason: 'action_after_outcome', trainRows: 0, testRows: 0, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
    }
  }
  const sorted = [...rows].sort((left, right) => timestamp(left.outcomeAt) - timestamp(right.outcomeAt))
  const split = Math.floor(sorted.length * trainRatio)
  if (split < 2 || sorted.length - split < 2) {
    return { status: 'invalid', reason: 'temporal_split_unavailable', trainRows: split, testRows: sorted.length - split, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
  }
  const train = sorted.slice(0, split)
  const test = sorted.slice(split)
  if (timestamp(train[train.length - 1].outcomeAt) >= timestamp(test[0].outcomeAt)) {
    return { status: 'invalid', reason: 'temporal_split_unavailable', trainRows: train.length, testRows: test.length, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
  }
  const baselineWeights = fit(train, false)
  const fullWeights = fit(train, true)
  if (!baselineWeights || !fullWeights) {
    return { status: 'invalid', reason: 'singular_fit', trainRows: train.length, testRows: test.length, baselineMse: null, fullMse: null, relativeImprovement: null, decision: 'invalid', limitations }
  }
  const baselineMse = mse(test, baselineWeights, false)
  const fullMse = mse(test, fullWeights, true)
  const relativeImprovement = baselineMse > 0 ? (baselineMse - fullMse) / baselineMse : null
  return {
    status: 'evaluated',
    trainRows: train.length,
    testRows: test.length,
    baselineMse,
    fullMse,
    relativeImprovement,
    decision: relativeImprovement !== null && relativeImprovement >= minRelativeImprovement ? 'supports_incremental' : 'no_incremental',
    limitations,
  }
}

function lcg(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function normal(random: () => number) {
  const u = Math.max(random(), Number.EPSILON)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * random())
}

export type Lsm1SyntheticScenario = 'planted' | 'null' | 'derived_action' | 'leakage'

/** Generate a deterministic synthetic longitudinal table for evaluator tests. */
export function syntheticLsm1Rows(scenario: Lsm1SyntheticScenario, seed = 20261113): Lsm1Row[] {
  const random = lcg(seed)
  const rows: Lsm1Row[] = []
  const base = Date.parse('2026-01-01T00:00:00.000Z')
  for (let participant = 0; participant < 24; participant += 1) {
    let previousOutcome = 0
    for (let session = 0; session < 12; session += 1) {
      const x = normal(random)
      const history = previousOutcome
      const independentAction = normal(random)
      const action = scenario === 'derived_action' ? 0.8 * x + 0.1 : independentAction
      const effect = scenario === 'planted' ? 0.9 : 0
      const y = 0.4 * x + 0.2 * history + effect * action + 0.35 * normal(random)
      previousOutcome = y
      const inputAt = new Date(base + session * 86_400_000).toISOString()
      const actionAt = new Date(base + session * 86_400_000 + 1000).toISOString()
      const outcomeAt = new Date(base + session * 86_400_000 + 2000).toISOString()
      rows.push({
        participantCode: `P${String(participant + 1).padStart(2, '0')}`,
        sessionIndex: session,
        inputAt,
        action,
        actionObservedAt: scenario === 'leakage' ? new Date(base + session * 86_400_000 + 3000).toISOString() : actionAt,
        actionSource: scenario === 'derived_action' ? 'derived_from_inputs' : 'user_input',
        outcomeAt: scenario === 'leakage' ? new Date(base + session * 86_400_000 + 1500).toISOString() : outcomeAt,
        x: [x],
        history: [history],
        y,
      })
    }
  }
  return rows
}
