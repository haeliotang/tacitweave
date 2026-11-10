// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import type { LocalDataset } from './local-dataset'
import { buildLocalTimeline, exportLocalTimeline } from './local-timeline'
import { grantLocalSignalConsent, voiceTraceFromSamples } from './somatic-signal'
import type { SomaticCapture } from './somatic'

const capture: SomaticCapture = { region: 'chest', sensation: 'pressure', intensity: 4, breath: 'held', fragments: ['wet-corridor', 'dusk-stairs'] }
const signals = { consent: grantLocalSignalConsent('2026-11-01T00:00:00Z'), voice: voiceTraceFromSamples([0.1, 0.2], 8, 10) }

const dataset: LocalDataset = {
  version: 'local-dataset-v1', exportedAt: '2026-11-01T00:10:00Z',
  motifs: [{ version: 'motif-v1', id: 'm1', createdAt: '2026-11-01T00:00:00Z', name: '旧门', capture, signals }],
  relationships: [{ version: 'relationship-trigger-v1', id: 'r1', createdAt: '2026-11-01T00:05:00Z', role: '一个总在忙的人', situation: '很久没回复', cue: '屏幕暗下去', region: 'chest', sensation: 'tightness', intensity: 4, breath: 'shallow', response: 'freeze' }],
}

describe('local event timeline', () => {
  it('converts local records into a sorted structured timeline', () => {
    const timeline = buildLocalTimeline(dataset, '2026-11-01T00:10:00Z')
    expect(timeline).toMatchObject({ version: 'signal-timeline-v1', simulated: false, sources: ['local-capture'] })
    expect(timeline.samples.map(sample => sample.kind)).toEqual(['body_event', 'imagery_event', 'imagery_event', 'voice_energy', 'relationship_event'])
    expect(timeline.samples.map(sample => sample.tMs)).toEqual([0, 0, 0, 0, 300000])
    expect(timeline.samples.some(sample => sample.label === 'wet-corridor')).toBe(true)
  })

  it('does not put free-text role/situation/cue into the analysis timeline', () => {
    const exported = exportLocalTimeline(dataset)
    expect(exported).not.toContain('一个总在忙的人')
    expect(exported).not.toContain('很久没回复')
    expect(exported).not.toContain('屏幕暗下去')
    expect(exported).not.toContain('rawAudio')
  })

  it('returns an empty timeline for an empty dataset', () => {
    const timeline = buildLocalTimeline({ version: 'local-dataset-v1', exportedAt: 'x', motifs: [], relationships: [] }, '2026-11-01T00:00:00Z')
    expect(timeline.samples).toEqual([])
    expect(timeline.startedAt).toBe('2026-11-01T00:00:00Z')
  })
})
