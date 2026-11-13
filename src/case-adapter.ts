// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * CASE (Continuously Annotated Signals of Emotion) canonical adapter.
 *
 * Converts the public CASE `interpolated` CSV files into the LSM-0 canonical
 * feature-level session format. It intentionally aggregates each video segment
 * separately; it does not align raw samples one by one in this first version.
 * The public dataset has no Tacitweave imagery/relationship labels.
 */
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import type { PublicDataSession } from './lsm0-public-data'

export interface CaseAggregate {
  count: number
  sums: Record<string, number>
}

export async function aggregateCaseCsv(path: string, fields: readonly string[]): Promise<Map<number, CaseAggregate>> {
  const aggregates = new Map<number, CaseAggregate>()
  const stream = createReadStream(path, { encoding: 'utf8' })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  let columns: string[] | null = null
  let videoIndex = -1
  const valueIndexes: number[] = []
  for await (const line of lines) {
    if (!line.trim()) continue
    const parts = line.split(',')
    if (!columns) {
      columns = parts
      videoIndex = columns.indexOf('video')
      if (videoIndex < 0) throw new Error(`CASE CSV missing video column: ${path}`)
      for (const field of fields) {
        const index = columns.indexOf(field)
        if (index < 0) throw new Error(`CASE CSV missing ${field}: ${path}`)
        valueIndexes.push(index)
      }
      continue
    }
    const video = Number(parts[videoIndex])
    if (!Number.isFinite(video)) continue
    const aggregate = aggregates.get(video) ?? { count: 0, sums: {} }
    let usable = true
    const values: number[] = []
    for (const index of valueIndexes) {
      const value = Number(parts[index])
      if (!Number.isFinite(value)) { usable = false; break }
      values.push(value)
    }
    if (!usable) continue
    aggregate.count += 1
    for (let index = 0; index < fields.length; index += 1) aggregate.sums[fields[index]] = (aggregate.sums[fields[index]] ?? 0) + values[index]
    aggregates.set(video, aggregate)
  }
  return aggregates
}

export interface CaseParticipantFiles {
  participantCode: string
  annotationPath: string
  physiologicalPath: string
}

export async function buildCaseSessions(files: readonly CaseParticipantFiles[], options: { baseIso?: string } = {}): Promise<PublicDataSession[]> {
  const base = options.baseIso ? Date.parse(options.baseIso) : Date.parse('2019-10-01T00:00:00.000Z')
  const sessions: PublicDataSession[] = []
  for (const participant of files) {
    const annotations = await aggregateCaseCsv(participant.annotationPath, ['valence', 'arousal'])
    const physiological = await aggregateCaseCsv(participant.physiologicalPath, ['ecg', 'bvp', 'gsr', 'rsp', 'skt', 'emg_zygo', 'emg_coru', 'emg_trap'])
    const videos = [...new Set([...annotations.keys(), ...physiological.keys()])].sort((left, right) => left - right)
    for (const video of videos) {
      const annotation = annotations.get(video)
      const signal = physiological.get(video)
      if (!annotation || !signal || annotation.count === 0 || signal.count === 0) continue
      sessions.push({
        version: 'lsm0-public-session-v1',
        participantCode: participant.participantCode,
        sessionId: `${participant.participantCode.toLowerCase()}-v${video}`,
        capturedAt: new Date(base + video * 60_000).toISOString(),
        signals: {
          ecgMeanMv: signal.sums.ecg / signal.count,
          bvpMeanPct: signal.sums.bvp / signal.count,
          gsrMeanMicroSiemens: signal.sums.gsr / signal.count,
          respirationMeanPct: signal.sums.rsp / signal.count,
          skinTemperatureMeanC: signal.sums.skt / signal.count,
          emgZygomaticusMeanUv: signal.sums.emg_zygo / signal.count,
          emgCorrugatorMeanUv: signal.sums.emg_coru / signal.count,
          emgTrapeziusMeanUv: signal.sums.emg_trap / signal.count,
        },
        selfReport: { intensity: annotation.sums.arousal / annotation.count },
        source: { dataset: 'CASE', adapterVersion: 'case-canonical-v1' },
      })
    }
  }
  return sessions
}
