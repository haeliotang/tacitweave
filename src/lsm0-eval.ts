// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * LSM-0 offline, deterministic evaluation baseline.
 *
 * This module computes only prespecified, descriptive metrics over local
 * session summaries. It is not a clinical instrument: it has no diagnostic
 * output, no significance testing, no imputation, and no network access.
 *
 * Determinism rules:
 * - inputs are normalized and sorted with locale-independent string comparison;
 * - metrics are rounded to six decimals;
 * - reports contain no wall-clock timestamps or random values;
 * - the same input records always produce the same report.
 */
import {
  isSomaticCapture,
  type AssociativeFragmentId,
  type BreathState,
  type SomaticCapture,
  type SomaticCertainty,
  type SomaticRegion,
  type SomaticSensation,
} from './somatic'

export const LSM0_RECORD_VERSION = 'lsm0-session-v1'
export const LSM0_EVAL_VERSION = 'lsm0-eval-v1'

/** Minimum sessions needed before any within-participant stability is reported. */
export const MIN_SESSIONS_FOR_STABILITY = 2
/** Minimum paired sessions needed before a within-participant association is reported. */
export const MIN_PAIRED_SESSIONS_FOR_ASSOCIATION = 4

export const SIGNAL_KEYS = [
  'heartRateBpm',
  'edaMicroSiemens',
  'breathRatePerMin',
  'voiceRmsMean',
  'voicePauseRatio',
] as const

export type Lsm0SignalKey = (typeof SIGNAL_KEYS)[number]
export type Lsm0SignalParameters = Partial<Record<Lsm0SignalKey, number>>

export interface Lsm0SymbolicParameters {
  format: 'encounter' | 'space'
  /** Primary first, then up to two additional motifs; all user/system symbolic parameters. */
  motifs: string[]
  figure: string
}

export interface Lsm0AgencyParameters {
  approach: number
  stay: number
  resume: number
  leave: number
  reenter: number
  leftEarly: boolean
  durationSec: number
}

export interface Lsm0SessionRecord {
  version: typeof LSM0_RECORD_VERSION
  participantId: string
  sessionId: string
  capturedAt: string
  somatic: SomaticCapture
  /** Optional derived signal/symbolic parameters. Missing values are not imputed. */
  signals?: Lsm0SignalParameters
  /** Optional symbolic-space parameters captured alongside the somatic record. */
  symbolic?: Lsm0SymbolicParameters
  /** Optional user-authored agency summary; absent means not recorded. */
  agency?: Lsm0AgencyParameters
  /** True when the signal values are synthetic rather than recorded from a person. */
  simulatedSignals?: boolean
}

export interface Lsm0FeatureVector {
  participantId: string
  sessionId: string
  capturedAt: string
  region: SomaticRegion
  sensation: SomaticSensation
  breath: BreathState
  intensity: SomaticCapture['intensity']
  certainty: SomaticCertainty | undefined
  /** First user-chosen associative fragment; order is preserved from the capture. */
  primaryFragment: AssociativeFragmentId
  /** Unique associative fragments in code-unit order, used for set similarity. */
  fragmentSet: AssociativeFragmentId[]
  signals: Lsm0SignalParameters
  symbolic: Lsm0SymbolicParameters | undefined
  agency: Lsm0AgencyParameters | undefined
  simulatedSignals: boolean
}

export interface Lsm0Issue {
  rowIndex: number
  code: Lsm0IssueCode
  message: string
  participantId?: string
  sessionId?: string
  signal?: Lsm0SignalKey
  detail?: string
}

export type Lsm0IssueCode =
  | 'invalid_json'
  | 'invalid_record'
  | 'unsupported_version'
  | 'invalid_participant_id'
  | 'invalid_session_id'
  | 'invalid_captured_at'
  | 'invalid_somatic'
  | 'duplicate_session'
  | 'signals_not_object'
  | 'signal_value_invalid'
  | 'unknown_signal_key'
  | 'invalid_simulated_flag'
  | 'invalid_symbolic'
  | 'invalid_agency'

export interface Lsm0NormalizedRecord {
  record: Lsm0SessionRecord
  rowIndex: number
}

export interface Lsm0ParseResult {
  records: Lsm0NormalizedRecord[]
  rejected: Lsm0Issue[]
  warnings: Lsm0Issue[]
}

export interface Lsm0CategoricalStability {
  n: number
  distinctValues: number
  modalValue: string
  modeShare: number
}

export interface Lsm0NumericSummary {
  n: number
  mean: number | null
  /** Sample standard deviation (n - 1); null when fewer than two values. */
  sd: number | null
  /** sd / mean when defined and mean is not zero. */
  cv: number | null
  min: number | null
  max: number | null
}

export interface Lsm0SignalReport {
  /** Valid values divided by the participant's session count. */
  coverage: number
  summary: Lsm0NumericSummary
}

export type Lsm0AssociationStatus = 'computed' | 'insufficient_pairs' | 'zero_variance'

export interface Lsm0AssociationResult {
  report: 'intensity'
  signal: Lsm0SignalKey
  method: 'spearman'
  n: number
  rho: number | null
  status: Lsm0AssociationStatus
}

export interface Lsm0AgencyReport {
  sessionsWithAgency: number
  approach: number
  stay: number
  resume: number
  leave: number
  reenter: number
  leftEarlySessions: number
}

export interface Lsm0CertaintyReport {
  sessionsWithValue: number
  counts: Record<SomaticCertainty, number>
  modeShare: number | null
}

export interface Lsm0SymbolicReport {
  sessionCount: number
  primaryMotif: Lsm0CategoricalStability | null
  motifSetStability: number | null
  figure: Lsm0CategoricalStability | null
  /** Descriptive paired counts of somatic region/sensation and primary symbolic motif. */
  somaticPairs: Array<{ region: string; sensation: string; primaryMotif: string; count: number }>
}

export interface Lsm0ParticipantReport {
  participantId: string
  sessionCount: number
  firstCapturedAt: string
  lastCapturedAt: string
  syntheticSignalSessions: number
  categoricalStability: {
    region: Lsm0CategoricalStability | null
    sensation: Lsm0CategoricalStability | null
    breath: Lsm0CategoricalStability | null
    primaryFragment: Lsm0CategoricalStability | null
  }
  /** Mean pairwise Jaccard similarity over each session's fragment set. */
  fragmentSetStability: number | null
  /** 1 - (max - min) / 4 on the 1-5 self-report intensity scale. */
  intensityStability: number | null
  intensity: Lsm0NumericSummary
  certainty: Lsm0CertaintyReport
  agency: Lsm0AgencyReport
  signals: Record<Lsm0SignalKey, Lsm0SignalReport>
  symbolic: Lsm0SymbolicReport
  associations: Lsm0AssociationResult[]
  missing: {
    sessionsWithoutAnySignal: number
    missingSessionsBySignal: Record<Lsm0SignalKey, number>
  }
}

