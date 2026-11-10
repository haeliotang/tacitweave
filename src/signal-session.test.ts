// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { createSignalSession, isSignalSession, loadSignalSessions, removeSignalSession, saveSignalSessions, signalSessionStorageKey } from './signal-session'
import type { SignalTimeline } from './signal-source'

const timeline: SignalTimeline = {
  version: 'signal-timeline-v1',
  startedAt: '2026-11-01T00:00:00.000Z',
  endedAt: '2026-11-01T00:00:15.000Z',
  simulated: true,
  sources: ['simulated'],
  samples: [
    { tMs: 0, kind: 'heart_rate', value: 70, sourceId: 'simulated' },
    { tMs: 1000, kind: 'eda', value: 1.2, sourceId: 'simulated' },
  ],
}

describe('signal sessions', () => {
  it('persists only a summary, not raw samples', () => {
    const session = createSignalSession(timeline, '2026-11-01T00:00:16.000Z', 'session-1')
    expect(session.summary).toMatchObject({ durationSec: 15, sampleCount: 2, byKind: [{ kind: 'heart_rate', count: 1 }, { kind: 'eda', count: 1 }] })
    expect(JSON.stringify(session)).not.toMatch(/rawSamples|rawAudio|"samples"\s*:/i)
    expect(isSignalSession(session)).toBe(true)
    expect(session.version).toBe('signal-session-v2')
    expect(session.summary.bySource?.[0]).toMatchObject({ sourceId: 'simulated', sampleCount: 2, maxGapMs: 1000 })
    expect(session.summary.quality).toMatchObject({ maxGapMs: 1000, gapsOverOneSecond: 0 })
  })

  it('rejects malformed sessions', () => {
    expect(isSignalSession({ version: 'signal-session-v1' })).toBe(false)
  })
})


describe('signal session retraction', () => {
  it('removes exactly the explicitly selected session', () => {
    const first = createSignalSession(timeline, '2026-11-01T00:00:16.000Z', 'session-1')
    const second = createSignalSession(timeline, '2026-11-01T00:01:16.000Z', 'session-2')
    expect(removeSignalSession([first, second], 'session-1')).toEqual([second])
  })
})

describe('signal session persistence and retraction', () => {
  it('leaves no session after save, retract, save and reload', () => {
    const storage = new Map<string, string>()
    const adapter = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
      removeItem: (key: string) => { storage.delete(key) },
    }
    const session = createSignalSession(timeline, '2026-11-01T00:00:16.000Z', 'persisted-session')
    saveSignalSessions(adapter, [session])
    expect(loadSignalSessions(adapter)).toHaveLength(1)
    const remaining = removeSignalSession(loadSignalSessions(adapter), session.id)
    saveSignalSessions(adapter, remaining)
    expect(loadSignalSessions(adapter)).toEqual([])
    expect(storage.get(signalSessionStorageKey)).toBe('[]')
  })
})
