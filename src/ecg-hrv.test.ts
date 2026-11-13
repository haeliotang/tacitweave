// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { computeEcgHrv, detectRPeaks } from './ecg-hrv'

function synthetic(sampleRate = 250, seconds = 10, interval = 1) {
  const samples = new Array<number>(sampleRate * seconds).fill(0)
  for (let time = 0; time < seconds; time += interval) {
    const center = Math.round(time * sampleRate)
    for (let offset = -3; offset <= 3; offset += 1) {
      const index = center + offset
      if (index >= 0 && index < samples.length) samples[index] = Math.exp(-(offset * offset) / 2) * 1000
    }
  }
  return samples
}

describe('ECG R-peak/HRV extractor', () => {
  it('detects synthetic impulses at approximately the expected rate', () => {
    const peaks = detectRPeaks(synthetic(250, 10, 1), 250)
    expect(peaks.length).toBeGreaterThanOrEqual(9)
    expect(peaks.length).toBeLessThanOrEqual(11)
    const hrv = computeEcgHrv(synthetic(250, 10, 1), 250)
    expect(hrv.heartRateBpm).toBeGreaterThan(55)
    expect(hrv.heartRateBpm).toBeLessThan(65)
    expect(hrv.sdnnMs).not.toBeNull()
  })

  it('returns null/empty for too-short or flat signals', () => {
    expect(detectRPeaks([1, 2, 3], 250)).toEqual([])
    const hrv = computeEcgHrv(new Array(2500).fill(0), 250)
    expect(hrv.peaks).toEqual([])
    expect(hrv.heartRateBpm).toBeNull()
  })
})