export interface Lsm0AssociationAggregate {
  report: 'intensity'
  signal: Lsm0SignalKey
  participantsWithValue: number
  positive: number
  negative: number
  zero: number
  medianRho: number | null
}

export interface Lsm0AggregateReport {
  participantCount: number
  participantsWithStability: number
  categoricalStabilityMedian: {
    region: number | null
    sensation: number | null
    breath: number | null
    primaryFragment: number | null
  }
  fragmentSetStabilityMedian: number | null
  intensityStabilityMedian: number | null
  signalCoverageMedian: Record<Lsm0SignalKey, number | null>
  symbolic: {
    sessionsWithSymbolic: number
    primaryMotifStabilityMedian: number | null
    motifSetStabilityMedian: number | null
    figureStabilityMedian: number | null
  }
  associations: Lsm0AssociationAggregate[]
}

export interface Lsm0Prespecification {
  recordVersion: typeof LSM0_RECORD_VERSION
  evalVersion: typeof LSM0_EVAL_VERSION
  minSessionsForStability: typeof MIN_SESSIONS_FOR_STABILITY
  minPairedSessionsForAssociation: typeof MIN_PAIRED_SESSIONS_FOR_ASSOCIATION
  associationMethod: 'spearman'
  primaryAssociations: ReadonlyArray<{ report: 'intensity'; signal: Lsm0SignalKey }>
  intensityScale: { min: 1; max: 5 }
  signalKeys: readonly Lsm0SignalKey[]
  symbolicMetrics: {
    primaryMotif: 'mode_share'
    motifSet: 'mean_pairwise_jaccard'
    figure: 'mode_share'
    somaticPairs: 'paired_counts'
  }
}

/**
 * The complete prespecified analysis surface. Any change here is a protocol
 * amendment and must be documented before looking at new data.
 */
export const LSM0_PRESPECIFICATION: Lsm0Prespecification = {
  recordVersion: LSM0_RECORD_VERSION,
  evalVersion: LSM0_EVAL_VERSION,
  minSessionsForStability: MIN_SESSIONS_FOR_STABILITY,
  minPairedSessionsForAssociation: MIN_PAIRED_SESSIONS_FOR_ASSOCIATION,
  associationMethod: 'spearman',
  primaryAssociations: [
    { report: 'intensity', signal: 'heartRateBpm' },
    { report: 'intensity', signal: 'edaMicroSiemens' },
  ],
  intensityScale: { min: 1, max: 5 },
  signalKeys: [...SIGNAL_KEYS],
  symbolicMetrics: {
    primaryMotif: 'mode_share',
    motifSet: 'mean_pairwise_jaccard',
    figure: 'mode_share',
    somaticPairs: 'paired_counts',
  },
}

/** Fixed association pairs. No additional pair is computed or reported. */
export const PRIMARY_ASSOCIATIONS: ReadonlyArray<{ report: 'intensity'; signal: Lsm0SignalKey }> = LSM0_PRESPECIFICATION.primaryAssociations

export const LSM0_LIMITATIONS: readonly string[] = [
  'Descriptive baseline only. It does not establish clinical validity, efficacy, or causal relationships.',
  'Only the prespecified stability metrics and the two intensity-signal pairs are computed; there are no p-values, significance tests, subgroup searches, or post hoc metric selection.',
  'Missing optional signals are never imputed; invalid optional signal values are dropped and reported as warnings.',
  'Per-participant values are reported separately; aggregate medians are descriptive and must not be used as group or individual conclusions.',
  'Sessions marked simulatedSignals: true contain synthetic signal values and are not physiological evidence.',
  'Symbolic-space metrics are descriptive summaries of optional, system-produced parameters; they do not establish meaning, clinical validity, or causality.',
]

export interface Lsm0NegativeControl {
  method: 'within_participant_deterministic_shuffle'
  seed: number
  participants: Array<{ participantId: string; associations: Lsm0AssociationResult[] }>
  aggregate: Lsm0AssociationAggregate[]
}

export interface Lsm0EvaluationReport {
  version: typeof LSM0_EVAL_VERSION
  prespecification: Lsm0Prespecification
  input: {
    rowCount: number
    acceptedRows: number
    rejectedRows: number
    duplicateRows: number
    warningCount: number
  }
  dataset: {
    participantCount: number
    sessionCount: number
    syntheticSignalSessions: number
  }
  participants: Lsm0ParticipantReport[]
  aggregate: Lsm0AggregateReport
  rejected: Lsm0Issue[]
  warnings: Lsm0Issue[]
  limitations: string[]
  negativeControl?: Lsm0NegativeControl
}

// ---------------------------------------------------------------------------
// Parsing and normalization
// ---------------------------------------------------------------------------

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001f\u007f]/.test(value)
}

function makeIssue(
  rowIndex: number,
  code: Lsm0IssueCode,
  message: string,
  extra: Pick<Lsm0Issue, 'participantId' | 'sessionId' | 'signal' | 'detail'> = {},
): Lsm0Issue {
  return { rowIndex, code, message, ...extra }
}

function sortIssues(issues: Lsm0Issue[]): Lsm0Issue[] {
  return issues.sort((left, right) => {
    if (left.rowIndex !== right.rowIndex) return left.rowIndex - right.rowIndex
    const code = compareStrings(left.code, right.code)
    if (code !== 0) return code
    const detail = compareStrings(left.detail ?? '', right.detail ?? '')
    if (detail !== 0) return detail
    return compareStrings(
      `${left.participantId ?? ''}\u0000${left.sessionId ?? ''}\u0000${left.signal ?? ''}`,
      `${right.participantId ?? ''}\u0000${right.sessionId ?? ''}\u0000${right.signal ?? ''}`,
    )
  })
}

/**
 * Signal plausibility bounds. These only reject obviously corrupted optional
 * values; they are not clinical thresholds and are not used as outcomes.
 */
function isValidSignalValue(key: Lsm0SignalKey, value: number): boolean {
  if (!Number.isFinite(value)) return false
  switch (key) {
    case 'heartRateBpm':
      return value > 0 && value <= 300
    case 'edaMicroSiemens':
      return value >= 0
    case 'breathRatePerMin':
      return value > 0 && value <= 120
    case 'voiceRmsMean':
      return value >= 0
    case 'voicePauseRatio':
      return value >= 0 && value <= 1
  }
}

