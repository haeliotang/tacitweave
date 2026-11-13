// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { evaluatePublicData, formatPublicDataReport, parsePublicDataText } from './lsm0-public-data'

function line(participant: string, session: string, x: number | undefined, y: number | undefined, quality?: { usable?: boolean }) {
  return JSON.stringify({
    version: 'lsm0-public-session-v1',
    participantCode: participant,
    sessionId: session,
    capturedAt: `2026-11-${String(Number(session.replace('s', '')) + 1).padStart(2, '0')}T00:00:00.000Z`,
    signals: x === undefined ? {} : { heartRateBpm: x },
    selfReport: y === undefined ? {} : { intensity: y },
    ...(quality ? { quality } : {}),
  })
}

const text = [
  line('P1', 's0', 60, 1), line('P1', 's1', 62, 2), line('P1', 's2', 64, 3), line('P1', 's3', 66, 4), line('P1', 's4', 68, 5),
  line('P2', 's0', 60, 3), line('P2', 's1', 70, 1), line('P2', 's2', 80, 5), line('P2', 's3', 90, 2), line('P2', 's4', 100, 4),
].join('\n')

describe('LSM-0 public-data reanalysis harness', () => {
  it('parses ordered sessions and rejects malformed/duplicate input', () => {
    const parsed = parsePublicDataText(`${text}\n${line('P1', 's0', 60, 1)}\n{bad`)
    expect(parsed.sessions).toHaveLength(10)
    expect(parsed.rejected.map(item => item.reason)).toEqual(['duplicate_participant_session', 'invalid_json'])
  })

  it('keeps per-participant estimates and models no missing imputation', () => {
    const parsed = parsePublicDataText(text)
    const report = evaluatePublicData(parsed.sessions, { feature: 'heartRateBpm' })
    expect(report.participants.find(participant => participant.participantCode === 'P1')?.rho).toBeCloseTo(1, 6)
    expect(report.participants.find(participant => participant.participantCode === 'P2')?.paired).toBe(5)
    expect(report.limitations.join(' ')).toContain('never imputed')
    expect(formatPublicDataReport(report)).toContain('Descriptive only')
    expect(JSON.stringify(report)).not.toMatch(/"pValue"|"p_value"/)
  })


  it('selects a named self-report outcome without changing the feature', () => {
    const parsed = parsePublicDataText([
      JSON.stringify({ version: 'lsm0-public-session-v1', participantCode: 'P1', sessionId: 's0', capturedAt: '2026-11-01T00:00:00.000Z', signals: { x: 1 }, selfReport: { stateAnxietyScore: 10 } }),
      JSON.stringify({ version: 'lsm0-public-session-v1', participantCode: 'P1', sessionId: 's1', capturedAt: '2026-11-02T00:00:00.000Z', signals: { x: 2 }, selfReport: { stateAnxietyScore: 20 } }),
      JSON.stringify({ version: 'lsm0-public-session-v1', participantCode: 'P1', sessionId: 's2', capturedAt: '2026-11-03T00:00:00.000Z', signals: { x: 3 }, selfReport: { stateAnxietyScore: 30 } }),
      JSON.stringify({ version: 'lsm0-public-session-v1', participantCode: 'P1', sessionId: 's3', capturedAt: '2026-11-04T00:00:00.000Z', signals: { x: 4 }, selfReport: { stateAnxietyScore: 40 } }),
    ].join('\n'))
    const report = evaluatePublicData(parsed.sessions, { feature: 'x', outcome: 'stateAnxietyScore' })
    expect(report.outcome).toBe('stateAnxietyScore')
    expect(report.participants[0].paired).toBe(4)
    expect(report.participants[0].rho).toBeCloseTo(1, 6)
  })

  it('excludes quality-rejected sessions and reports missing fields', () => {
    const parsed = parsePublicDataText([
      line('P1', 's0', 60, 1), line('P1', 's1', 62, undefined), line('P1', 's2', 64, 3),
      line('P1', 's3', undefined, 4), line('P1', 's4', 68, 5, { usable: false }),
    ].join('\n'))
    const report = evaluatePublicData(parsed.sessions, { feature: 'heartRateBpm' })
    const participant = report.participants[0]
    expect(participant.excludedForQuality).toBe(1)
    expect(participant.missingOutcome).toBe(1)
    expect(participant.missingFeature).toBe(1)
    expect(participant.paired).toBe(2)
    expect(participant.rho).toBeNull()
  })

  it('reports circular-shift and shuffled controls separately from the primary estimate', () => {
    const report = evaluatePublicData(parsePublicDataText(text).sessions, { feature: 'heartRateBpm' })
    expect(report.participants[0].circularShiftRho).not.toBeNull()
    expect(report.participants[0].shuffledRho).not.toBeNull()
    expect(report.aggregate.meanRho).toBeGreaterThan(0)
  })
})
