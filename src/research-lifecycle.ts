// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Synthetic research-store lifecycle contract.
 *
 * This is not the production storage layer. It exists to make consent,
 * withdrawal, retention, key deletion, restart and backup-copy boundaries
 * executable before any real research data is collected.
 */
import { researchCaptureSessionSchema, type ResearchCaptureSession } from './research-capture'

export interface ResearchDiskRecord {
  sessionId: string
  participantCode: string
  keyId: string
  ciphertext: string
  retentionUntil: string
  backupCopies: string[]
}

export interface ResearchTombstone {
  sessionId: string
  participantCode: string
  deletedAt: string
  backupCopies: string[]
  status: 'deletion_requested' | 'deleted'
  reason: 'withdrawn' | 'expired' | 'explicit'
}

export interface SyntheticResearchSnapshot {
  records: ResearchDiskRecord[]
  tombstones: ResearchTombstone[]
  withdrawnParticipants: string[]
}

export interface CollectResult {
  ok: boolean
  reason?: 'invalid_session' | 'withdrawn_participant' | 'expired_retention'
}

export interface WithdrawResult {
  deletedSessions: number
  deletedKeys: number
  residualBackupCopies: string[]
  status: 'deleted' | 'deletion_requested'
}

/**
 * A deliberately simple, in-memory stand-in for an encrypted research store.
 * The disk snapshot contains ciphertext references, never the session object.
 * The keyring remains outside the disk snapshot, like a separate key store.
 */
export class SyntheticResearchStore {
  private records = new Map<string, ResearchDiskRecord>()
  private tombstones = new Map<string, ResearchTombstone>()
  private withdrawn = new Set<string>()
  private keyring = new Map<string, Map<string, ResearchCaptureSession>>()

  constructor(snapshot?: SyntheticResearchSnapshot) {
    for (const record of snapshot?.records ?? []) this.records.set(record.sessionId, { ...record, backupCopies: [...record.backupCopies] })
    for (const tombstone of snapshot?.tombstones ?? []) this.tombstones.set(tombstone.sessionId, { ...tombstone, backupCopies: [...tombstone.backupCopies] })
    for (const participant of snapshot?.withdrawnParticipants ?? []) this.withdrawn.add(participant)
  }

  collect(session: ResearchCaptureSession, options: { keyId: string; ciphertext: string; backupCopies?: string[]; now?: string }): CollectResult {
    const parsed = researchCaptureSessionSchema.safeParse(session)
    if (!parsed.success) return { ok: false, reason: 'invalid_session' }
    if (this.withdrawn.has(session.participantCode)) return { ok: false, reason: 'withdrawn_participant' }
    const now = Date.parse(options.now ?? new Date().toISOString())
    if (Date.parse(session.retention.until) <= now) return { ok: false, reason: 'expired_retention' }
    this.records.set(session.sessionId, {
      sessionId: session.sessionId,
      participantCode: session.participantCode,
      keyId: options.keyId,
      ciphertext: options.ciphertext,
      retentionUntil: session.retention.until,
      backupCopies: [...(options.backupCopies ?? [])],
    })
    const keyed = this.keyring.get(options.keyId) ?? new Map<string, ResearchCaptureSession>()
    keyed.set(session.sessionId, parsed.data)
    this.keyring.set(options.keyId, keyed)
    return { ok: true }
  }

  read(sessionId: string): ResearchCaptureSession | null {
    const record = this.records.get(sessionId)
    if (!record) return null
    return this.keyring.get(record.keyId)?.get(sessionId) ?? null
  }

  withdraw(participantCode: string, at = new Date().toISOString()): WithdrawResult {
    this.withdrawn.add(participantCode)
    let deletedSessions = 0
    let deletedKeys = 0
    const residual = new Set<string>()
    for (const record of [...this.records.values()]) {
      if (record.participantCode !== participantCode) continue
      this.records.delete(record.sessionId)
      const keyed = this.keyring.get(record.keyId)
      if (keyed) {
        keyed.delete(record.sessionId)
        if (keyed.size === 0) {
          this.keyring.delete(record.keyId)
          deletedKeys += 1
        }
      }
      deletedSessions += 1
      for (const copy of record.backupCopies) residual.add(copy)
      this.tombstones.set(record.sessionId, {
        sessionId: record.sessionId,
        participantCode,
        deletedAt: at,
        backupCopies: [...record.backupCopies],
        status: record.backupCopies.length ? 'deletion_requested' : 'deleted',
        reason: 'withdrawn',
      })
    }
    return {
      deletedSessions,
      deletedKeys,
      residualBackupCopies: [...residual],
      status: residual.size ? 'deletion_requested' : 'deleted',
    }
  }

  deleteBackupCopy(sessionId: string, copy: string, at = new Date().toISOString()): boolean {
    const tombstone = this.tombstones.get(sessionId)
    if (!tombstone) return false
    tombstone.backupCopies = tombstone.backupCopies.filter(value => value !== copy)
    if (tombstone.backupCopies.length === 0) {
      tombstone.status = 'deleted'
      tombstone.deletedAt = at
    }
    return true
  }

  deleteExpired(at = new Date().toISOString()): number {
    let deleted = 0
    for (const record of [...this.records.values()]) {
      if (Date.parse(record.retentionUntil) > Date.parse(at)) continue
      this.records.delete(record.sessionId)
      this.keyring.get(record.keyId)?.delete(record.sessionId)
      if (this.keyring.get(record.keyId)?.size === 0) this.keyring.delete(record.keyId)
      this.tombstones.set(record.sessionId, {
        sessionId: record.sessionId,
        participantCode: record.participantCode,
        deletedAt: at,
        backupCopies: [...record.backupCopies],
        status: record.backupCopies.length ? 'deletion_requested' : 'deleted',
        reason: 'expired',
      })
      deleted += 1
    }
    return deleted
  }

  snapshot(): SyntheticResearchSnapshot {
    return {
      records: [...this.records.values()].map(record => ({ ...record, backupCopies: [...record.backupCopies] })),
      tombstones: [...this.tombstones.values()].map(tombstone => ({ ...tombstone, backupCopies: [...tombstone.backupCopies] })),
      withdrawnParticipants: [...this.withdrawn],
    }
  }

  /** Restart from disk. The keyring is intentionally not on disk, so it is empty after restart. */
  restart(snapshot: SyntheticResearchSnapshot): SyntheticResearchStore {
    return new SyntheticResearchStore(snapshot)
  }
}