function parseSymbolic(
  value: unknown,
  rowIndex: number,
  participantId: string,
  sessionId: string,
): { symbolic?: Lsm0SymbolicParameters; warning?: Lsm0Issue } {
  if (value === undefined) return {}
  if (!isPlainObject(value)) {
    return { warning: makeIssue(rowIndex, 'invalid_symbolic', 'symbolic must be an object when present; the value was ignored', { participantId, sessionId }) }
  }
  const format = value.format
  const motifs = value.motifs
  const figure = value.figure
  const cleanMotifs = Array.isArray(motifs)
    ? motifs.map(item => typeof item === 'string' ? item.trim() : '').filter(item => item.length > 0 && item.length <= 120 && !hasControlCharacters(item))
    : []
  if ((format !== 'encounter' && format !== 'space')
    || !Array.isArray(motifs) || motifs.length === 0 || motifs.length > 3 || cleanMotifs.length !== motifs.length
    || typeof figure !== 'string' || !figure.trim() || figure.trim().length > 120 || hasControlCharacters(figure)) {
    return { warning: makeIssue(rowIndex, 'invalid_symbolic', 'symbolic must contain format encounter|space, 1-3 printable motifs and a printable figure; the value was ignored', { participantId, sessionId }) }
  }
  return { symbolic: { format, motifs: cleanMotifs, figure: figure.trim() } }
}

interface ParseEntryOutcome {
  record?: Lsm0SessionRecord
  rejected?: Lsm0Issue
  warnings: Lsm0Issue[]
}

function parseAgency(value: unknown, rowIndex: number, participantId: string, sessionId: string): { agency?: Lsm0AgencyParameters; warning?: Lsm0Issue } {
  if (value === undefined) return {}
  if (!isPlainObject(value)) {
    return { warning: makeIssue(rowIndex, 'invalid_agency', 'agency must be an object when present; the value was ignored', { participantId, sessionId }) }
  }
  const counts = ['approach', 'stay', 'resume', 'leave', 'reenter'] as const
  for (const key of counts) {
    const count = value[key]
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > 10_000) {
      return { warning: makeIssue(rowIndex, 'invalid_agency', `agency.${key} must be a nonnegative integer; the value was ignored`, { participantId, sessionId }) }
    }
  }
  if (typeof value.leftEarly !== 'boolean') {
    return { warning: makeIssue(rowIndex, 'invalid_agency', 'agency.leftEarly must be a boolean; the value was ignored', { participantId, sessionId }) }
  }
  if (typeof value.durationSec !== 'number' || !Number.isFinite(value.durationSec) || value.durationSec <= 0) {
    return { warning: makeIssue(rowIndex, 'invalid_agency', 'agency.durationSec must be a positive number; the value was ignored', { participantId, sessionId }) }
  }
  return {
    agency: {
      approach: value.approach as number,
      stay: value.stay as number,
      resume: value.resume as number,
      leave: value.leave as number,
      reenter: value.reenter as number,
      leftEarly: value.leftEarly,
      durationSec: value.durationSec,
    },
  }
}

function parseOne(value: unknown, rowIndex: number): ParseEntryOutcome {
  const warnings: Lsm0Issue[] = []
  if (!isPlainObject(value)) {
    return { rejected: makeIssue(rowIndex, 'invalid_record', 'record must be a JSON object'), warnings }
  }
  if (value.version !== LSM0_RECORD_VERSION) {
    return {
      rejected: makeIssue(rowIndex, 'unsupported_version', `record version must be "${LSM0_RECORD_VERSION}"`),
      warnings,
    }
  }

  const participantId = typeof value.participantId === 'string' ? value.participantId.trim() : ''
  if (!participantId || participantId.length > 200 || hasControlCharacters(participantId)) {
    return {
      rejected: makeIssue(rowIndex, 'invalid_participant_id', 'participantId must be a non-empty printable string of at most 200 characters'),
      warnings,
    }
  }
  const sessionId = typeof value.sessionId === 'string' ? value.sessionId.trim() : ''
  if (!sessionId || sessionId.length > 200 || hasControlCharacters(sessionId)) {
    return {
      rejected: makeIssue(rowIndex, 'invalid_session_id', 'sessionId must be a non-empty printable string of at most 200 characters', { participantId }),
      warnings,
    }
  }

  const capturedMs = typeof value.capturedAt === 'string' ? Date.parse(value.capturedAt) : Number.NaN
  if (!Number.isFinite(capturedMs)) {
    return {
      rejected: makeIssue(rowIndex, 'invalid_captured_at', 'capturedAt must be a parseable date string', { participantId, sessionId }),
      warnings,
    }
  }

  if (!isSomaticCapture(value.somatic)) {
    return {
      rejected: makeIssue(rowIndex, 'invalid_somatic', 'somatic must be a valid SomaticCapture', { participantId, sessionId }),
      warnings,
    }
  }

  let signals: Lsm0SignalParameters | undefined
  if (value.signals !== undefined) {
    if (!isPlainObject(value.signals)) {
      warnings.push(makeIssue(rowIndex, 'signals_not_object', 'signals must be an object when present; the value was ignored', { participantId, sessionId }))
    } else {
      const parsedSignals: Lsm0SignalParameters = {}
      for (const key of SIGNAL_KEYS) {
        const raw = value.signals[key]
        if (raw === undefined) continue
        if (typeof raw !== 'number' || !isValidSignalValue(key, raw)) {
          warnings.push(makeIssue(
            rowIndex,
            'signal_value_invalid',
            `signal ${key} must be a finite number within the prespecified plausibility bounds; the value was ignored`,
            { participantId, sessionId, signal: key },
          ))
          continue
        }
        parsedSignals[key] = raw
      }
      const unknownKeys = Object.keys(value.signals)
        .filter(key => !(SIGNAL_KEYS as readonly string[]).includes(key))
        .sort(compareStrings)
      for (const key of unknownKeys) {
        warnings.push(makeIssue(rowIndex, 'unknown_signal_key', `unknown signal key "${key}" was ignored`, { participantId, sessionId, detail: key }))
      }
      signals = parsedSignals
    }
  }

  let simulatedSignals: boolean | undefined
  if (value.simulatedSignals !== undefined) {
    if (typeof value.simulatedSignals === 'boolean') simulatedSignals = value.simulatedSignals
    else warnings.push(makeIssue(rowIndex, 'invalid_simulated_flag', 'simulatedSignals must be a boolean when present; the value was ignored', { participantId, sessionId }))
  }

  const symbolicResult = parseSymbolic(value.symbolic, rowIndex, participantId, sessionId)
  if (symbolicResult.warning) warnings.push(symbolicResult.warning)
  const agencyResult = parseAgency(value.agency, rowIndex, participantId, sessionId)
  if (agencyResult.warning) warnings.push(agencyResult.warning)

  const capture = value.somatic
  const record: Lsm0SessionRecord = {
    version: LSM0_RECORD_VERSION,
    participantId,
    sessionId,
    capturedAt: new Date(capturedMs).toISOString(),
    somatic: {
      region: capture.region,
      sensation: capture.sensation,
      intensity: capture.intensity,
      breath: capture.breath,
      fragments: [...capture.fragments],
      ...(capture.certainty !== undefined ? { certainty: capture.certainty } : {}),
    },
    ...(signals !== undefined ? { signals } : {}),
    ...(symbolicResult.symbolic !== undefined ? { symbolic: symbolicResult.symbolic } : {}),
    ...(agencyResult.agency !== undefined ? { agency: agencyResult.agency } : {}),
    ...(simulatedSignals !== undefined ? { simulatedSignals } : {}),
  }
  return { record, warnings }
}

