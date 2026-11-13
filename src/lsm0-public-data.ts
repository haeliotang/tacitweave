// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * LSM-0 public-data reanalysis harness.
 *
 * This consumes a canonical, feature-level session format. It does not read a
 * public dataset directly and it does not test Tacitweave's pre-verbal
 * hypothesis. It tests whether the analysis path keeps missingness, temporal
 * order and a time-structure-preserving control visible.
 */
import { spearmanRho } from './lsm0-eval'

export const PUBLIC_DATA_SESSION_VERSION = 'lsm0-public-session-v1' as const

export interface PublicDataSession {
  version: typeof PUBLIC_DATA_SESSION_VERSION
  participantCode: string
  sessionId: string
  capturedAt: string
  signals: Record<string, number>
  selfReport: { intensity?: number }
  quality?: { usable?: boolean; maxGapMs?: number; gapsOverOneSecond?: number }
  source?: { dataset?: string; adapterVersion?: string; fileSha256?: string }
}

export interface PublicDataParseResult {
  sessions: PublicDataSession[]
  rejected: Array<{ line: number; reason: string }>
}

export interface PublicDataParticipantResult {
  participantCode: string
  sessions: number
  usableSessions: number
  excludedForQuality: number
  missingFeature: number
  missingOutcome: number
  paired: number
  rho: number | null
  circularShiftRho: number | null
  shuffledRho: number | null
}

