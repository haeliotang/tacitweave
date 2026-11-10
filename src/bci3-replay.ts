// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SignalKind } from './signal-source'

export interface ReplaySample {
  tMs: number
  kind: SignalKind
  value?: number
  unit?: string
  label?: string
}

export interface ReplayPacket {
  packet: { type: 'samples'; sourceId: string; samples: ReplaySample[] }
  delayMs: number
  dropped: boolean
}

const kinds = new Set<SignalKind>(['heart_rate', 'eda', 'breath_phase', 'voice_energy', 'body_event', 'imagery_event', 'relationship_event'])

/** Parse a JSONL recording of bridge samples; invalid lines are rejected, not guessed. */
export function parseReplaySamples(text: string): { samples: ReplaySample[]; rejected: number } {
  const samples: ReplaySample[] = []
  let rejected = 0
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const value: unknown = JSON.parse(line)
      if (!value || typeof value !== 'object') { rejected++; continue }
      const record = value as Partial<ReplaySample>
      if (!Number.isInteger(record.tMs) || (record.tMs ?? -1) < 0 || typeof record.kind !== 'string' || !kinds.has(record.kind as SignalKind)) { rejected++; continue }
      if (record.value !== undefined && (typeof record.value !== 'number' || !Number.isFinite(record.value))) { rejected++; continue }
      samples.push({
        tMs: record.tMs!,
        kind: record.kind as SignalKind,
        ...(record.value !== undefined ? { value: record.value } : {}),
        ...(typeof record.unit === 'string' ? { unit: record.unit } : {}),
        ...(typeof record.label === 'string' ? { label: record.label } : {}),
      })
    } catch {
      rejected += 1
    }
  }
  samples.sort((left, right) => left.tMs - right.tMs)
  return { samples, rejected }
}

/** Deterministic jitter in [-jitterMs, jitterMs], so replays are reproducible. */
export function jitterFor(index: number, jitterMs: number, seed = 1): number {
  if (jitterMs <= 0) return 0
  const value = Math.sin((index + 1) * 12.9898 + seed * 78.233) * 43758.5453
  const fraction = value - Math.floor(value)
  return Math.round((fraction * 2 - 1) * jitterMs)
}

/** Build packet timing from a recording without sleeping. */
export function buildReplayPackets(samples: readonly ReplaySample[], options: { sourceId: string; speed?: number; jitterMs?: number; dropEvery?: number; seed?: number }): ReplayPacket[] {
  const speed = options.speed ?? 1
  const jitterMs = options.jitterMs ?? 0
  const dropEvery = options.dropEvery ?? 0
  const seed = options.seed ?? 1
  if (!(speed > 0)) throw new Error('speed_must_be_positive')
  if (jitterMs < 0) throw new Error('jitter_must_be_nonnegative')
  if (!Number.isInteger(dropEvery) || dropEvery < 0) throw new Error('drop_every_must_be_nonnegative_integer')
  let previousTarget = 0
  return samples.map((sample, index) => {
    const dropped = dropEvery > 0 && (index + 1) % dropEvery === 0
    const target = sample.tMs / speed + jitterFor(index, jitterMs, seed)
    const delayMs = Math.max(0, Math.round(target - previousTarget))
    previousTarget += delayMs
    return { packet: { type: 'samples', sourceId: options.sourceId, samples: [{ ...sample }] }, delayMs, dropped }
  })
}