function parseEntries(entries: ReadonlyArray<{ value: unknown; rowIndex: number }>): Lsm0ParseResult {
  const records: Lsm0NormalizedRecord[] = []
  const rejected: Lsm0Issue[] = []
  const warnings: Lsm0Issue[] = []
  for (const entry of entries) {
    const outcome = parseOne(entry.value, entry.rowIndex)
    warnings.push(...outcome.warnings)
    if (outcome.record) records.push({ record: outcome.record, rowIndex: entry.rowIndex })
    else if (outcome.rejected) rejected.push(outcome.rejected)
  }
  return { records, rejected: sortIssues(rejected), warnings: sortIssues(warnings) }
}

/** Parse already-decoded records (one array entry per input row). */
export function parseLsm0Values(values: readonly unknown[]): Lsm0ParseResult {
  return parseEntries(values.map((value, rowIndex) => ({ value, rowIndex })))
}

/**
 * Parse a local fixture text in one of these forms:
 * - a JSON array of records;
 * - a JSON object `{ "records": [...] }`;
 * - a single JSON record object;
 * - JSONL with one JSON record per non-empty line.
 *
 * Structural fixture errors (for example a non-array "records" member) throw
 * `invalid_lsm0_fixture`. Per-record problems are returned as rejected rows.
 */
export function parseLsm0Text(text: string): Lsm0ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { records: [], rejected: [], warnings: [] }

  let whole: unknown
  let wholeParsed = true
  try {
    whole = JSON.parse(trimmed)
  } catch {
    wholeParsed = false
  }

  if (wholeParsed) {
    if (Array.isArray(whole)) return parseLsm0Values(whole)
    if (isPlainObject(whole) && Object.prototype.hasOwnProperty.call(whole, 'records')) {
      if (!Array.isArray(whole.records)) throw new Error('invalid_lsm0_fixture: "records" must be an array')
      return parseLsm0Values(whole.records)
    }
    return parseLsm0Values([whole])
  }

  const entries: Array<{ value: unknown; rowIndex: number }> = []
  const rejected: Lsm0Issue[] = []
  const lines = text.split(/\r?\n/)
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    if (!line.trim()) continue
    try {
      entries.push({ value: JSON.parse(line), rowIndex: lineIndex })
    } catch {
      rejected.push(makeIssue(lineIndex, 'invalid_json', 'line is not valid JSON'))
    }
  }
  const parsed = parseEntries(entries)
  return {
    records: parsed.records,
    rejected: sortIssues([...parsed.rejected, ...rejected]),
    warnings: parsed.warnings,
  }
}

/** Convenience: parse fixture text and evaluate it in one call. */
export function evaluateLsm0Text(text: string, options: { negativeControl?: boolean; seed?: number } = {}): Lsm0EvaluationReport {
  return evaluateLsm0(parseLsm0Text(text), options)
}

/** Convenience: parse decoded values and evaluate them in one call. */
export function evaluateLsm0Values(values: readonly unknown[], options: { negativeControl?: boolean; seed?: number } = {}): Lsm0EvaluationReport {
  return evaluateLsm0(parseLsm0Values(values), options)
}

// ---------------------------------------------------------------------------
// Feature flattening and metric primitives
// ---------------------------------------------------------------------------

function copySignals(signals: Lsm0SignalParameters | undefined): Lsm0SignalParameters {
  const copy: Lsm0SignalParameters = {}
  if (!signals) return copy
  for (const key of SIGNAL_KEYS) {
    const value = signals[key]
    if (value !== undefined) copy[key] = value
  }
  return copy
}

export function flattenLsm0Session(record: Lsm0SessionRecord): Lsm0FeatureVector {
  const capture = record.somatic
  return {
    participantId: record.participantId,
    sessionId: record.sessionId,
    capturedAt: record.capturedAt,
    region: capture.region,
    sensation: capture.sensation,
    breath: capture.breath,
    intensity: capture.intensity,
    certainty: capture.certainty,
    primaryFragment: capture.fragments[0],
    fragmentSet: [...new Set(capture.fragments)].sort(compareStrings),
    signals: copySignals(record.signals),
    symbolic: record.symbolic === undefined ? undefined : { format: record.symbolic.format, motifs: [...record.symbolic.motifs], figure: record.symbolic.figure },
    agency: record.agency === undefined ? undefined : { ...record.agency },
    simulatedSignals: record.simulatedSignals === true,
  }
}

function round6(value: number): number {
  const rounded = Math.round(value * 1e6) / 1e6
  return Object.is(rounded, -0) ? 0 : rounded
}

export function summarizeNumeric(values: readonly number[]): Lsm0NumericSummary {
  const finite = values.filter(value => Number.isFinite(value))
  const n = finite.length
  if (n === 0) return { n: 0, mean: null, sd: null, cv: null, min: null, max: null }
  let sum = 0
  let min = finite[0]
  let max = finite[0]
  for (const value of finite) {
    sum += value
    if (value < min) min = value
    if (value > max) max = value
  }
  const mean = sum / n
  let sd: number | null = null
  if (n >= 2) {
    let squares = 0
    for (const value of finite) {
      const deviation = value - mean
      squares += deviation * deviation
    }
    sd = Math.sqrt(squares / (n - 1))
  }
  const cv = sd !== null && mean !== 0 ? sd / mean : null
  return {
    n,
    mean: round6(mean),
    sd: sd === null ? null : round6(sd),
    cv: cv === null ? null : round6(cv),
    min: round6(min),
    max: round6(max),
  }
}

export function categoricalStability(values: readonly string[]): Lsm0CategoricalStability | null {
  if (values.length < MIN_SESSIONS_FOR_STABILITY) return null
  const counts = new Map<string, number>()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  const entries = [...counts.entries()].sort((left, right) => {
    if (left[1] !== right[1]) return right[1] - left[1]
    return compareStrings(left[0], right[0])
  })
  const [modalValue, modalCount] = entries[0]
  return {
    n: values.length,
    distinctValues: entries.length,
    modalValue,
    modeShare: round6(modalCount / values.length),
  }
}

