// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createRelationshipTrigger, responses, type RelationshipContinuityRef, type RelationshipInput, type RelationshipTrigger } from './relationship'
import { breaths, regions, sensations } from './somatic'

export interface RelationshipRevisitInput {
  role: string
  situation: string
  cue: string
  region: RelationshipInput['region']
  sensation: RelationshipInput['sensation']
  intensity: 1 | 2 | 3 | 4 | 5
  breath: RelationshipInput['breath']
  response: RelationshipInput['response']
  note?: string
  now?: string
}

export interface RelationshipTrail {
  rootId: string
  root: RelationshipTrigger
  visits: RelationshipTrigger[]
  latest: RelationshipTrigger
}

export interface RelationshipContinuityChange {
  field: 'role' | 'situation' | 'cue' | 'region' | 'sensation' | 'intensity' | 'breath' | 'response'
  before: string
  after: string
  changed: boolean
}

export function relationshipContinuityRootId(entry: RelationshipTrigger): string {
  return entry.continuity?.rootId ?? entry.id
}

export function buildRelationshipTrails(entries: readonly RelationshipTrigger[]): RelationshipTrail[] {
  const groups = new Map<string, RelationshipTrigger[]>()
  for (const entry of entries) {
    const rootId = relationshipContinuityRootId(entry)
    const group = groups.get(rootId) ?? []
    group.push(entry)
    groups.set(rootId, group)
  }
  return [...groups.entries()].map(([rootId, group]) => {
    const visits = [...group].sort((left, right) => (left.continuity?.visit ?? 1) - (right.continuity?.visit ?? 1) || Date.parse(left.createdAt) - Date.parse(right.createdAt))
    const root = visits.find(entry => entry.id === rootId) ?? visits[0]
    return { rootId, root, visits, latest: visits[visits.length - 1] }
  }).sort((left, right) => Date.parse(right.latest.createdAt) - Date.parse(left.latest.createdAt))
}

export function createRelationshipRevisit(entries: readonly RelationshipTrigger[], sourceId: string, input: RelationshipRevisitInput): RelationshipTrigger {
  const source = entries.find(entry => entry.id === sourceId)
  if (!source) throw new Error('relationship_not_found')
  const rootId = relationshipContinuityRootId(source)
  const rootVisits = entries.filter(entry => relationshipContinuityRootId(entry) === rootId)
  const visit = Math.max(1, ...rootVisits.map(entry => entry.continuity?.visit ?? 1)) + 1
  const continuity: RelationshipContinuityRef = {
    version: 'relationship-continuity-v1',
    rootId,
    parentId: source.id,
    visit,
    action: 're-enter',
    ...(input.note?.trim() ? { note: input.note.trim().slice(0, 200) } : {}),
  }
  return createRelationshipTrigger({
    role: input.role,
    situation: input.situation,
    cue: input.cue,
    region: input.region,
    sensation: input.sensation,
    intensity: input.intensity,
    breath: input.breath,
    response: input.response,
    continuity,
    ...(input.now ? { now: input.now } : {}),
  })
}

export function compareRelationshipContinuity(before: RelationshipTrigger, after: RelationshipTrigger): RelationshipContinuityChange[] {
  const changes: Array<Omit<RelationshipContinuityChange, 'changed'>> = [
    { field: 'role', before: before.role, after: after.role },
    { field: 'situation', before: before.situation, after: after.situation },
    { field: 'cue', before: before.cue, after: after.cue },
    { field: 'region', before: before.region, after: after.region },
    { field: 'sensation', before: before.sensation, after: after.sensation },
    { field: 'intensity', before: String(before.intensity), after: String(after.intensity) },
    { field: 'breath', before: before.breath, after: after.breath },
    { field: 'response', before: before.response, after: after.response },
  ]
  return changes.map(change => ({ ...change, changed: change.before !== change.after }))
}

export function localizedRelationshipField(field: RelationshipContinuityChange['field'], value: string, lang: 'zh' | 'en'): string {
  if (field === 'region') return regions.find(item => item.value === value)?.[lang === 'en' ? 'labelEn' : 'label'] ?? value
  if (field === 'sensation') return sensations.find(item => item.value === value)?.[lang === 'en' ? 'labelEn' : 'label'] ?? value
  if (field === 'breath') return breaths.find(item => item.value === value)?.[lang === 'en' ? 'labelEn' : 'label'] ?? value
  if (field === 'response') return responses.find(item => item.value === value)?.[lang === 'en' ? 'labelEn' : 'label'] ?? value
  return value
}
