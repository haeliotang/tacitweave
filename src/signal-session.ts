// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { summarizeTimeline, type SignalKind, type SignalOrigin, type SignalTimeline } from './signal-source'

export interface SignalSessionSourceSummary {
  sourceId: string
  sampleCount: number
  firstMs: number
  lastMs: number
  maxGapMs: number | null
}

export interface SignalSessionQuality {
  firstSampleMs: number
  lastSampleMs: number
  maxGapMs: number | null
  gapsOverOneSecond: number
  samplesPerSecond: number
}

export interface SignalSession {
  version: 'signal-session-v1' | 'signal-session-v2'
  id: string
  createdAt: string
  startedAt: string
  endedAt: string
  sourceIds: string[]
  simulated: boolean
  origin?: SignalOrigin
  devicePseudonym?: string
  adapterVersion?: string
  summary: {
    durationSec: number
    sampleCount: number
    byKind: Array<{ kind: SignalKind; count: number }>
    bySource?: SignalSessionSourceSummary[]
    quality?: SignalSessionQuality
  }
}

export function createSignalSession(timeline: SignalTimeline, now = new Date().toISOString(), id: string = crypto.randomUUID()): SignalSession {
  const summary = summarizeTimeline(timeline)
  const ordered = [...timeline.samples].sort((left, right) => left.tMs - right.tMs)
  const bySource = [...new Set(timeline.sources)].map(sourceId => {
    const samples = ordered.filter(sample => sample.sourceId === sourceId)
    const gaps = samples.slice(1).map((sample, index) => sample.tMs - samples[index].tMs)
    return {
      sourceId,
      sampleCount: samples.length,
      firstMs: samples[0]?.tMs ?? 0,
      lastMs: samples[samples.length - 1]?.tMs ?? 0,
      maxGapMs: gaps.length ? Math.max(...gaps) : null,
    }
  })
  const gaps = ordered.slice(1).map((sample, index) => sample.tMs - ordered[index].tMs)
  const quality = {
    firstSampleMs: ordered[0]?.tMs ?? 0,
    lastSampleMs: ordered[ordered.length - 1]?.tMs ?? 0,
    maxGapMs: gaps.length ? Math.max(...gaps) : null,
    gapsOverOneSecond: gaps.filter(gap => gap > 1000).length,
    samplesPerSecond: summary.durationSec > 0 ? Number((summary.sampleCount / summary.durationSec).toFixed(3)) : 0,
  }
  return {
    version: 'signal-session-v2',
    id,
    createdAt: now,
    startedAt: timeline.startedAt,
    endedAt: timeline.endedAt,
    sourceIds: [...timeline.sources],
    simulated: timeline.simulated,
    ...(timeline.origin ? { origin: timeline.origin } : {}),
    ...(timeline.devicePseudonym ? { devicePseudonym: timeline.devicePseudonym } : {}),
    ...(timeline.adapterVersion ? { adapterVersion: timeline.adapterVersion } : {}),
    summary: { durationSec: summary.durationSec, sampleCount: summary.sampleCount, byKind: summary.byKind, bySource, quality },
  }
}

export function isSignalSession(value: unknown): value is SignalSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<SignalSession>
  return (session.version === 'signal-session-v1' || session.version === 'signal-session-v2')
    && typeof session.id === 'string' && session.id.length > 0
    && typeof session.createdAt === 'string' && !Number.isNaN(Date.parse(session.createdAt))
    && typeof session.startedAt === 'string' && !Number.isNaN(Date.parse(session.startedAt))
    && typeof session.endedAt === 'string' && !Number.isNaN(Date.parse(session.endedAt))
    && Array.isArray(session.sourceIds) && session.sourceIds.every(source => typeof source === 'string')
    && typeof session.simulated === 'boolean'
    && Boolean(session.summary)
    && typeof session.summary?.durationSec === 'number'
    && typeof session.summary?.sampleCount === 'number'
    && Array.isArray(session.summary?.byKind)
    && (session.version === 'signal-session-v1' || (Array.isArray(session.summary.bySource) && session.summary.bySource.every(source => typeof source.sourceId === 'string' && typeof source.sampleCount === 'number' && typeof source.firstMs === 'number' && typeof source.lastMs === 'number')))
    && (session.version === 'signal-session-v1' || (Boolean(session.summary.quality) && typeof session.summary.quality?.firstSampleMs === 'number' && typeof session.summary.quality?.lastSampleMs === 'number' && typeof session.summary.quality?.gapsOverOneSecond === 'number' && typeof session.summary.quality?.samplesPerSecond === 'number'))
}

export interface SignalSessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const signalSessionStorageKey = 'tacitweave.signal-sessions.v1'
const maxSessions = 100

export function loadSignalSessions(storage: SignalSessionStorageLike): SignalSession[] {
  try {
    const raw = storage.getItem(signalSessionStorageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSignalSession).slice(0, maxSessions) : []
  } catch {
    return []
  }
}

export function saveSignalSessions(storage: SignalSessionStorageLike, sessions: SignalSession[]) {
  storage.setItem(signalSessionStorageKey, JSON.stringify(sessions.slice(0, maxSessions)))
}

export function clearSignalSessions(storage: SignalSessionStorageLike) {
  storage.removeItem(signalSessionStorageKey)
}

export function removeSignalSession(sessions: SignalSession[], id: string): SignalSession[] {
  return sessions.filter(session => session.id !== id)
}
