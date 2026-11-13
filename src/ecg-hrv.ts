// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Minimal ECG R-peak / HRV extractor for public-data pipeline checks.
 * It is deliberately simple and must be validated against a reference
 * detector before research use. It does not diagnose or classify.
 */

export interface EcgHrvResult {
  sampleRateHz: number
  peaks: number[]
  rrIntervalsS: number[]
  heartRateBpm: number | null
  sdnnMs: number | null
  rmssdMs: number | null
  rejectedRr: number
}

function mean(values: readonly number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function sd(values: readonly number[]): number | null {
  if (values.length < 2) return null
  const average = mean(values) as number
  return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1))
}

/** Detect R peaks from absolute first-difference energy with a refractory window. */
export function detectRPeaks(samples: readonly number[], sampleRateHz = 250): number[] {
  if (samples.length < sampleRateHz * 2) return []
  const energy = new Array<number>(samples.length).fill(0)
  for (let index = 1; index < samples.length - 1; index += 1) {
    energy[index] = Math.abs(samples[index + 1] - samples[index - 1])
  }
  const sorted = [...energy].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const threshold = median + 0.35 * ((sorted[sorted.length - 1] ?? 0) - median)
  if (threshold <= 0) return []
  const refractory = Math.max(1, Math.round(sampleRateHz * 0.25))
  const peaks: number[] = []
  for (let index = 1; index < energy.length - 1; index += 1) {
    if (energy[index] <= 0 || energy[index] < threshold) continue
    if (energy[index] < energy[index - 1] || energy[index] < energy[index + 1]) continue
    const previous = peaks[peaks.length - 1]
    if (previous === undefined || index - previous >= refractory) {
      peaks.push(index)
    } else if (energy[index] > energy[previous]) {
      peaks[peaks.length - 1] = index
    }
  }
  return peaks
}

export function computeEcgHrv(samples: readonly number[], sampleRateHz = 250): EcgHrvResult {
  const peaks = detectRPeaks(samples, sampleRateHz)
  const rr: number[] = []
  let rejectedRr = 0
  for (let index = 1; index < peaks.length; index += 1) {
    const interval = (peaks[index] - peaks[index - 1]) / sampleRateHz
    if (interval >= 0.3 && interval <= 2.0) rr.push(interval)
    else rejectedRr += 1
  }
  const meanRr = mean(rr)
  const rrSd = sd(rr)
  const diffs = rr.slice(1).map((value, index) => value - rr[index])
  const rmssd = diffs.length ? Math.sqrt(diffs.reduce((sum, value) => sum + value ** 2, 0) / diffs.length) : null
  return {
    sampleRateHz,
    peaks,
    rrIntervalsS: rr,
    heartRateBpm: meanRr === null ? null : 60 / meanRr,
    sdnnMs: rrSd === null ? null : rrSd * 1000,
    rmssdMs: rmssd === null ? null : rmssd * 1000,
    rejectedRr,
  }
}
