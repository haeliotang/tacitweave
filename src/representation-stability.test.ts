// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { compareRepresentationProbes } from './representation-stability'
import type { RepresentationRecord } from './representation-contract'

const base: RepresentationRecord = {
  version: 'representation-contract-v0.1',
  id: 'r1',
  sessionId: 's1',
  kind: 'sensation',
  value: 'pressure',
  source: 'user_input',
  recordedAt: '2026-11-13T00:00:00.000Z',
  revision: 1,
}

describe('representation stability', () => {
  it('reports exact agreement for identical probes', () => {
    const report = compareRepresentationProbes({ probeId: 'p1', records: [base] }, { probeId: 'p1', records: [base] })
    expect(report.exactAgreement).toBe(1)
    expect(report.meanJaccard).toBe(1)
    expect(report.sourceShare.user_input).toBe(1)
  })

  it('reports disagreement without converting it into a psychological claim', () => {
    const changed = { ...base, id: 'r2', value: 'tightness' }
    const report = compareRepresentationProbes({ probeId: 'p1', records: [base] }, { probeId: 'p1', records: [changed] })
    expect(report.exactAgreement).toBe(0)
    expect(report.meanJaccard).toBe(0)
    expect(report.limitations.join(' ')).toContain('construct validity')
  })

  it('reports revisions and source mix, and rejects mismatched probe ids', () => {
    const revised = { ...base, id: 'r2', value: 'tightness', revision: 2, replaces: 'r1' }
    const report = compareRepresentationProbes({ probeId: 'p1', records: [base] }, { probeId: 'p1', records: [base, revised] })
    expect(report.revisionRate).toBe(0.5)
    expect(report.sourceShare.user_input).toBe(2)
    expect(() => compareRepresentationProbes({ probeId: 'a', records: [] }, { probeId: 'b', records: [] })).toThrow('probe_ids_must_match')
  })
})
