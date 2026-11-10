// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { datasetToLsm0Sessions } from './lsm0-dataset'
import type { LocalDataset } from './local-dataset'
import type { SomaticCapture } from './somatic'

const capture: SomaticCapture = { region: 'chest', sensation: 'pressure', intensity: 3, breath: 'held', fragments: ['wet-corridor'], certainty: 'mixed' }
const dataset = (): LocalDataset => ({
  version: 'local-dataset-v2',
  exportedAt: '2026-11-01T00:00:00Z',
  motifs: [
    { version: 'motif-v1', id: 'motif-1', createdAt: '2026-11-01T00:00:00Z', name: 'a', capture: { ...capture } },
    { version: 'motif-v1', id: 'motif-2', createdAt: '2026-11-02T00:00:00Z', name: 'b', capture: { ...capture, intensity: 4 }, symbolic: { format: 'encounter' as const, motifs: ['door'], figure: 'shadow' } },
  ],
  relationships: [],
  signals: [],
  captures: [],
})

describe('LSM-0 local dataset export', () => {
  it('maps motifs to one participant and preserves only available voice summaries', () => {
    const input = dataset()
    input.motifs[0].signals = { consent: { version: 'signal-consent-v1', localOnly: true, purpose: 'local_research', grantedAt: '2026-11-01T00:00:00Z' }, voice: { version: 'voice-v1', durationSec: 8, sampleCount: 10, rmsMean: 0.2, rmsP95: 0.3, pauseRatio: 0.25, sampleRate: 10 } }
    const result = datasetToLsm0Sessions(input, 'P01')
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toMatchObject({ participantId: 'P01', sessionId: 'motif-1', signals: { voiceRmsMean: 0.2, voicePauseRatio: 0.25 } })
    expect(result.records[1].signals).toBeUndefined()
    expect(result.records[1].symbolic).toEqual({ format: 'encounter', motifs: ['door'], figure: 'shadow' })
    expect(result.records[0].somatic.certainty).toBe('mixed')
    expect(result.warnings).toEqual([])
  })

  it('reports omitted joins, invalid captures and requires a participant', () => {
    const input = dataset()
    input.relationships = [{ version: 'relationship-trigger-v1', id: 'r', createdAt: '2026-11-01T00:00:00Z', role: '', situation: 'x', cue: '', region: 'chest', sensation: 'pressure', intensity: 2, breath: 'even', response: 'freeze' }]
    input.motifs.push({ ...input.motifs[0], id: 'bad', capture: { region: 'nope' } as never })
    const result = datasetToLsm0Sessions(input, 'P01')
    expect(result.records).toHaveLength(2)
    expect(result.skippedMotifs).toBe(1)
    expect(result.warnings.join(' ')).toMatch(/relationship triggers/)
    expect(() => datasetToLsm0Sessions(input, ' ')).toThrow('participant_id_required')
  })
})
