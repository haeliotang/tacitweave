// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import {
  LSM0_LIMITATIONS,
  MIN_PAIRED_SESSIONS_FOR_ASSOCIATION,
  PRIMARY_ASSOCIATIONS,
  SIGNAL_KEYS,
  categoricalStability,
  evaluateLsm0,
  evaluateLsm0Text,
  evaluateLsm0Values,
  flattenLsm0Session,
  formatLsm0Report,
  meanPairwiseJaccard,
  parseLsm0Text,
  parseLsm0Values,
  spearmanRho,
  summarizeNumeric,
  type Lsm0SessionRecord,
  type Lsm0SignalParameters,
} from './lsm0-eval'
import type { SomaticCapture } from './somatic'

type SessionOverrides = Omit<Partial<Lsm0SessionRecord>, 'somatic' | 'version'> & {
  somatic?: Partial<SomaticCapture>
}

function baseCapture(overrides: Partial<SomaticCapture> = {}): SomaticCapture {
  return { region: 'chest', sensation: 'pressure', intensity: 3, breath: 'held', fragments: ['wet-corridor'], ...overrides }
}

function session(overrides: SessionOverrides = {}): Lsm0SessionRecord {
  const { somatic, signals, ...rest } = overrides
  return {
    version: 'lsm0-session-v1',
    participantId: 'P01',
    sessionId: 'S01',
    capturedAt: '2026-01-01T09:00:00.000Z',
    somatic: baseCapture(somatic),
    ...(signals !== undefined ? { signals } : {}),
    ...rest,
  }
}

function day(date: number): string {
  return `2026-01-${String(date).padStart(2, '0')}T09:00:00.000Z`
}

function stableSessions(): Lsm0SessionRecord[] {
  return [1, 2, 3, 4].map((index) => session({
    sessionId: `S${index}`,
    capturedAt: day(index),
    signals: { heartRateBpm: 66 + index * 2 },
    ...(index === 1 ? { simulatedSignals: true } : {}),
  }))
}

function varyingSessions(participantId = 'P01'): Lsm0SessionRecord[] {
  return [1, 2, 3, 4, 5].map((intensity, index) => session({
    participantId,
    sessionId: `A${index + 1}`,
    capturedAt: day(index + 1),
    somatic: { intensity: intensity as SomaticCapture['intensity'] },
    signals: { heartRateBpm: 60 + index * 5, edaMicroSiemens: 1 + index },
  }))
}

function unstableSessions(participantId = 'P02'): Lsm0SessionRecord[] {
  const captures: Array<Partial<SomaticCapture>> = [
    { region: 'chest', sensation: 'pressure', breath: 'held', intensity: 1, fragments: ['wet-corridor'] },
    { region: 'chest', sensation: 'pressure', breath: 'held', intensity: 3, fragments: ['wet-corridor'] },
    { region: 'head', sensation: 'heat', breath: 'fast', intensity: 2, fragments: ['window-rain'] },
    { region: 'legs', sensation: 'cold', breath: 'even', intensity: 5, fragments: ['window-rain'] },
  ]
  return captures.map((somatic, index) => session({
    participantId,
    sessionId: `U${index + 1}`,
    capturedAt: day(index + 1),
    somatic,
  }))
}

