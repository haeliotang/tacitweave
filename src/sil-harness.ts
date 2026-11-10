// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { buildReplayPackets, parseReplaySamples, type ReplaySample } from './bci3-replay'
import { createSignalSession } from './signal-session'
import { dedupeSignalSamples } from './signal-source'
import type { SignalSample, SignalTimeline } from './signal-source'

/**
 * Software-in-the-Loop harness. It exercises the bridge's deterministic replay
 * and summarisation path without claiming real hardware. Rename to HIL only
 * when a real device is in the loop.
 */
export interface SilScenarioInput {
  id: string
  description: string
  lines: string[]
  jitterMs?: number
  dropEvery?: number
  dropBlock?: readonly [number, number]
  seed?: number
  expected: {
    parsedSamples: number
    rejectedLines: number
    deliveredSamples: number
    maxGapMs: number | null
    gapsOverOneSecond: number
  }
}

export interface SilCheck {
  name: string
  expected: string
  actual: string
  passed: boolean
}

export interface SilResult {
  id: string
  description: string
  passed: boolean
  checks: SilCheck[]
  deliveredPackets: number
  deliveredSamples: number
}

function sampleLines(): string[] {
  return Array.from({ length: 10 }, (_, index) => JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 60 + index, tMs: index * 1000 }))
}

export const silScenarios: SilScenarioInput[] = [
  {
    id: 'clean-1hz',
    description: '10 clean 1 Hz samples; no loss',
    lines: sampleLines(),
    expected: { parsedSamples: 10, rejectedLines: 0, deliveredSamples: 10, maxGapMs: 1000, gapsOverOneSecond: 0 },
  },
  {
    id: 'jitter-20ms',
    description: 'deterministic +/-20 ms jitter preserves all samples',
    lines: sampleLines(),
    jitterMs: 20,
    seed: 7,
    expected: { parsedSamples: 10, rejectedLines: 0, deliveredSamples: 10, maxGapMs: 1000, gapsOverOneSecond: 0 },
  },
  {
    id: 'drop-every-third',
    description: 'drop every third packet; gaps become visible',
    lines: sampleLines(),
    dropEvery: 3,
    expected: { parsedSamples: 10, rejectedLines: 0, deliveredSamples: 7, maxGapMs: 2000, gapsOverOneSecond: 3 },
  },
  {
    id: 'outage-block',
    description: 'three consecutive packets missing; one >1 s gap',
    lines: sampleLines(),
    dropBlock: [4, 6],
    expected: { parsedSamples: 10, rejectedLines: 0, deliveredSamples: 7, maxGapMs: 4000, gapsOverOneSecond: 1 },
  },
  {
    id: 'out-of-order-and-duplicate',
    description: 'out-of-order and duplicate input is sorted and deduplicated',
    lines: [
      JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 61, tMs: 1000 }),
      JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 60, tMs: 0 }),
      JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 61, tMs: 1000 }),
      JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 62, tMs: 2000 }),
    ],
    expected: { parsedSamples: 4, rejectedLines: 0, deliveredSamples: 3, maxGapMs: 1000, gapsOverOneSecond: 0 },
  },
  {
    id: 'invalid-line',
    description: 'invalid JSONL line is rejected, not guessed',
    lines: [JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 60, tMs: 0 }), '{bad', JSON.stringify({ type: 'sample', kind: 'not_a_signal', value: 1, tMs: 1000 })],
    expected: { parsedSamples: 1, rejectedLines: 2, deliveredSamples: 1, maxGapMs: null, gapsOverOneSecond: 0 },
  },
]

function check(name: string, expected: unknown, actual: unknown): SilCheck {
  return { name, expected: String(expected), actual: String(actual), passed: Object.is(expected, actual) }
}

function buildTimeline(samples: ReplaySample[], sourceId: string): SignalTimeline {
  const signalSamples: SignalSample[] = samples.map(sample => ({ ...sample, sourceId }))
  const start = Date.parse('2026-01-01T00:00:00.000Z')
  return {
    version: 'signal-timeline-v1',
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(start + (samples.at(-1)?.tMs ?? 0)).toISOString(),
    samples: signalSamples,
    sources: [sourceId],
    simulated: true,
  }
}

export function runSilScenario(scenario: SilScenarioInput): SilResult {
  const parsed = parseReplaySamples(scenario.lines.join('\n'))
  const packets = buildReplayPackets(parsed.samples, {
    sourceId: 'sil-virtual-device',
    jitterMs: scenario.jitterMs ?? 0,
    dropEvery: scenario.dropEvery ?? 0,
    seed: scenario.seed ?? 1,
  }).map((packet, index) => ({
    ...packet,
    dropped: packet.dropped || Boolean(scenario.dropBlock && index >= scenario.dropBlock[0] && index <= scenario.dropBlock[1]),
  }))
  const deliveredPackets = packets.filter(packet => !packet.dropped)
  const deliveredSamples = dedupeSignalSamples(deliveredPackets.flatMap(packet => packet.packet.samples.map(sample => ({ ...sample, sourceId: 'sil-virtual-device' }))))
  const timeline = buildTimeline(deliveredSamples, 'sil-virtual-device')
  const session = createSignalSession(timeline, '2026-01-01T00:00:01.000Z', `sil-${scenario.id}`)
  const checks = [
    check('parsedSamples', scenario.expected.parsedSamples, parsed.samples.length),
    check('rejectedLines', scenario.expected.rejectedLines, parsed.rejected),
    check('deliveredSamples', scenario.expected.deliveredSamples, deliveredSamples.length),
    check('maxGapMs', scenario.expected.maxGapMs, session.summary.quality?.maxGapMs ?? null),
    check('gapsOverOneSecond', scenario.expected.gapsOverOneSecond, session.summary.quality?.gapsOverOneSecond ?? 0),
  ]
  return {
    id: scenario.id,
    description: scenario.description,
    passed: checks.every(item => item.passed),
    checks,
    deliveredPackets: deliveredPackets.length,
    deliveredSamples: deliveredSamples.length,
  }
}

export function runSilSuite(): SilResult[] {
  return silScenarios.map(runSilScenario)
}