export interface PublicDataReport {
  version: 'lsm0-public-data-report-v1'
  feature: string
  outcome: string
  participants: PublicDataParticipantResult[]
  aggregate: {
    participants: number
    evaluableParticipants: number
    meanRho: number | null
    medianRho: number | null
    positiveParticipants: number
    meanCircularShiftRho: number | null
    meanShuffledRho: number | null
  }
  limitations: string[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function parsePublicDataText(text: string): PublicDataParseResult {
  const sessions: PublicDataSession[] = []
  const rejected: Array<{ line: number; reason: string }> = []
  const seen = new Set<string>()
  let lineNumber = 0
  for (const line of text.split(/\r?\n/)) {
    lineNumber += 1
    if (!line.trim()) continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      rejected.push({ line: lineNumber, reason: 'invalid_json' })
      continue
    }
    if (!isObject(parsed) || parsed.version !== PUBLIC_DATA_SESSION_VERSION) {
      rejected.push({ line: lineNumber, reason: 'invalid_version' })
      continue
    }
    if (typeof parsed.participantCode !== 'string' || !parsed.participantCode.trim()) {
      rejected.push({ line: lineNumber, reason: 'invalid_participant' })
      continue
    }
    if (typeof parsed.sessionId !== 'string' || !parsed.sessionId.trim()) {
      rejected.push({ line: lineNumber, reason: 'invalid_session' })
      continue
    }
    if (typeof parsed.capturedAt !== 'string' || Number.isNaN(Date.parse(parsed.capturedAt))) {
      rejected.push({ line: lineNumber, reason: 'invalid_captured_at' })
      continue
    }
    if (!isObject(parsed.signals) || !isObject(parsed.selfReport)) {
      rejected.push({ line: lineNumber, reason: 'invalid_payload' })
      continue
    }
    const signals: Record<string, number> = {}
    for (const [key, value] of Object.entries(parsed.signals)) {
      if (!isFiniteNumber(value)) {
        rejected.push({ line: lineNumber, reason: `non_finite_signal:${key}` })
        break
      }
      signals[key] = value
    }
    if (Object.keys(signals).length !== Object.keys(parsed.signals).length) continue
    if (parsed.selfReport.intensity !== undefined && !isFiniteNumber(parsed.selfReport.intensity)) {
      rejected.push({ line: lineNumber, reason: 'non_finite_intensity' })
      continue
    }
    if (parsed.quality !== undefined && !isObject(parsed.quality)) {
      rejected.push({ line: lineNumber, reason: 'invalid_quality' })
      continue
    }
    const key = `${parsed.participantCode}\u0000${parsed.sessionId}`
    if (seen.has(key)) {
      rejected.push({ line: lineNumber, reason: 'duplicate_participant_session' })
      continue
    }
    seen.add(key)
    sessions.push({
      version: PUBLIC_DATA_SESSION_VERSION,
      participantCode: parsed.participantCode,
      sessionId: parsed.sessionId,
      capturedAt: parsed.capturedAt,
      signals,
      selfReport: parsed.selfReport.intensity === undefined ? {} : { intensity: parsed.selfReport.intensity },
      ...(isObject(parsed.quality) ? { quality: parsed.quality as PublicDataSession['quality'] } : {}),
      ...(isObject(parsed.source) ? { source: parsed.source as PublicDataSession['source'] } : {}),
    })
  }
  sessions.sort((left, right) => left.participantCode.localeCompare(right.participantCode)
    || Date.parse(left.capturedAt) - Date.parse(right.capturedAt)
    || left.sessionId.localeCompare(right.sessionId))
  return { sessions, rejected }
}

function median(values: readonly number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

function lcg(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
}

function shuffled(values: readonly number[], seed: number): number[] {
  const random = lcg(seed)
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(random() * (index + 1))
    const value = result[index]
    result[index] = result[pick]
    result[pick] = value
  }
  return result
}

function circularShift(values: readonly number[], amount = 1): number[] {
  if (values.length <= 1) return [...values]
  const offset = ((amount % values.length) + values.length) % values.length
  return [...values.slice(offset), ...values.slice(0, offset)]
}

export function evaluatePublicData(sessions: readonly PublicDataSession[], options: { feature: string; outcome?: string }): PublicDataReport {
  const feature = options.feature
  const outcome = options.outcome ?? 'intensity'
  const grouped = new Map<string, PublicDataSession[]>()
  for (const session of sessions) {
    const group = grouped.get(session.participantCode)
    if (group) group.push(session)
    else grouped.set(session.participantCode, [session])
  }
  const participants: PublicDataParticipantResult[] = []
  for (const [participantCode, group] of grouped) {
    const ordered = [...group].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt))
    let excludedForQuality = 0
    let missingFeature = 0
    let missingOutcome = 0
    const xs: number[] = []
    const ys: number[] = []
    for (const session of ordered) {
      if (session.quality?.usable === false) {
        excludedForQuality += 1
        continue
      }
      const x = session.signals[feature]
      const y = session.selfReport.intensity
      if (!isFiniteNumber(x)) missingFeature += 1
      if (!isFiniteNumber(y)) missingOutcome += 1
      if (isFiniteNumber(x) && isFiniteNumber(y)) {
        xs.push(x)
        ys.push(y)
      }
    }
    const rho = xs.length >= 4 ? spearmanRho(xs, ys) : null
    const circular = xs.length >= 4 ? circularShift(xs, 1) : []
    const circularRho = circular.length >= 4 ? spearmanRho(circular, ys) : null
    const shuffledRho = xs.length >= 4 ? spearmanRho(shuffled(xs, 20261113), ys) : null
    participants.push({
      participantCode,
      sessions: ordered.length,
      usableSessions: ordered.length - excludedForQuality,
      excludedForQuality,
      missingFeature,
      missingOutcome,
      paired: xs.length,
      rho,
      circularShiftRho: circularRho,
      shuffledRho,
    })
  }
  const evaluable = participants.filter(participant => participant.rho !== null)
  const rhos = evaluable.flatMap(participant => participant.rho === null ? [] : [participant.rho])
  const circular = evaluable.flatMap(participant => participant.circularShiftRho === null ? [] : [participant.circularShiftRho])
  const shuffledRhos = evaluable.flatMap(participant => participant.shuffledRho === null ? [] : [participant.shuffledRho])
  const mean = (values: readonly number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  return {
    version: 'lsm0-public-data-report-v1',
    feature,
    outcome,
    participants,
    aggregate: {
      participants: participants.length,
      evaluableParticipants: evaluable.length,
      meanRho: mean(rhos),
      medianRho: median(rhos),
      positiveParticipants: rhos.filter(value => value > 0).length,
      meanCircularShiftRho: mean(circular),
      meanShuffledRho: mean(shuffledRhos),
    },
    limitations: [
      'This is a feature-level reanalysis; raw public data adapters are not included.',
      'No p-value, causal claim, clinical claim or pre-verbal construct validation is produced.',
      'The circular-shift control preserves only a coarse form of temporal ordering; it is not a universal surrogate.',
      'Missing values are excluded per pair, never imputed; exclusion rules must be frozen before analysis.',
    ],
  }
}

export function formatPublicDataReport(report: PublicDataReport): string {
  const format = (value: number | null) => value === null ? 'n/a' : value.toFixed(3)
  const lines = [
    `LSM-0 public-data reanalysis (${report.version})`,
    `feature=${report.feature} outcome=${report.outcome}`,
    'participant | sessions | paired | rho | circular | shuffled',
  ]
  for (const participant of report.participants) {
    lines.push(`${participant.participantCode} | ${participant.sessions} | ${participant.paired} | ${format(participant.rho)} | ${format(participant.circularShiftRho)} | ${format(participant.shuffledRho)}`)
  }
  lines.push(`evaluable=${report.aggregate.evaluableParticipants}/${report.aggregate.participants} mean=${format(report.aggregate.meanRho)} median=${format(report.aggregate.medianRho)} positive=${report.aggregate.positiveParticipants}`)
  lines.push('Descriptive only; no p-values or construct-validity claim.')
  return lines.join('\n')
}
