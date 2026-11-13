// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Descriptive lag-1 autocorrelation for LSM-0 time series. The pre-registration
 * draft uses a provisional median-|AR| threshold; this helper makes the
 * calculation explicit and testable, but the threshold is not yet frozen.
 */

export function lagOneAutocorrelation(values: readonly number[]): number | null {
  if (values.length < 4 || values.some(value => !Number.isFinite(value))) return null
  const left = values.slice(0, -1)
  const right = values.slice(1)
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length
  let covariance = 0
  let leftVariance = 0
  let rightVariance = 0
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] - leftMean
    const b = right[index] - rightMean
    covariance += a * b
    leftVariance += a * a
    rightVariance += b * b
  }
  if (leftVariance === 0 || rightVariance === 0) return null
  return covariance / Math.sqrt(leftVariance * rightVariance)
}

export interface AutocorrelationSummary {
  participants: number
  medianAbsoluteLagOne: number | null
  values: Array<{ participantCode: string; lagOne: number | null }>
}

/** Summarize per-participant lag-1 AR; median absolute value drives the draft threshold. */
export function summarizeLagOneAutocorrelation(series: ReadonlyArray<{ participantCode: string; values: readonly number[] }>): AutocorrelationSummary {
  const values = series.map(item => ({ participantCode: item.participantCode, lagOne: lagOneAutocorrelation(item.values) }))
  const usable = values.flatMap(item => item.lagOne === null ? [] : [Math.abs(item.lagOne)]).sort((a, b) => a - b)
  const median = usable.length ? (usable.length % 2 ? usable[(usable.length - 1) / 2] : (usable[usable.length / 2 - 1] + usable[usable.length / 2]) / 2) : null
  return { participants: series.length, medianAbsoluteLagOne: median, values }
}
