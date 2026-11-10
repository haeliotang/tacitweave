// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { isSignalConsent, type SignalConsent } from './somatic-signal'

export type SignalOrigin = 'simulated' | 'hardware' | 'unknown'

export type SignalKind = 'heart_rate' | 'eda' | 'breath_phase' | 'voice_energy' | 'body_event' | 'imagery_event' | 'relationship_event'

export interface SignalSample {
  /** Milliseconds from the start of the timeline. */
  tMs: number
  kind: SignalKind
  value?: number
  unit?: string
  label?: string
  /** Stable stream identity for reconnect-aware deduplication. */
  streamId?: string
  /** Monotonic sequence within a stream, if the device supplies it; scope is sample-level within stream. */
  seq?: number
  /** Physical/logical channel name when multiple channels share a sequence. */
  channel?: string
  sourceId: string
}

export interface SignalSourceCapabilities {
  kinds: SignalKind[]
  sampleRateHz?: number
  requiresPermission: boolean
  rawSignal: boolean
  localOnly: true
  simulated: boolean
}

export interface SignalTrace {
  version: 'signal-trace-v1'
  sourceId: string
  startedAt: string
  endedAt: string
  consent: SignalConsent
  samples: SignalSample[]
  simulated: boolean
  /** Conservative provenance; unknown is not hardware. */
  origin?: SignalOrigin
  devicePseudonym?: string
  adapterVersion?: string
  streamId?: string
}

export interface SignalSource {
  id: string
  label: string
  capabilities: SignalSourceCapabilities
  start(consent: SignalConsent): void
  stop(): SignalTrace
  subscribe(listener: (sample: SignalSample) => void): () => void
}

export interface SignalTimeline {
  version: 'signal-timeline-v1'
  startedAt: string
  endedAt: string
  samples: SignalSample[]
  sources: string[]
  simulated: boolean
  origin?: SignalOrigin
  devicePseudonym?: string
  adapterVersion?: string
  streamId?: string
}

function assertLocalConsent(consent: SignalConsent) {
  if (!isSignalConsent(consent)) throw new Error('local_signal_consent_required')
}

function sampleKey(sample: SignalSample) {
  return `${sample.sourceId}\u0000${sample.streamId ?? ''}\u0000${sample.seq ?? ''}\u0000${sample.channel ?? sample.kind}\u0000${sample.tMs}\u0000${sample.kind}\u0000${sample.value ?? ''}\u0000${sample.unit ?? ''}\u0000${sample.label ?? ''}`
}

