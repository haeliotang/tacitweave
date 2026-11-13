// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Machine-readable construct-validity registry.
 *
 * A claim is not allowed to be "supported" without listed evidence. Every
 * claim must name at least one competing explanation and at least one test with
 * an explicit failure condition.
 */

export type ClaimId = 'A' | 'B' | 'C'
export type ClaimStatus = 'not_tested' | 'tooling_only' | 'supported' | 'contradicted'

export interface ConstructTest {
  name: string
  description: string
  failureCondition: string
}

export interface ConstructClaim {
  id: ClaimId
  statement: string
  operationalization: string
  competitors: string[]
  tests: ConstructTest[]
  status: ClaimStatus
  evidence: string[]
}

export interface ConstructValidityIssue {
  claimId?: string
  code: 'duplicate_id' | 'missing_field' | 'missing_competitor' | 'missing_test' | 'missing_failure_condition' | 'unsupported_claim' | 'unsupported_evidence_status'
  message: string
}

export interface ConstructValidityValidation {
  ok: boolean
  issues: ConstructValidityIssue[]
}

export const constructValidityMatrix: ConstructClaim[] = [
  {
    id: 'A',
    statement: 'Pre-verbal experience can be given an operable symbolic form without first verbalizing it.',
    operationalization: 'Body location, sensation, intensity, breath, image fragment, relationship moment and direct symbolic choice; provenance and revision are auditable.',
    competitors: [
      'demand characteristics / compliance with the prompt',
      'UI layout and default option effects',
      'repetition or familiarity with the interface',
      'transient mood rather than a stable symbolic form',
    ],
    tests: [
      {
        name: 'prompt/layout counterfactual',
        description: 'Change prompt wording and option ordering while holding the participant and state constant; compare source-preserving records.',
        failureCondition: 'The supposed form changes primarily with prompt/layout rather than the participant\'s declared experience.',
      },
      {
        name: 'revision and confirmation audit',
        description: 'Measure how often system-generated or inferred records are revised or rejected by the user.',
        failureCondition: 'Most records are system suggestions accepted without user confirmation, or revisions cannot be traced.',
      },
      {
        name: 'exit/retraction invariance',
        description: 'Check that the user can leave, retract and delete without the interpretation being overwritten.',
        failureCondition: 'Leaving or retracting changes the recorded meaning, or deletion is not honored.',
      },
    ],
    status: 'tooling_only',
    evidence: ['representation-contract-v0.1'],
  },
  {
    id: 'B',
    statement: 'Part of the experience has a reproducible within-person correspondence with physiological signals.',
    operationalization: 'Consented ECG/EDA/PPG/respiration features and self-report, estimated within participant with a time-structure-preserving control.',
    competitors: [
      'general arousal rather than a specific pre-verbal construct',
      'movement, posture and sensor contact quality',
      'device and adapter differences',
      'time trend, session order and fatigue',
      'self-report response bias',
    ],
    tests: [
      {
        name: 'time-structure-preserving negative control',
        description: 'Compare the observed within-person association with a circular-shift or block control that preserves coarse temporal structure.',
        failureCondition: 'The association does not exceed the control, or only does so after unregistered exclusions.',
      },
      {
        name: 'device/activity stratification',
        description: 'Repeat the estimate across device, activity and quality strata.',
        failureCondition: 'The association disappears or reverses across strata, or depends on a single device.',
      },
      {
        name: 'measurement reliability',
        description: 'Estimate feature and self-report reliability before testing association.',
        failureCondition: 'Reliability is too low to support the proposed within-person test.',
      },
    ],
    status: 'not_tested',
    evidence: ['case-pipeline', 'qol-import'],
  },
  {
    id: 'C',
    statement: 'A new cross-modal representation or direct action adds out-of-sample predictive value beyond signals, self-report and history.',
    operationalization: 'Y_future ~ X + H versus Y_future ~ X + H + A, with a fixed temporal split, independent action observation and pre-specified baselines.',
    competitors: [
      'information leakage from future data',
      'overfitting or a too-weak baseline',
      'A is a deterministic function of X/H and adds no new observation',
      'A is another encoding of the same self-report',
    ],
    tests: [
      {
        name: 'synthetic planted-vs-null check',
        description: 'Run the evaluator on synthetic trajectories with a planted A effect and a null A effect.',
        failureCondition: 'The evaluator fails to detect the planted effect or accepts a null/derived-action effect.',
      },
      {
        name: 'temporal leakage check',
        description: 'Inject an action observed after the outcome and verify rejection.',
        failureCondition: 'The evaluator accepts a future action or future-derived feature.',
      },
      {
        name: 'pre-specified baseline comparison',
        description: 'Compare against constant, last self-report, time trend and X+H baselines on a held-out test window.',
        failureCondition: 'No stable out-of-sample improvement over X+H, or improvement only under leakage.',
      },
    ],
    status: 'tooling_only',
    evidence: ['lsm1-synthetic-evaluator'],
  },
]

export function validateConstructValidityMatrix(claims: readonly ConstructClaim[] = constructValidityMatrix): ConstructValidityValidation {
  const issues: ConstructValidityIssue[] = []
  const ids = new Set<string>()
  for (const claim of claims) {
    if (ids.has(claim.id)) issues.push({ claimId: claim.id, code: 'duplicate_id', message: 'claim id must be unique' })
    ids.add(claim.id)
    if (!claim.statement.trim() || !claim.operationalization.trim()) {
      issues.push({ claimId: claim.id, code: 'missing_field', message: 'statement and operationalization are required' })
    }
    if (!claim.competitors.length) issues.push({ claimId: claim.id, code: 'missing_competitor', message: 'at least one competing explanation is required' })
    if (!claim.tests.length) issues.push({ claimId: claim.id, code: 'missing_test', message: 'at least one discriminating test is required' })
    for (const test of claim.tests) {
      if (!test.failureCondition.trim()) {
        issues.push({ claimId: claim.id, code: 'missing_failure_condition', message: `test ${test.name} needs a failure condition` })
      }
    }
    if (claim.status === 'supported' && claim.evidence.length === 0) {
      issues.push({ claimId: claim.id, code: 'unsupported_claim', message: 'a supported claim must list evidence' })
    }
    if (claim.status === 'supported' && claim.tests.some(test => !test.failureCondition.trim())) {
      issues.push({ claimId: claim.id, code: 'unsupported_evidence_status', message: 'a supported claim cannot rely on a test without a failure condition' })
    }
  }
  return { ok: issues.length === 0, issues }
}

export function assertConstructValidityMatrix(claims: readonly ConstructClaim[] = constructValidityMatrix): void {
  const result = validateConstructValidityMatrix(claims)
  if (!result.ok) throw new Error(`construct_validity_invalid: ${result.issues.map(issue => `${issue.code}${issue.claimId ? `(${issue.claimId})` : ''}`).join(', ')}`)
}