/** Mean pairwise Jaccard similarity over non-empty sets. */
export function meanPairwiseJaccard(sets: ReadonlyArray<readonly string[]>): number | null {
  if (sets.length < MIN_SESSIONS_FOR_STABILITY) return null
  const normalized = sets.map(set => new Set(set))
  let total = 0
  let pairCount = 0
  for (let leftIndex = 0; leftIndex < normalized.length; leftIndex++) {
    for (let rightIndex = leftIndex + 1; rightIndex < normalized.length; rightIndex++) {
      const left = normalized[leftIndex]
      const right = normalized[rightIndex]
      let intersection = 0
      for (const value of left) if (right.has(value)) intersection++
      const union = left.size + right.size - intersection
      if (union === 0) continue
      total += intersection / union
      pairCount++
    }
  }
  return pairCount === 0 ? null : round6(total / pairCount)
}

function averageRanks(values: readonly number[]): number[] {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => {
      if (left.value !== right.value) return left.value - right.value
      return left.index - right.index
    })
  const ranks = new Array<number>(values.length).fill(0)
  let cursor = 0
  while (cursor < order.length) {
    let end = cursor
    while (end + 1 < order.length && order[end + 1].value === order[cursor].value) end++
    const rank = (cursor + 1 + end + 1) / 2
    for (let index = cursor; index <= end; index++) ranks[order[index].index] = rank
    cursor = end + 1
  }
  return ranks
}

function correlate(left: readonly number[], right: readonly number[]): number | null {
  const n = left.length
  let leftMean = 0
  let rightMean = 0
  for (let index = 0; index < n; index++) {
    leftMean += left[index]
    rightMean += right[index]
  }
  leftMean /= n
  rightMean /= n
  let covariance = 0
  let leftVariance = 0
  let rightVariance = 0
  for (let index = 0; index < n; index++) {
    const leftDeviation = left[index] - leftMean
    const rightDeviation = right[index] - rightMean
    covariance += leftDeviation * rightDeviation
    leftVariance += leftDeviation * leftDeviation
    rightVariance += rightDeviation * rightDeviation
  }
  const denominator = Math.sqrt(leftVariance * rightVariance)
  if (!(denominator > 0)) return null
  return round6(covariance / denominator)
}

/**
 * Spearman rank correlation with average ranks for ties, then Pearson on the
 * ranks. Returns null for fewer than two pairs, non-finite input, or a
 * zero-variance rank series.
 */
export function spearmanRho(left: readonly number[], right: readonly number[]): number | null {
  if (left.length !== right.length || left.length < 2) return null
  if (left.some(value => !Number.isFinite(value)) || right.some(value => !Number.isFinite(value))) return null
  return correlate(averageRanks(left), averageRanks(right))
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  const value = sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
  return round6(value)
}

// ---------------------------------------------------------------------------
// Per-participant evaluation
// ---------------------------------------------------------------------------

function associateIntensityWithSignal(
  sessions: readonly Lsm0FeatureVector[],
  signal: Lsm0SignalKey,
): Lsm0AssociationResult {
  const intensities: number[] = []
  const signalValues: number[] = []
  for (const session of sessions) {
    const value = session.signals[signal]
    if (value === undefined) continue
    intensities.push(session.intensity)
    signalValues.push(value)
  }
  const n = intensities.length
  if (n < MIN_PAIRED_SESSIONS_FOR_ASSOCIATION) {
    return { report: 'intensity', signal, method: 'spearman', n, rho: null, status: 'insufficient_pairs' }
  }
  const rho = spearmanRho(intensities, signalValues)
  if (rho === null) {
    return { report: 'intensity', signal, method: 'spearman', n, rho: null, status: 'zero_variance' }
  }
  return { report: 'intensity', signal, method: 'spearman', n, rho, status: 'computed' }
}

function evaluateSymbolic(sessions: readonly Lsm0FeatureVector[]): Lsm0SymbolicReport {
  const withSymbolic = sessions.filter((session): session is Lsm0FeatureVector & { symbolic: Lsm0SymbolicParameters } => session.symbolic !== undefined)
  const primaryMotifs = withSymbolic.map(session => session.symbolic.motifs[0])
  const motifSets = withSymbolic.map(session => [...new Set(session.symbolic.motifs)].sort(compareStrings))
  const figures = withSymbolic.map(session => session.symbolic.figure)
  const pairCounts = new Map<string, { region: string; sensation: string; primaryMotif: string; count: number }>()
  for (const session of withSymbolic) {
    const primaryMotif = session.symbolic.motifs[0]
    const key = `${session.region}\u0000${session.sensation}\u0000${primaryMotif}`
    const existing = pairCounts.get(key)
    if (existing) existing.count += 1
    else pairCounts.set(key, { region: session.region, sensation: session.sensation, primaryMotif, count: 1 })
  }
  const somaticPairs = [...pairCounts.values()].sort((left, right) => {
    if (left.count !== right.count) return right.count - left.count
    const region = compareStrings(left.region, right.region)
    if (region !== 0) return region
    const sensation = compareStrings(left.sensation, right.sensation)
    if (sensation !== 0) return sensation
    return compareStrings(left.primaryMotif, right.primaryMotif)
  })
  return {
    sessionCount: withSymbolic.length,
    primaryMotif: categoricalStability(primaryMotifs),
    motifSetStability: meanPairwiseJaccard(motifSets),
    figure: categoricalStability(figures),
    somaticPairs,
  }
}

