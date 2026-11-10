// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Convert a local-dataset-v2 export into LSM-0 session fixtures.
 *
 * This is a local data-shaping helper, not a research result. Voice summaries
 * are the only per-motif signal available in the current dataset; heart-rate
 * and EDA fields remain absent rather than being invented. Relationship
 * triggers and standalone signal sessions are intentionally not attached to a
 * somatic session because the dataset has no participant/session join key.
 */
import type { LocalDataset } from './local-dataset'
import { isSomaticCapture } from './somatic'
import type { Lsm0SessionRecord, Lsm0SignalParameters } from './lsm0-eval'

export interface Lsm0DatasetExport {
  records: Lsm0SessionRecord[]
  warnings: string[]
  skippedMotifs: number
}

export function datasetToLsm0Sessions(dataset: LocalDataset, participantId: string): Lsm0DatasetExport {
  if (!participantId.trim()) throw new Error('participant_id_required')
  const records: Lsm0SessionRecord[] = []
  const warnings: string[] = []
  const seen = new Set<string>()
  let skippedMotifs = 0

  for (const motif of dataset.motifs) {
    if (!isSomaticCapture(motif.capture)) {
      skippedMotifs += 1
      warnings.push(`motif ${motif.id}: invalid somatic capture`)
      continue
    }
    if (seen.has(motif.id)) {
      skippedMotifs += 1
      warnings.push(`motif ${motif.id}: duplicate session id`)
      continue
    }
    seen.add(motif.id)
    const signals: Lsm0SignalParameters = {}
    if (motif.signals?.voice) {
      signals.voiceRmsMean = motif.signals.voice.rmsMean
      signals.voicePauseRatio = motif.signals.voice.pauseRatio
    }
    records.push({
      version: 'lsm0-session-v1',
      participantId: participantId.trim(),
      sessionId: motif.id,
      capturedAt: motif.createdAt,
      somatic: motif.capture,
      ...(Object.keys(signals).length ? { signals } : {}),
      ...(motif.symbolic ? { symbolic: { format: motif.symbolic.format, motifs: [...motif.symbolic.motifs], figure: motif.symbolic.figure } } : {}),
      simulatedSignals: false,
    })
  }

  if ((dataset.signals?.length ?? 0) > 0) warnings.push(`${dataset.signals!.length} signal session summaries are not joined to motifs; omitted`)
  if ((dataset.relationships?.length ?? 0) > 0) warnings.push(`${dataset.relationships!.length} relationship triggers are not part of LSM-0 somatic sessions; omitted`)
  if ((dataset.captures?.length ?? 0) > 0) warnings.push(`${dataset.captures!.length} capture provenance records are not joined to motifs; omitted`)

  return { records, warnings, skippedMotifs }
}
