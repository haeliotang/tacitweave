// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { grantLocalSignalConsent } from './somatic-signal'
import { dedupeSignalSamples, mergeSignalTraces, reconcileSignalSamples, SimulatedSignalSource, summarizeTimeline, traceToTimeline, type SignalTrace } from './signal-source'

const consent = grantLocalSignalConsent('2026-11-01T00:00:00Z')

function trace(sourceId: string, startedAt: string, endedAt: string, tMs: number[]): SignalTrace {
  return {
    version: 'signal-trace-v1', sourceId, startedAt, endedAt, consent, simulated: true,
    samples: tMs.map(value => ({ tMs: value, kind: 'heart_rate', value: 60, unit: 'bpm', sourceId })),
  }
}

describe('signal source layer', () => {
  it('exposes a clearly simulated LSL-like source', () => {
    const source = new SimulatedSignalSource()
    expect(source.capabilities).toMatchObject({ simulated: true, localOnly: true, requiresPermission: false })
    expect(source.capabilities.kinds).toContain('heart_rate')
    expect(() => source.start({ ...consent, localOnly: false } as unknown as typeof consent)).toThrow()
  })

  it('aligns samples from traces with different starts', () => {
    const timeline = mergeSignalTraces([
      trace('a', '2026-11-01T00:00:00Z', '2026-11-01T00:00:02Z', [0, 1000, 2000]),
      trace('b', '2026-11-01T00:00:01Z', '2026-11-01T00:00:03Z', [0, 1000]),
    ])
    expect(timeline.samples.map(sample => sample.tMs)).toEqual([0, 1000, 1000, 2000, 2000])
    expect(timeline.sources).toEqual(['a', 'b'])
    expect(timeline.simulated).toBe(true)
    expect(summarizeTimeline(traceToTimeline(trace('a', '2026-11-01T00:00:00Z', '2026-11-01T00:00:02Z', [0, 1000, 2000])))).toMatchObject({ sampleCount: 3, durationSec: 2, simulated: true })
  })
})


describe('signal timeline deduplication', () => {
  it('drops exact replay/reconnect duplicates while preserving distinct samples', () => {
    const samples = [
      { tMs: 100, kind: 'heart_rate' as const, value: 60, sourceId: 'a' },
      { tMs: 100, kind: 'heart_rate' as const, value: 60, sourceId: 'a' },
      { tMs: 100, kind: 'heart_rate' as const, value: 61, sourceId: 'a' },
    ]
    expect(dedupeSignalSamples([...samples].reverse())).toEqual([samples[0], samples[2]])
  })
})

describe('signal reconciliation identity', () => {
  it('marks conflicting payloads with the same stream identity instead of treating them as new observations', () => {
    const base = { tMs: 1000, kind: 'heart_rate' as const, sourceId: 'device', streamId: 'stream-1', seq: 7 }
    const result = reconcileSignalSamples([
      { ...base, value: 70 },
      { ...base, value: 71 },
    ])
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0]).toMatchObject({ reason: 'same_identity_different_payload' })
  })

  it('uses exact content deduplication as the documented fallback when no sequence identity exists', () => {
    const sample = { tMs: 1000, kind: 'eda' as const, value: 2.1, sourceId: 'device' }
    expect(reconcileSignalSamples([sample, { ...sample }])).toMatchObject({ samples: [sample], conflicts: [] })
  })
})

describe('signal identity gate', () => {
  const base = { tMs: 1000, sourceId: 'device', streamId: 'stream-1', seq: 9 }
  it('blocks traceToTimeline when the same identity carries conflicting payloads', () => {
    const trace: SignalTrace = {
      version: 'signal-trace-v1', sourceId: 'device', startedAt: '2026-11-01T00:00:00.000Z', endedAt: '2026-11-01T00:00:01.000Z',
      consent, simulated: false,
      samples: [{ ...base, kind: 'heart_rate', value: 70 }, { ...base, kind: 'heart_rate', value: 71 }],
    }
    expect(() => traceToTimeline(trace)).toThrow('signal_identity_conflict')
  })

  it('allows same frame sequence on different channels', () => {
    const trace: SignalTrace = {
      version: 'signal-trace-v1', sourceId: 'device', startedAt: '2026-11-01T00:00:00.000Z', endedAt: '2026-11-01T00:00:01.000Z',
      consent, simulated: false,
      samples: [{ ...base, kind: 'heart_rate', channel: 'ecg', value: 70 }, { ...base, kind: 'eda', channel: 'eda', value: 2.1 }],
    }
    expect(traceToTimeline(trace).samples).toHaveLength(2)
  })

  it('treats different channels at the same sequence as independent samples', () => {
    const { conflicts, samples } = reconcileSignalSamples([
      { ...base, kind: 'heart_rate', channel: 'ecg-1', value: 70 },
      { ...base, kind: 'heart_rate', channel: 'ecg-2', value: 71 },
    ])
    expect(conflicts).toHaveLength(0)
    expect(samples).toHaveLength(2)
  })
})