/** Sort and remove exact duplicate samples, which can occur after a bridge replay/reconnect. */
export function dedupeSignalSamples(samples: readonly SignalSample[]): SignalSample[] {
  const seen = new Set<string>()
  return [...samples]
    .sort((left, right) => left.tMs - right.tMs
      || (left.sourceId < right.sourceId ? -1 : left.sourceId > right.sourceId ? 1 : 0)
      || (left.kind < right.kind ? -1 : left.kind > right.kind ? 1 : 0)
      || (left.value ?? -Infinity) - (right.value ?? -Infinity)
      || ((left.label ?? '') < (right.label ?? '') ? -1 : (left.label ?? '') > (right.label ?? '') ? 1 : 0))
    .filter(sample => {
      const key = sampleKey(sample)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export interface SignalConflict {
  identity: string
  reason: 'same_identity_different_payload'
  samples: SignalSample[]
}

export interface SignalReconciliation {
  samples: SignalSample[]
  conflicts: SignalConflict[]
}

function stableSignalIdentity(sample: SignalSample): string | null {
  if (!sample.streamId || !Number.isInteger(sample.seq)) return null
  return `${sample.sourceId}\u0000${sample.streamId}\u0000${sample.seq}\u0000${sample.channel ?? sample.kind}`
}

function contentKey(sample: SignalSample): string {
  return `${sample.tMs}\u0000${sample.kind}\u0000${sample.value ?? ''}\u0000${sample.unit ?? ''}\u0000${sample.label ?? ''}`
}

/**
 * Reconcile replay/reconnect samples.
 *
 * - Exact duplicates are removed.
 * - With a stable streamId+seq identity, a second sample carrying different
 *   content is a conflict, not a new independent observation.
 * - Without stable identity, exact content equality is the documented
 *   degraded fallback; callers must state that limitation.
 */
export function reconcileSignalSamples(samples: readonly SignalSample[]): SignalReconciliation {
  const unique = dedupeSignalSamples(samples)
  const conflicts: SignalConflict[] = []
  const byIdentity = new Map<string, SignalSample[]>()
  for (const sample of unique) {
    const identity = stableSignalIdentity(sample)
    if (!identity) continue
    const group = byIdentity.get(identity)
    if (group) group.push(sample)
    else byIdentity.set(identity, [sample])
  }
  for (const [identity, group] of byIdentity) {
    const contents = new Set(group.map(contentKey))
    if (contents.size > 1) conflicts.push({ identity: identity.replaceAll('\u0000', '/'), reason: 'same_identity_different_payload', samples: group })
  }
  return { samples: unique, conflicts }
}

export function traceToTimeline(trace: SignalTrace): SignalTimeline {
  const reconciled = reconcileSignalSamples(trace.samples)
  if (reconciled.conflicts.length) throw new Error('signal_identity_conflict')
  return {
    version: 'signal-timeline-v1',
    startedAt: trace.startedAt,
    endedAt: trace.endedAt,
    samples: reconciled.samples,
    sources: [...new Set(reconciled.samples.map(sample => sample.sourceId))],
    simulated: trace.origin ? trace.origin !== 'hardware' : trace.simulated,
    ...(trace.origin ? { origin: trace.origin } : {}),
    ...(trace.devicePseudonym ? { devicePseudonym: trace.devicePseudonym } : {}),
    ...(trace.adapterVersion ? { adapterVersion: trace.adapterVersion } : {}),
    ...(trace.streamId ? { streamId: trace.streamId } : {}),
  }
}

export function mergeSignalTraces(traces: SignalTrace[]): SignalTimeline {
  if (!traces.length) throw new Error('no_signal_traces')
  const start = Math.min(...traces.map(trace => Date.parse(trace.startedAt)))
  const end = Math.max(...traces.map(trace => Date.parse(trace.endedAt)))
  const samples = traces.flatMap(trace => {
    const offset = Date.parse(trace.startedAt) - start
    return trace.samples.map(sample => ({ ...sample, tMs: sample.tMs + offset }))
  })
  const reconciled = reconcileSignalSamples(samples)
  if (reconciled.conflicts.length) throw new Error('signal_identity_conflict')
  return {
    version: 'signal-timeline-v1',
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(end).toISOString(),
    samples: reconciled.samples,
    sources: [...new Set(reconciled.samples.map(sample => sample.sourceId))],
    simulated: traces.some(trace => trace.simulated) || traces.some(trace => trace.origin !== 'hardware'),
    origin: traces.every(trace => trace.origin === 'hardware') ? 'hardware' : traces.some(trace => trace.origin === 'simulated') ? 'simulated' : 'unknown',
    ...(traces.find(trace => trace.devicePseudonym)?.devicePseudonym ? { devicePseudonym: traces.find(trace => trace.devicePseudonym)!.devicePseudonym } : {}),
    ...(traces.find(trace => trace.adapterVersion)?.adapterVersion ? { adapterVersion: traces.find(trace => trace.adapterVersion)!.adapterVersion } : {}),
    ...(traces.find(trace => trace.streamId)?.streamId ? { streamId: traces.find(trace => trace.streamId)!.streamId } : {}),
  }
}
/**
 * Deterministic LSL-like simulator. It is deliberately labelled simulated and
 * must never be presented as physiological data from a person.
 */
export class SimulatedSignalSource implements SignalSource {
  readonly id = 'lsl-simulator'
  readonly label = 'LSL 时间轴模拟器'
  readonly capabilities: SignalSourceCapabilities = {
    kinds: ['heart_rate', 'eda', 'breath_phase'],
    sampleRateHz: 10,
    requiresPermission: false,
    rawSignal: false,
    localOnly: true,
    simulated: true,
  }

  private consent: SignalConsent | null = null
  private startedAt = 0
  private timer: number | null = null
  private samples: SignalSample[] = []
  private listeners = new Set<(sample: SignalSample) => void>()

  start(consent: SignalConsent) {
    assertLocalConsent(consent)
    if (this.timer !== null) return
    this.consent = consent
    this.startedAt = Date.now()
    this.samples = []
    this.timer = window.setInterval(() => {
      const elapsedMs = Date.now() - this.startedAt
      const tSec = elapsedMs / 1000
      const tick = Math.floor(elapsedMs / 100)
      const heartRate = 64 + Math.sin(tick / 9) * 3 + Math.sin(tick / 23) * 2
      const eda = 2.2 + Math.sin(tick / 13) * 0.35
      const breathPhase = (Math.sin(tick / 7) + 1) / 2
      const samples: SignalSample[] = [
        { tMs: elapsedMs, kind: 'heart_rate', value: Number(heartRate.toFixed(2)), unit: 'bpm', sourceId: this.id },
        { tMs: elapsedMs, kind: 'eda', value: Number(eda.toFixed(3)), unit: 'uS', sourceId: this.id },
        { tMs: elapsedMs, kind: 'breath_phase', value: Number(breathPhase.toFixed(3)), label: breathPhase > .5 ? 'inhale' : 'exhale', sourceId: this.id },
      ]
      this.samples.push(...samples)
      for (const sample of samples) for (const listener of this.listeners) listener(sample)
      if (tSec > 15) this.stop()
    }, 100)
  }

  stop(): SignalTrace {
    if (this.timer !== null) { window.clearInterval(this.timer); this.timer = null }
    if (!this.consent) throw new Error('signal_source_not_started')
    return {
      version: 'signal-trace-v1',
      sourceId: this.id,
      startedAt: new Date(this.startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      consent: this.consent,
      samples: [...this.samples],
      simulated: true,
    }
  }

  subscribe(listener: (sample: SignalSample) => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
}

export function summarizeTimeline(timeline: SignalTimeline) {
  const byKind = new Map<SignalKind, number>()
  for (const sample of timeline.samples) byKind.set(sample.kind, (byKind.get(sample.kind) ?? 0) + 1)
  return {
    durationSec: Math.max(0, Math.round((Date.parse(timeline.endedAt) - Date.parse(timeline.startedAt)) / 1000)),
    sampleCount: timeline.samples.length,
    byKind: [...byKind.entries()].map(([kind, count]) => ({ kind, count })),
    simulated: timeline.simulated,
  }
}
