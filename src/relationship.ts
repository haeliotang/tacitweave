// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { breaths, regions, sensations, type BreathState, type SomaticRegion, type SomaticSensation } from './somatic'

export type RelationshipResponse = 'approach' | 'freeze' | 'fawn' | 'flee' | 'fight' | 'numb'

export interface RelationshipTrigger {
  version: 'relationship-trigger-v1'
  id: string
  createdAt: string
  role: string
  situation: string
  cue: string
  region: SomaticRegion
  sensation: SomaticSensation
  intensity: 1 | 2 | 3 | 4 | 5
  breath: BreathState
  response: RelationshipResponse
}

export interface RelationshipStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const relationshipStorageKey = 'tacitweave.relationship-triggers.v1'
const maxEntries = 100

export const responses: Array<{ value: RelationshipResponse; label: string; labelEn: string }> = [
  { value: 'approach', label: '靠近', labelEn: 'Approach' },
  { value: 'freeze', label: '僵住', labelEn: 'Freeze' },
  { value: 'fawn', label: '讨好', labelEn: 'Fawn' },
  { value: 'flee', label: '逃离', labelEn: 'Flee' },
  { value: 'fight', label: '反击', labelEn: 'Fight' },
  { value: 'numb', label: '麻木/断开', labelEn: 'Numb / disconnect' },
]

export const responseLabels: Record<RelationshipResponse, string> = Object.fromEntries(responses.map(item => [item.value, item.label])) as Record<RelationshipResponse, string>

function trim(value: string, max: number) {
  return value.trim().slice(0, max)
}

export function isRelationshipTrigger(value: unknown): value is RelationshipTrigger {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<RelationshipTrigger>
  return entry.version === 'relationship-trigger-v1'
    && typeof entry.id === 'string' && entry.id.length > 0
    && typeof entry.createdAt === 'string' && !Number.isNaN(Date.parse(entry.createdAt))
    && typeof entry.role === 'string' && typeof entry.situation === 'string' && typeof entry.cue === 'string'
    && regions.some(item => item.value === entry.region)
    && sensations.some(item => item.value === entry.sensation)
    && Number.isInteger(entry.intensity) && entry.intensity! >= 1 && entry.intensity! <= 5
    && breaths.some(item => item.value === entry.breath)
    && responses.some(item => item.value === entry.response)
}

export function loadRelationshipTriggers(storage: RelationshipStorageLike): RelationshipTrigger[] {
  try {
    const raw = storage.getItem(relationshipStorageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isRelationshipTrigger).slice(0, maxEntries) : []
  } catch {
    return []
  }
}

export function saveRelationshipTriggers(storage: RelationshipStorageLike, entries: RelationshipTrigger[]) {
  storage.setItem(relationshipStorageKey, JSON.stringify(entries.slice(0, maxEntries)))
}

export interface RelationshipInput {
  role?: string
  situation: string
  cue: string
  region: SomaticRegion
  sensation: SomaticSensation
  intensity: 1 | 2 | 3 | 4 | 5
  breath: BreathState
  response: RelationshipResponse
  now?: string
}

export function createRelationshipTrigger(input: RelationshipInput): RelationshipTrigger {
  if (!input.situation.trim() && !input.cue.trim()) throw new Error('请至少写下一个触发瞬间')
  return {
    version: 'relationship-trigger-v1',
    id: crypto.randomUUID(),
    createdAt: input.now ?? new Date().toISOString(),
    role: trim(input.role ?? '', 40),
    situation: trim(input.situation, 100),
    cue: trim(input.cue, 100),
    region: input.region,
    sensation: input.sensation,
    intensity: input.intensity,
    breath: input.breath,
    response: input.response,
  }
}

export function addRelationshipTrigger(storage: RelationshipStorageLike, input: RelationshipInput): RelationshipTrigger[] {
  const entry = createRelationshipTrigger(input)
  const entries = [entry, ...loadRelationshipTriggers(storage)].slice(0, maxEntries)
  saveRelationshipTriggers(storage, entries)
  return entries
}

export function removeRelationshipTrigger(storage: RelationshipStorageLike, id: string): RelationshipTrigger[] {
  const entries = loadRelationshipTriggers(storage).filter(entry => entry.id !== id)
  saveRelationshipTriggers(storage, entries)
  return entries
}

export function clearRelationshipTriggers(storage: RelationshipStorageLike): RelationshipTrigger[] {
  storage.removeItem(relationshipStorageKey)
  return []
}

export function exportRelationshipTriggers(entries: RelationshipTrigger[]) {
  return JSON.stringify({ version: 'relationship-export-v1', exportedAt: new Date().toISOString(), entries }, null, 2)
}

export interface RelationshipSummary {
  total: number
  regions: Array<{ value: SomaticRegion; label: string; labelEn: string; count: number }>
  sensations: Array<{ value: SomaticSensation; label: string; labelEn: string; count: number }>
  responses: Array<{ value: RelationshipResponse; label: string; labelEn: string; count: number }>
}

/** Descriptive counts of fields the user chose. This is not an inference about the user or anyone else. */
export function summarizeRelationshipTriggers(entries: RelationshipTrigger[]): RelationshipSummary {
  const count = <T extends string>(values: T[]) => {
    const map = new Map<T, number>()
    for (const value of values) map.set(value, (map.get(value) ?? 0) + 1)
    return [...map.entries()].sort((left, right) => right[1] - left[1])
  }
  const regionsSummary = count(entries.map(entry => entry.region)).map(([value, count]) => { const item = regions.find(entry => entry.value === value); return { value, label: item?.label ?? value, labelEn: item?.labelEn ?? value, count } })
  const sensationsSummary = count(entries.map(entry => entry.sensation)).map(([value, count]) => { const item = sensations.find(entry => entry.value === value); return { value, label: item?.label ?? value, labelEn: item?.labelEn ?? value, count } })
  const responsesSummary = count(entries.map(entry => entry.response)).map(([value, count]) => { const item = responses.find(entry => entry.value === value); return { value, label: item?.label ?? value, labelEn: item?.labelEn ?? value, count } })
  return { total: entries.length, regions: regionsSummary, sensations: sensationsSummary, responses: responsesSummary }
}
