// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Encounter, SymbolicAgencyEvent } from './encounter'

export interface SymbolicSession {
  version: 'symbolic-session-v1'
  id: string
  createdAt: string
  encounterId: string
  format: 'encounter' | 'space'
  durationSec: number
  completed: boolean
  leftEarly: boolean
  agency: SymbolicAgencyEvent[]
}

export const symbolicSessionStorageKey = 'tacitweave.symbolic-sessions.v1'
const maxSessions = 100
const actions = new Set(['approach', 'stay', 'resume', 'leave', 'reenter'])

export function isSymbolicSession(value: unknown): value is SymbolicSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<SymbolicSession>
  return session.version === 'symbolic-session-v1'
    && typeof session.id === 'string' && session.id.length > 0
    && typeof session.createdAt === 'string' && !Number.isNaN(Date.parse(session.createdAt))
    && typeof session.encounterId === 'string' && session.encounterId.length > 0
    && (session.format === 'encounter' || session.format === 'space')
    && typeof session.durationSec === 'number' && Number.isFinite(session.durationSec) && session.durationSec > 0
    && typeof session.completed === 'boolean'
    && typeof session.leftEarly === 'boolean'
    && Array.isArray(session.agency)
    && session.agency.every(event => event && typeof event === 'object'
      && typeof event.atSec === 'number' && Number.isFinite(event.atSec) && event.atSec >= 0
      && typeof event.action === 'string' && actions.has(event.action))
}

export function createSymbolicSession(encounter: Encounter, now = new Date().toISOString(), id: string = crypto.randomUUID()): SymbolicSession {
  const format = encounter.innerPlan?.format ?? 'encounter'
  const durationSec = encounter.innerPlan?.durationSec ?? encounter.durationSec ?? 75
  const agency = [...(encounter.agency ?? [])]
  return {
    version: 'symbolic-session-v1',
    id,
    createdAt: now,
    encounterId: encounter.id,
    format,
    durationSec,
    completed: agency.some(event => event.action === 'leave' && event.atSec >= durationSec),
    leftEarly: agency.some(event => event.action === 'leave' && event.atSec < durationSec),
    agency,
  }
}

export interface SymbolicSessionStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function loadSymbolicSessions(storage: SymbolicSessionStorageLike): SymbolicSession[] {
  try {
    const raw = storage.getItem(symbolicSessionStorageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSymbolicSession).slice(0, maxSessions) : []
  } catch {
    return []
  }
}

export function saveSymbolicSessions(storage: SymbolicSessionStorageLike, sessions: SymbolicSession[]) {
  storage.setItem(symbolicSessionStorageKey, JSON.stringify(sessions.slice(0, maxSessions)))
}

export function clearSymbolicSessions(storage: SymbolicSessionStorageLike) {
  storage.removeItem(symbolicSessionStorageKey)
}

export function removeSymbolicSession(sessions: SymbolicSession[], id: string): SymbolicSession[] {
  return sessions.filter(session => session.id !== id)
}