function evaluateParticipant(participantId: string, sessions: readonly Lsm0FeatureVector[]): Lsm0ParticipantReport {
  const sessionCount = sessions.length
  const intensityValues = sessions.map(session => session.intensity)
  const intensitySummary = summarizeNumeric(intensityValues)
  const intensityRange = intensitySummary.max !== null && intensitySummary.min !== null
    ? intensitySummary.max - intensitySummary.min
    : 0

  const certaintyCounts: Record<SomaticCertainty, number> = { clear: 0, mixed: 0, unsure: 0 }
  let certaintySessions = 0
  for (const session of sessions) {
    if (!session.certainty) continue
    certaintySessions += 1
    certaintyCounts[session.certainty] += 1
  }
  const certaintyMode = (Object.entries(certaintyCounts) as Array<[SomaticCertainty, number]>)
    .sort((left, right) => right[1] - left[1] || compareStrings(left[0], right[0]))[0]
  const certainty: Lsm0CertaintyReport = {
    sessionsWithValue: certaintySessions,
    counts: certaintyCounts,
    modeShare: certaintySessions > 0 ? round6(certaintyMode[1] / certaintySessions) : null,
  }

  const agencyReport: Lsm0AgencyReport = { sessionsWithAgency: 0, approach: 0, stay: 0, resume: 0, leave: 0, reenter: 0, leftEarlySessions: 0 }
  for (const session of sessions) {
    if (!session.agency) continue
    agencyReport.sessionsWithAgency += 1
    agencyReport.approach += session.agency.approach
    agencyReport.stay += session.agency.stay
    agencyReport.resume += session.agency.resume
    agencyReport.leave += session.agency.leave
    agencyReport.reenter += session.agency.reenter
    if (session.agency.leftEarly) agencyReport.leftEarlySessions += 1
  }

  const signals = {} as Record<Lsm0SignalKey, Lsm0SignalReport>
  const missingSessionsBySignal = {} as Record<Lsm0SignalKey, number>
  for (const key of SIGNAL_KEYS) {
    const values = sessions.flatMap(session => {
      const value = session.signals[key]
      return value === undefined ? [] : [value]
    })
    signals[key] = {
      coverage: sessionCount === 0 ? 0 : round6(values.length / sessionCount),
      summary: summarizeNumeric(values),
    }
    missingSessionsBySignal[key] = sessionCount - values.length
  }

  return {
    participantId,
    sessionCount,
    firstCapturedAt: sessions[0].capturedAt,
    lastCapturedAt: sessions[sessionCount - 1].capturedAt,
    syntheticSignalSessions: sessions.filter(session => session.simulatedSignals).length,
    categoricalStability: {
      region: categoricalStability(sessions.map(session => session.region)),
      sensation: categoricalStability(sessions.map(session => session.sensation)),
      breath: categoricalStability(sessions.map(session => session.breath)),
      primaryFragment: categoricalStability(sessions.map(session => session.primaryFragment)),
    },
    fragmentSetStability: meanPairwiseJaccard(sessions.map(session => session.fragmentSet)),
    intensityStability: sessionCount < MIN_SESSIONS_FOR_STABILITY
      ? null
      : round6(1 - intensityRange / (LSM0_PRESPECIFICATION.intensityScale.max - LSM0_PRESPECIFICATION.intensityScale.min)),
    intensity: intensitySummary,
    certainty,
    agency: agencyReport,
    signals,
    symbolic: evaluateSymbolic(sessions),
    associations: PRIMARY_ASSOCIATIONS.map(pair => associateIntensityWithSignal(sessions, pair.signal)),
    missing: {
      sessionsWithoutAnySignal: sessions.filter(session => SIGNAL_KEYS.every(key => session.signals[key] === undefined)).length,
      missingSessionsBySignal,
    },
  }
}

// ---------------------------------------------------------------------------
// Aggregate evaluation
// ---------------------------------------------------------------------------

function medianOf(participants: readonly Lsm0ParticipantReport[], pick: (participant: Lsm0ParticipantReport) => number | null): number | null {
  const values: number[] = []
  for (const participant of participants) {
    const value = pick(participant)
    if (value !== null) values.push(value)
  }
  return median(values)
}

function buildAggregate(participants: readonly Lsm0ParticipantReport[]): Lsm0AggregateReport {
  const associations: Lsm0AssociationAggregate[] = PRIMARY_ASSOCIATIONS.map(pair => {
    const rhos: number[] = []
    for (const participant of participants) {
      const result = participant.associations.find(candidate => candidate.signal === pair.signal)
      if (result?.status === 'computed' && result.rho !== null) rhos.push(result.rho)
    }
    return {
      report: pair.report,
      signal: pair.signal,
      participantsWithValue: rhos.length,
      positive: rhos.filter(value => value > 0).length,
      negative: rhos.filter(value => value < 0).length,
      zero: rhos.filter(value => value === 0).length,
      medianRho: median(rhos),
    }
  })

  const signalCoverageMedian = {} as Record<Lsm0SignalKey, number | null>
  for (const key of SIGNAL_KEYS) {
    signalCoverageMedian[key] = medianOf(participants, participant => participant.signals[key].coverage)
  }

  return {
    participantCount: participants.length,
    participantsWithStability: participants.filter(participant => participant.sessionCount >= MIN_SESSIONS_FOR_STABILITY).length,
    categoricalStabilityMedian: {
      region: medianOf(participants, participant => participant.categoricalStability.region?.modeShare ?? null),
      sensation: medianOf(participants, participant => participant.categoricalStability.sensation?.modeShare ?? null),
      breath: medianOf(participants, participant => participant.categoricalStability.breath?.modeShare ?? null),
      primaryFragment: medianOf(participants, participant => participant.categoricalStability.primaryFragment?.modeShare ?? null),
    },
    fragmentSetStabilityMedian: medianOf(participants, participant => participant.fragmentSetStability),
    intensityStabilityMedian: medianOf(participants, participant => participant.intensityStability),
    signalCoverageMedian,
    symbolic: {
      sessionsWithSymbolic: participants.reduce((sum, participant) => sum + participant.symbolic.sessionCount, 0),
      primaryMotifStabilityMedian: medianOf(participants, participant => participant.symbolic.primaryMotif?.modeShare ?? null),
      motifSetStabilityMedian: medianOf(participants, participant => participant.symbolic.motifSetStability),
      figureStabilityMedian: medianOf(participants, participant => participant.symbolic.figure?.modeShare ?? null),
    },
    associations,
  }
}

function compareNormalizedRecords(left: Lsm0NormalizedRecord, right: Lsm0NormalizedRecord): number {
  const participant = compareStrings(left.record.participantId, right.record.participantId)
  if (participant !== 0) return participant
  const captured = compareStrings(left.record.capturedAt, right.record.capturedAt)
  if (captured !== 0) return captured
  const session = compareStrings(left.record.sessionId, right.record.sessionId)
  if (session !== 0) return session
  return left.rowIndex - right.rowIndex
}

/** Deterministic within-participant shuffle of present signal values, preserving missingness. */
export function shuffleSignalValues(parsed: Lsm0ParseResult, seed = 1): Lsm0ParseResult {
  let state = seed >>> 0
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 0x100000000
  }
  const records = parsed.records.map(item => ({ ...item, record: { ...item.record, signals: item.record.signals ? { ...item.record.signals } : undefined } }))
  const participantIds = [...new Set(records.map(item => item.record.participantId))].sort(compareStrings)
  for (const participantId of participantIds) {
    const members = records.filter(item => item.record.participantId === participantId)
    for (const key of SIGNAL_KEYS) {
      const values = members.map(item => item.record.signals?.[key]).filter((value): value is number => typeof value === 'number')
      for (let index = values.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(random() * (index + 1))
        ;[values[index], values[swap]] = [values[swap], values[index]]
      }
      let cursor = 0
      for (const item of members) {
        if (typeof item.record.signals?.[key] !== 'number') continue
        if (!item.record.signals) item.record.signals = {}
        item.record.signals[key] = values[cursor]
        cursor += 1
      }
    }
  }
  return { ...parsed, records }
}

