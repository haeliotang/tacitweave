// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { buildReplayPackets, jitterFor, parseReplaySamples } from './bci3-replay'

describe('BCI-3 replay fixture', () => {
  it('parses valid JSONL and rejects malformed samples', () => {
    const parsed = parseReplaySamples([
      '{"tMs":100,"kind":"heart_rate","value":66}',
      '{"tMs":-1,"kind":"heart_rate"}',
      '{"tMs":200,"kind":"unknown"}',
      'not json',
      '{"tMs":200,"kind":"eda","value":2.1}',
    ].join('\n'))
    expect(parsed.samples).toEqual([{ tMs: 100, kind: 'heart_rate', value: 66 }, { tMs: 200, kind: 'eda', value: 2.1 }])
    expect(parsed.rejected).toBe(3)
  })

  it('builds deterministic timing, jitter and drops', () => {
    const samples = [{ tMs: 0, kind: 'heart_rate' as const }, { tMs: 100, kind: 'eda' as const }, { tMs: 200, kind: 'breath_phase' as const }]
    const packets = buildReplayPackets(samples, { sourceId: 'replay', jitterMs: 25, dropEvery: 2, seed: 4 })
    expect(packets).toHaveLength(3)
    expect(packets[1].dropped).toBe(true)
    expect(packets[0].delayMs).toBeGreaterThanOrEqual(0)
    expect(jitterFor(3, 25, 4)).toBe(jitterFor(3, 25, 4))
    expect(jitterFor(3, 0, 4)).toBe(0)
    expect(() => buildReplayPackets(samples, { sourceId: 'x', speed: 0 })).toThrow()
  })
})