describe('LSM-0 metric primitives', () => {
  it('summarizes numeric values with sample standard deviation and coefficient of variation', () => {
    expect(summarizeNumeric([])).toEqual({ n: 0, mean: null, sd: null, cv: null, min: null, max: null })
    expect(summarizeNumeric([1])).toEqual({ n: 1, mean: 1, sd: null, cv: null, min: 1, max: 1 })
    const summary = summarizeNumeric([1, 2, 3, 4])
    expect(summary.n).toBe(4)
    expect(summary.mean).toBe(2.5)
    expect(summary.sd).toBe(1.290994)
    expect(summary.cv).toBe(0.516398)
    expect(summary.min).toBe(1)
    expect(summary.max).toBe(4)
    expect(summarizeNumeric([2, Number.NaN, 4])).toMatchObject({ n: 2, mean: 3, min: 2, max: 4 })
  })

  it('computes categorical mode share deterministically when modes tie', () => {
    expect(categoricalStability(['chest'])).toBeNull()
    expect(categoricalStability(['legs', 'head', 'legs'])).toEqual({
      n: 3,
      distinctValues: 2,
      modalValue: 'legs',
      modeShare: 0.666667,
    })
    const tied = categoricalStability(['head', 'chest'])
    expect(tied).toEqual({ n: 2, distinctValues: 2, modalValue: 'chest', modeShare: 0.5 })
  })

  it('computes mean pairwise Jaccard similarity over fragment sets', () => {
    expect(meanPairwiseJaccard([['wet-corridor']])).toBeNull()
    expect(meanPairwiseJaccard([['wet-corridor'], ['wet-corridor']])).toBe(1)
    expect(meanPairwiseJaccard([['wet-corridor'], ['window-rain']])).toBe(0)
    expect(meanPairwiseJaccard([['wet-corridor'], ['wet-corridor'], ['window-rain'], ['window-rain']])).toBe(0.333333)
  })

  it('computes tie-corrected Spearman rank correlation', () => {
    expect(spearmanRho([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBe(1)
    expect(spearmanRho([1, 2, 2, 3], [2, 1, 2, 3])).toBe(0.5)
    expect(spearmanRho([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull()
    expect(spearmanRho([1, 2], [1, 2, 3])).toBeNull()
    expect(spearmanRho([1, Number.NaN], [1, 2])).toBeNull()
  })

  it('flattens a session without mutating the record', () => {
    const record = session({ somatic: { fragments: ['window-rain', 'wet-corridor', 'window-rain'] } })
    const vector = flattenLsm0Session(record)
    expect(vector.primaryFragment).toBe('window-rain')
    expect(vector.fragmentSet).toEqual(['wet-corridor', 'window-rain'])
    expect(vector.signals).toEqual({})
    expect(record.somatic.fragments).toEqual(['window-rain', 'wet-corridor', 'window-rain'])
  })
})

describe('LSM-0 per-participant stability', () => {
  it('reports full stability for repeated categorical features and constant intensity', () => {
    const report = evaluateLsm0Values(stableSessions())
    const participant = report.participants[0]
    expect(participant.sessionCount).toBe(4)
    expect(participant.categoricalStability.region).toMatchObject({ modalValue: 'chest', modeShare: 1, distinctValues: 1 })
    expect(participant.categoricalStability.sensation).toMatchObject({ modalValue: 'pressure', modeShare: 1 })
    expect(participant.categoricalStability.breath).toMatchObject({ modalValue: 'held', modeShare: 1 })
    expect(participant.categoricalStability.primaryFragment).toMatchObject({ modalValue: 'wet-corridor', modeShare: 1 })
    expect(participant.fragmentSetStability).toBe(1)
    expect(participant.intensityStability).toBe(1)
    expect(participant.intensity).toMatchObject({ n: 4, mean: 3, sd: 0, cv: 0 })
    expect(participant.signals.heartRateBpm).toMatchObject({
      coverage: 1,
      summary: { n: 4, mean: 71, sd: 2.581989, cv: 0.036366, min: 68, max: 74 },
    })
    expect(participant.signals.edaMicroSiemens).toMatchObject({ coverage: 0, summary: { n: 0, mean: null } })
    expect(participant.missing.sessionsWithoutAnySignal).toBe(0)
    expect(participant.missing.missingSessionsBySignal.heartRateBpm).toBe(0)
    expect(participant.missing.missingSessionsBySignal.edaMicroSiemens).toBe(4)
    expect(participant.syntheticSignalSessions).toBe(1)
  })

  it('reports low stability when categorical and intensity features vary', () => {
    const report = evaluateLsm0Values(unstableSessions())
    const participant = report.participants[0]
    expect(participant.categoricalStability.region).toEqual({ n: 4, distinctValues: 3, modalValue: 'chest', modeShare: 0.5 })
    expect(participant.categoricalStability.sensation).toEqual({ n: 4, distinctValues: 3, modalValue: 'pressure', modeShare: 0.5 })
    expect(participant.categoricalStability.breath).toEqual({ n: 4, distinctValues: 3, modalValue: 'held', modeShare: 0.5 })
    expect(participant.categoricalStability.primaryFragment).toEqual({ n: 4, distinctValues: 2, modalValue: 'wet-corridor', modeShare: 0.5 })
    expect(participant.fragmentSetStability).toBe(0.333333)
    expect(participant.intensityStability).toBe(0)
    expect(participant.intensity.mean).toBe(2.75)
    expect(participant.intensity.sd).toBe(1.707825)
    expect(participant.intensity.cv).toBe(0.621027)
  })

  it('reports no stability metrics for a single session', () => {
    const report = evaluateLsm0Values([session({ signals: { heartRateBpm: 70 } })])
    const participant = report.participants[0]
    expect(participant.sessionCount).toBe(1)
    expect(participant.categoricalStability.region).toBeNull()
    expect(participant.fragmentSetStability).toBeNull()
    expect(participant.intensityStability).toBeNull()
    expect(participant.intensity).toMatchObject({ n: 1, mean: 3, sd: null })
  })
})

describe('LSM-0 negative control', () => {
  it('reports a deterministic within-participant signal shuffle', () => {
    const first = evaluateLsm0Values(varyingSessions(), { negativeControl: true, seed: 7 })
    const second = evaluateLsm0Values(varyingSessions(), { negativeControl: true, seed: 7 })
    expect(first.negativeControl).toBeDefined()
    expect(first.negativeControl?.method).toBe('within_participant_deterministic_shuffle')
    expect(first.negativeControl?.aggregate).toEqual(second.negativeControl?.aggregate)
    expect(first.negativeControl?.participants[0].associations).toEqual(second.negativeControl?.participants[0].associations)
  })

  it('keeps sessions without signals in the negative control and formats the section', () => {
    const report = evaluateLsm0Values([session({ signals: undefined })], { negativeControl: true })
    const text = formatLsm0Report(report)
    expect(text).toContain('Negative control')
    expect(text).toContain('not a significance test')
  })
})

describe('LSM-0 agency', () => {
  it('summarizes optional agency without treating it as a score', () => {
    const report = evaluateLsm0Values([
      session({ sessionId: 'A1', capturedAt: day(1), agency: { approach: 2, stay: 1, resume: 1, leave: 1, reenter: 0, leftEarly: true, durationSec: 75 } }),
      session({ sessionId: 'A2', capturedAt: day(2), agency: { approach: 0, stay: 0, resume: 0, leave: 0, reenter: 0, leftEarly: false, durationSec: 75 } }),
      session({ sessionId: 'A3', capturedAt: day(3) }),
    ])
    expect(report.participants[0].agency).toMatchObject({ sessionsWithAgency: 2, approach: 2, stay: 1, resume: 1, leave: 1, reenter: 0, leftEarlySessions: 1 })
  })

  it('ignores malformed agency with a warning', () => {
    const report = evaluateLsm0Values([session({ agency: { approach: -1, stay: 0, resume: 0, leave: 0, reenter: 0, leftEarly: false, durationSec: 75 } })])
    expect(report.participants[0].agency.sessionsWithAgency).toBe(0)
    expect(report.warnings.some(warning => warning.code === 'invalid_agency')).toBe(true)
  })
})

describe('LSM-0 certainty', () => {
  it('reports optional certainty counts without imputing missing values', () => {
    const report = evaluateLsm0Values([
      session({ sessionId: 'C1', capturedAt: day(1), somatic: { certainty: 'clear' } }),
      session({ sessionId: 'C2', capturedAt: day(2), somatic: { certainty: 'unsure' } }),
      session({ sessionId: 'C3', capturedAt: day(3) }),
    ])
    expect(report.participants[0].certainty).toMatchObject({ sessionsWithValue: 2, counts: { clear: 1, mixed: 0, unsure: 1 }, modeShare: 0.5 })
  })
})

describe('LSM-0 symbolic space parameters', () => {
  it('summarizes optional symbolic stability and somatic~symbolic paired counts', () => {
    const records = [1, 2, 3].map(index => session({
      sessionId: `S${index}`,
      capturedAt: day(index),
      symbolic: { format: 'encounter', motifs: ['door', 'corridor'], figure: 'shadow' },
    }))
    const report = evaluateLsm0Values(records)
    const participant = report.participants[0]
    expect(participant.symbolic.sessionCount).toBe(3)
    expect(participant.symbolic.primaryMotif).toMatchObject({ modalValue: 'door', modeShare: 1 })
    expect(participant.symbolic.motifSetStability).toBe(1)
    expect(participant.symbolic.figure).toMatchObject({ modalValue: 'shadow', modeShare: 1 })
    expect(participant.symbolic.somaticPairs).toEqual([{ region: 'chest', sensation: 'pressure', primaryMotif: 'door', count: 3 }])
    expect(report.aggregate.symbolic).toMatchObject({ sessionsWithSymbolic: 3, primaryMotifStabilityMedian: 1, motifSetStabilityMedian: 1, figureStabilityMedian: 1 })
  })

  it('keeps sessions without symbolic parameters and reports null symbolic metrics', () => {
    const report = evaluateLsm0Values([session({ symbolic: undefined })])
    expect(report.participants[0].symbolic).toMatchObject({ sessionCount: 0, primaryMotif: null, motifSetStability: null, figure: null, somaticPairs: [] })
  })

  it('warns and ignores malformed symbolic parameters without rejecting the session', () => {
    const parsed = parseLsm0Text(JSON.stringify([{
      ...session({}),
      symbolic: { format: 'nope', motifs: [], figure: '' },
    }]))
    expect(parsed.records).toHaveLength(1)
    expect(parsed.warnings.some(issue => issue.code === 'invalid_symbolic')).toBe(true)
    expect(parsed.records[0].record.symbolic).toBeUndefined()
  })
})

describe('LSM-0 per-participant associations', () => {
  it('computes the two prespecified intensity pairs with Spearman rho', () => {
    const report = evaluateLsm0Values(varyingSessions())
    const participant = report.participants[0]
    expect(PRIMARY_ASSOCIATIONS).toEqual([
      { report: 'intensity', signal: 'heartRateBpm' },
      { report: 'intensity', signal: 'edaMicroSiemens' },
    ])
    for (const association of participant.associations) {
      expect(association.status).toBe('computed')
      expect(association.rho).toBe(1)
      expect(association.n).toBe(5)
    }
  })

  it('marks a pair as insufficient below the prespecified paired-session minimum', () => {
    const three = [1, 2, 3].map((intensity, index) => session({
      sessionId: `T${index + 1}`,
      capturedAt: day(index + 1),
      somatic: { intensity: intensity as SomaticCapture['intensity'] },
      signals: { heartRateBpm: 60 + index },
    }))
    const report = evaluateLsm0Values(three)
    const association = report.participants[0].associations.find(candidate => candidate.signal === 'heartRateBpm')
    expect(association).toEqual({
      report: 'intensity',
      signal: 'heartRateBpm',
      method: 'spearman',
      n: 3,
      rho: null,
      status: 'insufficient_pairs',
    })
  })

  it('marks a pair as zero variance when one series never changes', () => {
    const report = evaluateLsm0Values(stableSessions())
    const association = report.participants[0].associations.find(candidate => candidate.signal === 'heartRateBpm')
    expect(association).toMatchObject({ n: 4, rho: null, status: 'zero_variance' })
  })

  it('reports associations as unavailable but keeps the session when signals are missing', () => {
    const report = evaluateLsm0Values([session(), session({ sessionId: 'S02', capturedAt: day(2) })])
    const participant = report.participants[0]
    for (const key of SIGNAL_KEYS) {
      expect(participant.signals[key]).toMatchObject({ coverage: 0, summary: { n: 0, mean: null } })
      expect(participant.missing.missingSessionsBySignal[key]).toBe(2)
    }
    expect(participant.missing.sessionsWithoutAnySignal).toBe(2)
    for (const association of participant.associations) {
      expect(association.status).toBe('insufficient_pairs')
      expect(association.rho).toBeNull()
    }
    expect(report.input.acceptedRows).toBe(2)
    expect(report.input.rejectedRows).toBe(0)
  })
})

describe('LSM-0 parsing and missing-data handling', () => {
  it('rejects structurally malformed rows and accepts valid rows', () => {
    const parsed = parseLsm0Values([
      null,
      { ...session(), version: 'lsm0-session-v2' },
      { ...session(), participantId: '   ' },
      { ...session(), capturedAt: 'not-a-date' },
      { ...session(), somatic: { region: 'chest' } },
      session({ sessionId: 'OK' }),
    ])
    expect(parsed.records).toHaveLength(1)
    expect(parsed.records[0].rowIndex).toBe(5)
    expect(parsed.rejected.map(issue => issue.code)).toEqual([
      'invalid_record',
      'unsupported_version',
      'invalid_participant_id',
      'invalid_captured_at',
      'invalid_somatic',
    ])
    expect(parsed.rejected.every(issue => issue.rowIndex < 5)).toBe(true)
  })

  it('drops invalid optional signal values without dropping the session', () => {
    const raw = {
      ...session({ signals: { breathRatePerMin: 12 } }),
      signals: {
        heartRateBpm: -5,
        edaMicroSiemens: Number.NaN,
        voicePauseRatio: 2,
        breathRatePerMin: 12,
        unknownProbe: 1,
      },
    }
    const parsed = parseLsm0Values([raw])
    expect(parsed.records).toHaveLength(1)
    expect(parsed.records[0].record.signals).toEqual({ breathRatePerMin: 12 })
    expect(parsed.warnings.map(issue => issue.code)).toEqual([
      'signal_value_invalid',
      'signal_value_invalid',
      'signal_value_invalid',
      'unknown_signal_key',
    ])
    expect(parsed.warnings.map(issue => issue.signal).filter(Boolean)).toEqual([
      'edaMicroSiemens',
      'heartRateBpm',
      'voicePauseRatio',
    ])
    const report = evaluateLsm0(parsed)
    expect(report.participants[0].signals.breathRatePerMin).toMatchObject({ coverage: 1, summary: { n: 1, mean: 12 } })
    expect(report.input.warningCount).toBe(4)
  })

  it('treats non-object signals and non-boolean simulated flags as warnings', () => {
    const parsed = parseLsm0Values([
      { ...session(), signals: [] },
      { ...session({ sessionId: 'S02', capturedAt: day(2) }), simulatedSignals: 'yes' },
    ])
    expect(parsed.records).toHaveLength(2)
    expect(parsed.warnings.map(issue => issue.code).sort()).toEqual(['invalid_simulated_flag', 'signals_not_object'])
    expect(parsed.records[0].record.signals).toBeUndefined()
    expect(parsed.records[1].record.simulatedSignals).toBeUndefined()
  })

  it('deduplicates participantId/sessionId deterministically and keeps the earliest capture', () => {
    const report = evaluateLsm0Values([
      session({ capturedAt: day(2) }),
      session({ capturedAt: day(1) }),
    ])
    expect(report.input).toMatchObject({ rowCount: 2, acceptedRows: 1, rejectedRows: 1, duplicateRows: 1 })
    expect(report.rejected[0]).toMatchObject({ rowIndex: 0, code: 'duplicate_session', participantId: 'P01', sessionId: 'S01' })
    expect(report.participants[0].firstCapturedAt).toBe(day(1))
  })

  it('accepts JSON arrays, record envelopes, single objects, and JSONL', () => {
    const arrayParsed = parseLsm0Text(JSON.stringify([session({ sessionId: 'J1' }), session({ sessionId: 'J2' })]))
    expect(arrayParsed.records.map(item => item.record.sessionId)).toEqual(['J1', 'J2'])

    const envelopeParsed = parseLsm0Text(JSON.stringify({ records: [session({ sessionId: 'E1' })] }))
    expect(envelopeParsed.records).toHaveLength(1)

    const singleParsed = parseLsm0Text(JSON.stringify(session({ sessionId: 'S1' })))
    expect(singleParsed.records).toHaveLength(1)

    const jsonl = [
      JSON.stringify(session({ sessionId: 'L1' })),
      '',
      '{"not valid"',
      JSON.stringify(session({ sessionId: 'L2' })),
    ].join('\n')
    const jsonlParsed = parseLsm0Text(jsonl)
    expect(jsonlParsed.records.map(item => [item.rowIndex, item.record.sessionId])).toEqual([[0, 'L1'], [3, 'L2']])
    expect(jsonlParsed.rejected).toHaveLength(1)
    expect(jsonlParsed.rejected[0]).toMatchObject({ rowIndex: 2, code: 'invalid_json' })

    expect(parseLsm0Text('   ').records).toEqual([])
    expect(() => parseLsm0Text('{"records": 3}')).toThrow('invalid_lsm0_fixture')
  })

  it('keeps rejected rows visible in the evaluation report', () => {
    const report = evaluateLsm0Text([
      JSON.stringify(session({ sessionId: 'L1' })),
      JSON.stringify({ version: 'lsm0-session-v1' }),
    ].join('\n'))
    expect(report.input.rowCount).toBe(2)
    expect(report.input.acceptedRows).toBe(1)
    expect(report.input.rejectedRows).toBe(1)
    expect(report.rejected[0].code).toBe('invalid_participant_id')
  })
})

describe('LSM-0 aggregate report', () => {
  it('aggregates only per-participant medians and sorts participants', () => {
    const records = [...unstableSessions('P02'), ...stableSessions()]
    const report = evaluateLsm0Values(records)
    expect(report.participants.map(participant => participant.participantId)).toEqual(['P01', 'P02'])
    expect(report.dataset).toMatchObject({ participantCount: 2, sessionCount: 8, syntheticSignalSessions: 1 })
    expect(report.aggregate.participantCount).toBe(2)
    expect(report.aggregate.participantsWithStability).toBe(2)
    expect(report.aggregate.categoricalStabilityMedian.region).toBe(0.75)
    expect(report.aggregate.categoricalStabilityMedian.sensation).toBe(0.75)
    expect(report.aggregate.fragmentSetStabilityMedian).toBe(0.666667)
    expect(report.aggregate.intensityStabilityMedian).toBe(0.5)
    expect(report.aggregate.signalCoverageMedian.heartRateBpm).toBe(0.5)
    expect(report.aggregate.signalCoverageMedian.edaMicroSiemens).toBe(0)
    const heartRate = report.aggregate.associations.find(association => association.signal === 'heartRateBpm')
    expect(heartRate).toMatchObject({ participantsWithValue: 0, positive: 0, negative: 0, zero: 0, medianRho: null })
  })

  it('is independent of input row order when there are no rejected rows', () => {
    const records = [...varyingSessions('P02'), ...stableSessions()]
    const forward = evaluateLsm0Values(records)
    const backward = evaluateLsm0Values([...records].reverse())
    expect(backward).toEqual(forward)
    expect(JSON.stringify(backward)).toBe(JSON.stringify(forward))
    expect(MIN_PAIRED_SESSIONS_FOR_ASSOCIATION).toBe(4)
  })

  it('is deterministic for JSON reports', () => {
    const first = JSON.stringify(evaluateLsm0Values(varyingSessions()))
    const second = JSON.stringify(evaluateLsm0Values(varyingSessions()))
    expect(second).toBe(first)
  })
})

describe('LSM-0 text report boundaries', () => {
  it('states the descriptive-only boundary and labels synthetic signals', () => {
    const report = evaluateLsm0Values(stableSessions())
    const text = formatLsm0Report(report)
    expect(text).toContain('LSM-0 offline evaluation baseline')
    expect(text).toContain('not a clinical result')
    expect(text).toContain('Descriptive baseline only')
    expect(text).toContain('no p-values')
    expect(text).toContain('P01')
    expect(text).toContain('synthetic signal sessions: 1 (not physiological evidence)')
    expect(text).toContain('intensity ~ heartRateBpm: not computed (zero variance; n=4)')
    expect(text).not.toContain('p =')
    expect(LSM0_LIMITATIONS.some(limitation => limitation.includes('not physiological evidence'))).toBe(true)
  })

  it('reports an empty fixture without inventing participants', () => {
    const text = formatLsm0Report(evaluateLsm0Values([]))
    expect(text).toContain('participants: 0')
    expect(text).toContain('none: no structurally valid session rows were accepted')
  })

  it('summarizes warnings and rejected rows in text form', () => {
    const report = evaluateLsm0Text([
      JSON.stringify({ ...session(), signals: { heartRateBpm: -1 } }),
      JSON.stringify({ version: 'lsm0-session-v1' }),
    ].join('\n'))
    const text = formatLsm0Report(report)
    expect(text).toContain('Warnings')
    expect(text).toContain('signal_value_invalid')
    expect(text).toContain('Rejected rows')
    expect(text).toContain('invalid_participant_id')
  })

  it('exposes only fixed signal parameters in the report type surface', () => {
    const report = evaluateLsm0Values([session({ signals: { heartRateBpm: 70 } as Lsm0SignalParameters })])
    expect(SIGNAL_KEYS).toEqual(['heartRateBpm', 'edaMicroSiemens', 'breathRatePerMin', 'voiceRmsMean', 'voicePauseRatio'])
    expect(Object.keys(report.participants[0].signals)).toEqual([...SIGNAL_KEYS])
    expect(Object.keys(report.aggregate.signalCoverageMedian)).toEqual([...SIGNAL_KEYS])
  })
})
