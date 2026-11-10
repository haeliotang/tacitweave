// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { LocalDataset } from './local-dataset'
import type { SignalSample, SignalTimeline } from './signal-source'

/**
 * Convert the local multimodal dataset into a descriptive event timeline.
 * It uses only structured fields; free-text role/situation/cue is omitted.
 */
export function buildLocalTimeline(dataset: LocalDataset, now = new Date().toISOString()): SignalTimeline {
  const entries = [
    ...dataset.motifs.map(entry => ({ at: entry.createdAt, motif: entry })),
    ...dataset.relationships.map(entry => ({ at: entry.createdAt, relationship: entry })),
  ].sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
  if (!entries.length) {
    return { version: 'signal-timeline-v1', startedAt: now, endedAt: now, samples: [], sources: ['local-capture'], simulated: false }
  }
  const start = Date.parse(entries[0].at)
  const end = Date.parse(entries[entries.length - 1].at)
  const samples: SignalSample[] = []
  for (const entry of entries) {
    const tMs = Date.parse(entry.at) - start
    if ('motif' in entry) {
      const capture = entry.motif.capture
      samples.push({ tMs, kind: 'body_event', label: `${capture.region}/${capture.sensation}`, value: capture.intensity, sourceId: 'local-capture' })
      for (const fragment of capture.fragments) samples.push({ tMs, kind: 'imagery_event', label: fragment, sourceId: 'local-capture' })
      if (entry.motif.signals?.voice) samples.push({ tMs, kind: 'voice_energy', value: entry.motif.signals.voice.rmsMean, unit: 'rms', label: 'voice-summary', sourceId: 'local-capture' })
    }
    if ('relationship' in entry) {
      samples.push({ tMs, kind: 'relationship_event', label: entry.relationship.response, value: entry.relationship.intensity, sourceId: 'local-capture' })
    }
  }
  samples.sort((left, right) => left.tMs - right.tMs)
  return {
    version: 'signal-timeline-v1',
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(end).toISOString(),
    samples,
    sources: ['local-capture'],
    simulated: false,
  }
}

export function exportLocalTimeline(dataset: LocalDataset) {
  return JSON.stringify(buildLocalTimeline(dataset), null, 2)
}