/**
 * Evaluate parsed rows. Duplicate (participantId, sessionId) pairs are rejected
 * deterministically after sorting by capturedAt, sessionId, then row index.
 */
export function evaluateLsm0(parsed: Lsm0ParseResult, options: { negativeControl?: boolean; seed?: number } = {}): Lsm0EvaluationReport {
  const warnings = sortIssues([...parsed.warnings])
  const rejected = sortIssues([...parsed.rejected])
  const sorted = [...parsed.records].sort(compareNormalizedRecords)

  const kept: Lsm0NormalizedRecord[] = []
  const seenSessions = new Set<string>()
  for (const item of sorted) {
    const key = `${item.record.participantId}\u0000${item.record.sessionId}`
    if (seenSessions.has(key)) {
      rejected.push(makeIssue(
        item.rowIndex,
        'duplicate_session',
        'duplicate participantId and sessionId; the later row was ignored',
        { participantId: item.record.participantId, sessionId: item.record.sessionId },
      ))
      continue
    }
    seenSessions.add(key)
    kept.push(item)
  }
  sortIssues(rejected)

  const features = kept.map(item => flattenLsm0Session(item.record))
  const byParticipant = new Map<string, Lsm0FeatureVector[]>()
  for (const feature of features) {
    const existing = byParticipant.get(feature.participantId)
    if (existing) existing.push(feature)
    else byParticipant.set(feature.participantId, [feature])
  }
  const participantIds = [...byParticipant.keys()].sort(compareStrings)
  const participants = participantIds.map(participantId => evaluateParticipant(participantId, byParticipant.get(participantId) ?? []))

  const report: Lsm0EvaluationReport = {
    version: LSM0_EVAL_VERSION,
    prespecification: {
      ...LSM0_PRESPECIFICATION,
      primaryAssociations: LSM0_PRESPECIFICATION.primaryAssociations.map(pair => ({ ...pair })),
      signalKeys: [...LSM0_PRESPECIFICATION.signalKeys],
      intensityScale: { ...LSM0_PRESPECIFICATION.intensityScale },
    },
    input: {
      rowCount: parsed.records.length + parsed.rejected.length,
      acceptedRows: kept.length,
      rejectedRows: rejected.length,
      duplicateRows: rejected.filter(issue => issue.code === 'duplicate_session').length,
      warningCount: warnings.length,
    },
    dataset: {
      participantCount: participants.length,
      sessionCount: features.length,
      syntheticSignalSessions: features.filter(feature => feature.simulatedSignals).length,
    },
    participants,
    aggregate: buildAggregate(participants),
    rejected,
    warnings,
    limitations: [...LSM0_LIMITATIONS],
  }
  if (options.negativeControl) {
    const seed = options.seed ?? 1
    const shuffled = evaluateLsm0(shuffleSignalValues(parsed, seed), {})
    report.negativeControl = {
      method: 'within_participant_deterministic_shuffle',
      seed,
      participants: shuffled.participants.map(participant => ({ participantId: participant.participantId, associations: participant.associations })),
      aggregate: shuffled.aggregate.associations,
    }
  }
  return report
}

// ---------------------------------------------------------------------------
// Text report
// ---------------------------------------------------------------------------

const MAX_ISSUES_IN_TEXT = 20

function formatMetric(value: number | null): string {
  if (value === null) return 'n/a'
  const rounded = Number(value.toFixed(3))
  return String(rounded === 0 ? 0 : rounded)
}

function formatStability(stability: Lsm0CategoricalStability | null): string {
  if (!stability) return 'n/a'
  return `${stability.modalValue} ${formatMetric(stability.modeShare)}`
}

function formatSignalSummary(report: Lsm0SignalReport): string {
  const summary = report.summary
  return `coverage ${formatMetric(report.coverage)}; n=${summary.n} mean=${formatMetric(summary.mean)} sd=${formatMetric(summary.sd)} cv=${formatMetric(summary.cv)} min=${formatMetric(summary.min)} max=${formatMetric(summary.max)}`
}

function formatAssociation(association: Lsm0AssociationResult): string {
  const label = `intensity ~ ${association.signal}`
  if (association.status === 'computed') return `${label}: rho=${formatMetric(association.rho)} (n=${association.n})`
  if (association.status === 'insufficient_pairs') {
    return `${label}: not computed (insufficient paired sessions; n=${association.n}, minimum ${MIN_PAIRED_SESSIONS_FOR_ASSOCIATION})`
  }
  return `${label}: not computed (zero variance; n=${association.n})`
}

function formatIssue(issue: Lsm0Issue): string {
  const context: string[] = []
  if (issue.participantId) context.push(`${issue.participantId}/${issue.sessionId ?? '?'}`)
  if (issue.signal) context.push(`signal ${issue.signal}`)
  if (issue.detail) context.push(`key ${issue.detail}`)
  const suffix = context.length > 0 ? ` (${context.join(', ')})` : ''
  return `row ${issue.rowIndex}: ${issue.code}${suffix} - ${issue.message}`
}

function appendIssues(lines: string[], title: string, issues: readonly Lsm0Issue[]) {
  lines.push('', title)
  if (issues.length === 0) {
    lines.push('- none')
    return
  }
  for (const issue of issues.slice(0, MAX_ISSUES_IN_TEXT)) lines.push(`- ${formatIssue(issue)}`)
  if (issues.length > MAX_ISSUES_IN_TEXT) {
    lines.push(`- ${issues.length - MAX_ISSUES_IN_TEXT} more issue(s) omitted from the text report; use --out for the complete JSON report`)
  }
}

/**
 * Render a deterministic, human-readable report. Displayed numbers are rounded
 * to three decimals; the JSON report keeps six-decimal values.
 */
