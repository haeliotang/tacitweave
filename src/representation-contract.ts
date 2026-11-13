// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Representation Contract v0.1.
 *
 * This module is a provenance and revision contract for records used in
 * research. It does not claim that a record is a psychological structure.
 * Every record must say whether it came from the user, from a system
 * generator, from an explicit user confirmation, or from a system inference.
 */

export const REPRESENTATION_CONTRACT_VERSION = 'representation-contract-v0.1' as const

export type RepresentationSource = 'user_input' | 'user_confirmed' | 'system_generated' | 'system_inferred'

export type RepresentationKind =
  | 'body_region'
  | 'sensation'
  | 'intensity'
  | 'breath'
  | 'image_fragment'
  | 'relationship_moment'
  | 'symbolic_choice'
  | 'agency_action'
  | 'self_report'

export type RepresentationValue = string | number | boolean | readonly string[]

export interface RepresentationRecord {
  version: typeof REPRESENTATION_CONTRACT_VERSION
  id: string
  sessionId: string
  participantCode?: string
  kind: RepresentationKind
  value: RepresentationValue
  source: RepresentationSource
  recordedAt: string
  revision: number
  /** Prior record id when this is a revision. */
  replaces?: string
  /** System component or model that created a generated/inferred value. */
  generator?: string
  /** Records or observations that justify a generated/inferred value. */
  basis?: string[]
  /** User confirmation target, only for source=user_confirmed. */
  confirms?: string
  /** Time at which the user performed an agency action; required for independent agency observations. */
  observedAt?: string
}

export type RepresentationIssueCode =
  | 'invalid_record'
  | 'duplicate_id'
  | 'missing_generator'
  | 'missing_basis'
  | 'missing_confirmation_target'
  | 'confirmation_target_missing'
  | 'confirmation_mismatch'
  | 'invalid_revision'
  | 'revision_target_missing'
  | 'revision_target_mismatch'
  | 'revision_cycle'
  | 'invalid_value'
  | 'invalid_provenance'

export interface RepresentationIssue {
  code: RepresentationIssueCode
  recordId?: string
  message: string
}

export interface RepresentationValidation {
  ok: boolean
  issues: RepresentationIssue[]
}

const kinds = new Set<RepresentationKind>([
  'body_region',
  'sensation',
  'intensity',
  'breath',
  'image_fragment',
  'relationship_moment',
  'symbolic_choice',
  'agency_action',
  'self_report',
])

const sources = new Set<RepresentationSource>([
  'user_input',
  'user_confirmed',
  'system_generated',
  'system_inferred',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isValue(value: unknown): value is RepresentationValue {
  if (typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

/** Validate a complete ledger: unique ids, revisions, confirmations and provenance. */
export function validateRepresentationLedger(records: readonly RepresentationRecord[]): RepresentationValidation {
  const issues: RepresentationIssue[] = []
  const byId = new Map<string, RepresentationRecord>()
  for (const record of records) {
    if (!isRecord(record) || record.version !== REPRESENTATION_CONTRACT_VERSION || typeof record.id !== 'string' || record.id.length === 0) {
      issues.push({ code: 'invalid_record', message: 'record must have the contract version and a non-empty id' })
      continue
    }
    if (byId.has(record.id)) {
      issues.push({ code: 'duplicate_id', recordId: record.id, message: 'record id must be unique' })
      continue
    }
    byId.set(record.id, record)
    if (typeof record.sessionId !== 'string' || record.sessionId.length === 0) {
      issues.push({ code: 'invalid_record', recordId: record.id, message: 'sessionId is required' })
    }
    if (typeof record.recordedAt !== 'string' || Number.isNaN(Date.parse(record.recordedAt))) {
      issues.push({ code: 'invalid_record', recordId: record.id, message: 'recordedAt must be an ISO timestamp' })
    }
    if (!kinds.has(record.kind)) issues.push({ code: 'invalid_record', recordId: record.id, message: 'unknown representation kind' })
    if (!sources.has(record.source)) issues.push({ code: 'invalid_provenance', recordId: record.id, message: 'unknown source' })
    if (!Number.isInteger(record.revision) || record.revision < 1) {
      issues.push({ code: 'invalid_revision', recordId: record.id, message: 'revision must be a positive integer' })
    }
    if (!isValue(record.value)) issues.push({ code: 'invalid_value', recordId: record.id, message: 'value must be finite and JSON-safe' })
    if ((record.source === 'system_generated' || record.source === 'system_inferred') && (typeof record.generator !== 'string' || record.generator.length === 0)) {
      issues.push({ code: 'missing_generator', recordId: record.id, message: 'system records require a generator' })
    }
    if (record.source === 'system_inferred' && (!Array.isArray(record.basis) || record.basis.length === 0)) {
      issues.push({ code: 'missing_basis', recordId: record.id, message: 'system inference requires explicit basis records' })
    }
    if (record.source === 'user_confirmed' && (typeof record.confirms !== 'string' || record.confirms.length === 0)) {
      issues.push({ code: 'missing_confirmation_target', recordId: record.id, message: 'user_confirmed requires confirms' })
    }
  }

  for (const record of records) {
    if (!isRecord(record) || typeof record.id !== 'string') continue
    if (record.replaces !== undefined) {
      const target = byId.get(record.replaces)
      if (!target) {
        issues.push({ code: 'revision_target_missing', recordId: record.id, message: 'replaces target does not exist' })
      } else {
        if (target.sessionId !== record.sessionId || target.kind !== record.kind) {
          issues.push({ code: 'revision_target_mismatch', recordId: record.id, message: 'revision target must share session and kind' })
        }
        if (record.revision !== target.revision + 1) {
          issues.push({ code: 'invalid_revision', recordId: record.id, message: 'revision must follow the replaced record' })
        }
      }
      const seen = new Set<string>()
      let cursor: RepresentationRecord | undefined = record
      while (cursor?.replaces) {
        if (seen.has(cursor.id)) {
          issues.push({ code: 'revision_cycle', recordId: record.id, message: 'revision chain contains a cycle' })
          break
        }
        seen.add(cursor.id)
        cursor = byId.get(cursor.replaces)
      }
    }
    if (record.source === 'user_confirmed' && record.confirms) {
      const target = byId.get(record.confirms)
      if (!target) {
        issues.push({ code: 'confirmation_target_missing', recordId: record.id, message: 'confirmation target does not exist' })
      } else if (target.kind !== record.kind || JSON.stringify(target.value) !== JSON.stringify(record.value)) {
        issues.push({ code: 'confirmation_mismatch', recordId: record.id, message: 'confirmation must match the target kind and value' })
      }
    }
  }

  return { ok: issues.length === 0, issues }
}

/**
 * Only a direct user action is an independent agency observation. A system
 * inference about an action is not a new observation, even if it is plausible.
 */
export function isIndependentAgencyAction(record: RepresentationRecord): boolean {
  return record.kind === 'agency_action'
    && record.source === 'user_input'
    && typeof record.observedAt === 'string'
    && !Number.isNaN(Date.parse(record.observedAt))
    && (!record.basis || record.basis.length === 0)
}

export function assertRepresentationLedger(records: readonly RepresentationRecord[]): void {
  const result = validateRepresentationLedger(records)
  if (!result.ok) {
    throw new Error(`representation_contract_invalid: ${result.issues.map(issue => `${issue.code}${issue.recordId ? `(${issue.recordId})` : ''}`).join(', ')}`)
  }
}
