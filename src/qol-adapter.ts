// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * QoL_Stress canonical adapter.
 *
 * The public dataset has two phases per participant (relax/stress), not a
 * longitudinal session series. This adapter therefore produces linkable
 * participant-phase records for import and quality checks. The LSM-0 harness
 * must refuse a within-person correlation when only two paired points exist.
 */
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import type { PublicDataSession } from './lsm0-public-data'
import { computeEcgHrv } from './ecg-hrv'

export interface QolSessionPaths {
  root: string
  baseIso?: string
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1 }
      else quoted = !quoted
    } else if (char === ',' && !quoted) {
      values.push(current)
      current = ''
    } else current += char
  }
  values.push(current)
  return values
}

async function readCsv(path: string): Promise<Array<Record<string, string>>> {
  const rows: Array<Record<string, string>> = []
  const stream = createReadStream(path, { encoding: 'utf8' })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })
  let headers: string[] | null = null
  for await (const line of lines) {
    if (!line.trim()) continue
    const parts = parseCsvLine(line)
    if (!headers) {
      headers = parts.map(header => header.replace(/^\ufeff/, ''))
      continue
    }
    const row: Record<string, string> = {}
    headers.forEach((header, index) => { row[header] = parts[index] ?? '' })
    rows.push(row)
  }
  return rows
}

function phaseIndex(phase: string): number {
  return phase.toLowerCase() === 'stress' ? 1 : 0
}

export async function buildQolSessions(paths: QolSessionPaths): Promise<PublicDataSession[]> {
  const [participants, ecg, eda, stai, pss] = await Promise.all([
    readCsv(join(paths.root, 'participants.csv')),
    readCsv(join(paths.root, 'ecg.csv')),
    readCsv(join(paths.root, 'eda.csv')),
    readCsv(join(paths.root, 'stai.csv')),
    readCsv(join(paths.root, 'pss_14.csv')),
  ])
  const participantCodes = new Map<string, string>()
  const usernames = [...new Set([
    ...participants.map(row => row.username),
    ...ecg.map(row => row.username),
    ...eda.map(row => row.username),
    ...stai.map(row => row.username),
    ...pss.map(row => row.username),
  ].filter(Boolean))].sort()
  usernames.forEach((username, index) => participantCodes.set(username, `P${String(index + 1).padStart(3, '0')}`))
  const pssByUser = new Map<string, number>()
  for (const row of pss) {
    const score = Number(row.score)
    if (Number.isFinite(score)) pssByUser.set(row.username, score)
  }
  const staiByKey = new Map<string, number>()
  for (const row of stai) {
    const score = Number(row.score)
    if (Number.isFinite(score)) staiByKey.set(`${row.username}\u0000${phaseIndex(row.phase)}`, score)
  }
  const ecgByKey = new Map<string, { sum: number; count: number }>()
  for (const row of ecg) {
    const value = Number(row.heart_rate)
    if (!Number.isFinite(value)) continue
    const key = `${row.username}\u0000${phaseIndex(row.phase)}`
    const aggregate = ecgByKey.get(key) ?? { sum: 0, count: 0 }
    aggregate.sum += value
    aggregate.count += 1
    ecgByKey.set(key, aggregate)
  }
  const hrvByKey = new Map<string, { sdnn: number; rmssd: number; peaks: number; count: number }>()
  for (const row of ecg) {
    const waveform = row.waveform_samples?.trim()
    if (!waveform) continue
    const samples = waveform.split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite)
    const hrv = computeEcgHrv(samples, 250)
    if (hrv.sdnnMs === null || hrv.rmssdMs === null) continue
    const key = `${row.username}\u0000${phaseIndex(row.phase)}`
    const aggregate = hrvByKey.get(key) ?? { sdnn: 0, rmssd: 0, peaks: 0, count: 0 }
    aggregate.sdnn += hrv.sdnnMs
    aggregate.rmssd += hrv.rmssdMs
    aggregate.peaks += hrv.peaks.length
    aggregate.count += 1
    hrvByKey.set(key, aggregate)
  }
  const edaByKey = new Map<string, { sum: number; count: number; invalid: number }>()
  for (const row of eda) {
    const key = `${row.username}\u0000${phaseIndex(row.phase)}`
    const aggregate = edaByKey.get(key) ?? { sum: 0, count: 0, invalid: 0 }
    if (row.valid_data.toLowerCase() !== 'true') { aggregate.invalid += 1; edaByKey.set(key, aggregate); continue }
    const value = Number(row.scl_avg)
    if (!Number.isFinite(value)) { aggregate.invalid += 1; edaByKey.set(key, aggregate); continue }
    aggregate.sum += value
    aggregate.count += 1
    edaByKey.set(key, aggregate)
  }
  const keys = new Set<string>([...ecgByKey.keys(), ...edaByKey.keys(), ...staiByKey.keys()])
  const base = paths.baseIso ? Date.parse(paths.baseIso) : Date.parse('2026-10-07T00:00:00.000Z')
  const sessions: PublicDataSession[] = []
  for (const key of [...keys].sort()) {
    const [username, phaseText] = key.split('\u0000')
    const phase = Number(phaseText)
    if (!username || (phase !== 0 && phase !== 1)) continue
    const participantIndex = usernames.indexOf(username)
    const heart = ecgByKey.get(key)
    const electrodermal = edaByKey.get(key)
    const signals: Record<string, number> = {}
    if (heart?.count) signals.ecgHeartRateBpm = heart.sum / heart.count
    if (electrodermal?.count) {
      signals.edaMeanSclMicroSiemens = electrodermal.sum / electrodermal.count
      signals.edaValidSamples = electrodermal.count
      signals.edaInvalidSamples = electrodermal.invalid
    }
    const hrv = hrvByKey.get(key)
    if (hrv?.count) {
      signals.ecgHrvSdnnMs = hrv.sdnn / hrv.count
      signals.ecgHrvRmssdMs = hrv.rmssd / hrv.count
      signals.ecgRPeakCount = hrv.peaks / hrv.count
    }
    if (!Object.keys(signals).length) continue
    const selfReport: PublicDataSession['selfReport'] = {}
    const anxiety = staiByKey.get(key)
    if (anxiety !== undefined) selfReport.stateAnxietyScore = anxiety
    const perceived = pssByUser.get(username)
    if (perceived !== undefined) selfReport.pss14Score = perceived
    sessions.push({
      version: 'lsm0-public-session-v1',
      participantCode: participantCodes.get(username) ?? `P${String(participantIndex + 1).padStart(3, '0')}`,
      sessionId: `${participantCodes.get(username)?.toLowerCase()}-${phase === 0 ? 'relax' : 'stress'}`,
      capturedAt: new Date(base + participantIndex * 7_200_000 + phase * 3_600_000).toISOString(),
      signals,
      selfReport,
      quality: {
        usable: signals.ecgHeartRateBpm !== undefined || signals.edaMeanSclMicroSiemens !== undefined,
        maxGapMs: undefined,
        gapsOverOneSecond: undefined,
      },
      source: { dataset: 'QoL_Stress', adapterVersion: 'qol-canonical-v1' },
    })
  }
  return sessions
}