export function formatLsm0Report(report: Lsm0EvaluationReport): string {
  const lines: string[] = []
  lines.push('LSM-0 offline evaluation baseline')
  lines.push('Descriptive baseline only: this is not a clinical result, a diagnosis, or evidence of efficacy.')
  lines.push('')
  lines.push('Prespecified metrics')
  lines.push(`- stability: mode share for region, sensation, breath, and primary fragment; intensity stability = 1 - (max - min) / 4; fragment-set stability = mean pairwise Jaccard; minimum ${MIN_SESSIONS_FOR_STABILITY} sessions`)
  lines.push(`- association: ${LSM0_PRESPECIFICATION.associationMethod} rank correlation (Pearson on average ranks) between self-reported intensity and a fixed signal parameter; minimum ${MIN_PAIRED_SESSIONS_FOR_ASSOCIATION} paired sessions`)
  lines.push(`- primary pairs: ${PRIMARY_ASSOCIATIONS.map(pair => `intensity ~ ${pair.signal}`).join('; ')}`)
  lines.push('- no p-values, no significance tests, no metric or subgroup selection')
  lines.push('')
  lines.push('Input')
  lines.push(`- rows: ${report.input.rowCount}`)
  lines.push(`- accepted sessions: ${report.input.acceptedRows}`)
  lines.push(`- rejected rows: ${report.input.rejectedRows} (duplicates: ${report.input.duplicateRows})`)
  lines.push(`- warnings: ${report.input.warningCount}`)
  lines.push(`- participants: ${report.dataset.participantCount}`)
  lines.push(`- synthetic signal sessions: ${report.dataset.syntheticSignalSessions}`)
  lines.push('')
  lines.push('Participants')

  if (report.participants.length === 0) {
    lines.push('- none: no structurally valid session rows were accepted')
  }
  for (const participant of report.participants) {
    lines.push('')
    lines.push(participant.participantId)
    lines.push(`  sessions: ${participant.sessionCount} (${participant.firstCapturedAt} to ${participant.lastCapturedAt})`)
    if (participant.syntheticSignalSessions > 0) {
      lines.push(`  synthetic signal sessions: ${participant.syntheticSignalSessions} (not physiological evidence)`)
    }
    lines.push(`  categorical stability: region ${formatStability(participant.categoricalStability.region)}; sensation ${formatStability(participant.categoricalStability.sensation)}; breath ${formatStability(participant.categoricalStability.breath)}; primary fragment ${formatStability(participant.categoricalStability.primaryFragment)}`)
    lines.push(`  fragment-set stability: ${formatMetric(participant.fragmentSetStability)}`)
    lines.push(`  intensity stability: ${formatMetric(participant.intensityStability)}; intensity summary: ${formatSignalSummary({ coverage: 1, summary: participant.intensity })}`)
    lines.push(`  agency: sessions ${participant.agency.sessionsWithAgency}; approach ${participant.agency.approach}; stay ${participant.agency.stay}; resume ${participant.agency.resume}; leave ${participant.agency.leave}; reenter ${participant.agency.reenter}; left early ${participant.agency.leftEarlySessions}`)
    lines.push(`  certainty: sessions ${participant.certainty.sessionsWithValue}; clear ${participant.certainty.counts.clear}; mixed ${participant.certainty.counts.mixed}; unsure ${participant.certainty.counts.unsure}; mode share ${formatMetric(participant.certainty.modeShare)}`)
    lines.push(`  symbolic sessions: ${participant.symbolic.sessionCount}; primary motif stability: ${formatStability(participant.symbolic.primaryMotif)}; motif-set stability: ${formatMetric(participant.symbolic.motifSetStability)}; figure stability: ${formatStability(participant.symbolic.figure)}`)
    if (participant.symbolic.somaticPairs.length > 0) {
      const pairs = participant.symbolic.somaticPairs.slice(0, 5).map(pair => `${pair.region}/${pair.sensation}~${pair.primaryMotif} ${pair.count}`).join('; ')
      lines.push(`  somatic~symbolic paired counts: ${pairs}`)
    }
    for (const key of SIGNAL_KEYS) {
      lines.push(`  signal ${key}: ${formatSignalSummary(participant.signals[key])}`)
    }
    lines.push('  associations:')
    for (const association of participant.associations) lines.push(`  - ${formatAssociation(association)}`)
    const missingParts = SIGNAL_KEYS.map(key => `${key}=${participant.missing.missingSessionsBySignal[key]}`).join(', ')
    lines.push(`  missing: sessions without any signal ${participant.missing.sessionsWithoutAnySignal}; ${missingParts}`)
  }

  lines.push('')
  lines.push('Aggregate (descriptive across participants; not a group or individual conclusion)')
  lines.push(`- participants with stability metrics: ${report.aggregate.participantsWithStability} of ${report.aggregate.participantCount}`)
  lines.push(`- median categorical stability: region ${formatMetric(report.aggregate.categoricalStabilityMedian.region)}; sensation ${formatMetric(report.aggregate.categoricalStabilityMedian.sensation)}; breath ${formatMetric(report.aggregate.categoricalStabilityMedian.breath)}; primary fragment ${formatMetric(report.aggregate.categoricalStabilityMedian.primaryFragment)}`)
  lines.push(`- median fragment-set stability: ${formatMetric(report.aggregate.fragmentSetStabilityMedian)}`)
  lines.push(`- median intensity stability: ${formatMetric(report.aggregate.intensityStabilityMedian)}`)
  lines.push(`- symbolic sessions: ${report.aggregate.symbolic.sessionsWithSymbolic}; median primary-motif stability ${formatMetric(report.aggregate.symbolic.primaryMotifStabilityMedian)}; median motif-set stability ${formatMetric(report.aggregate.symbolic.motifSetStabilityMedian)}; median figure stability ${formatMetric(report.aggregate.symbolic.figureStabilityMedian)}`)
  const coverageParts = SIGNAL_KEYS.map(key => `${key} ${formatMetric(report.aggregate.signalCoverageMedian[key])}`).join('; ')
  lines.push(`- median signal coverage: ${coverageParts}`)
  for (const association of report.aggregate.associations) {
    const label = `intensity ~ ${association.signal}`
    if (association.participantsWithValue === 0) {
      lines.push(`- ${label}: not computed for any participant`)
    } else {
      lines.push(`- ${label}: computed for ${association.participantsWithValue} participant(s); positive ${association.positive}, negative ${association.negative}, zero ${association.zero}; median rho ${formatMetric(association.medianRho)}`)
    }
  }

  appendIssues(lines, 'Warnings', report.warnings)
  appendIssues(lines, 'Rejected rows', report.rejected)

  if (report.negativeControl) {
    lines.push('')
    lines.push('Negative control (deterministic within-participant signal shuffle)')
    lines.push(`- seed: ${report.negativeControl.seed}`)
    for (const association of report.negativeControl.aggregate) {
      lines.push(`- intensity ~ ${association.signal}: participants ${association.participantsWithValue}; positive ${association.positive}, negative ${association.negative}, zero ${association.zero}; median rho ${formatMetric(association.medianRho)}`)
    }
    lines.push('- This is a negative-control description, not a significance test.')
  }

  lines.push('')
  lines.push('Limitations')
  for (const limitation of report.limitations) lines.push(`- ${limitation}`)
  return lines.join('\n')
}
