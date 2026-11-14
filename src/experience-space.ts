// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

export type ExperienceStart = 'body' | 'imagery' | 'blank' | 'relationship'

export type SpatialObjectKind = 'body' | 'door' | 'water' | 'forest' | 'shape' | 'light' | 'boundary' | 'presence'

export type SpatialActionType = 'place' | 'move' | 'adjust' | 'visibility' | 'remove' | 'viewpoint' | 'connect' | 'disconnect'

export interface SpatialObject {
  id: string
  kind: SpatialObjectKind
  x: number
  y: number
  depth: number
  scale: number
  opacity: number
  visible: boolean
  source: 'user_input' | 'system_generated'
}

export interface Viewpoint {
  distance: number
}

export interface SpatialRelation {
  id: string
  type: 'connection' | 'containment'
  fromId: string
  toId: string
  source: 'user_input'
}

export interface UserSpatialAction {
  id: string
  type: SpatialActionType
  targetId?: string
  elapsedMs: number
  before?: SpatialObject | Viewpoint | SpatialRelation | null
  after?: SpatialObject | Viewpoint | SpatialRelation | null
  source: 'user_input'
}

export interface ExperienceSpaceV2 {
  version: 'experience-space-v2'
  id: string
  rootId: string
  parentId?: string
  start: ExperienceStart
  objects: SpatialObject[]
  relations?: SpatialRelation[]
  viewpoint: Viewpoint
  actions: UserSpatialAction[]
  createdAt: string
  updatedAt: string
}

export interface ExperienceStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const experienceSpaceStorageKey = 'tacitweave.experience-spaces.v2'
export const experienceSpaceCapacity = 500
const uuid = () => crypto.randomUUID()
const now = () => new Date().toISOString()

const kinds = new Set<SpatialObjectKind>(['body', 'door', 'water', 'forest', 'shape', 'light', 'boundary', 'presence'])
const starts = new Set<ExperienceStart>(['body', 'imagery', 'blank', 'relationship'])

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : (min + max) / 2))
}

function makeObject(kind: SpatialObjectKind, x = 0.5, y = 0.5, source: SpatialObject['source'] = 'user_input'): SpatialObject {
  return { id: uuid(), kind, x: clamp(x, 0.04, 0.96), y: clamp(y, 0.08, 0.92), depth: 0.5, scale: 1, opacity: 1, visible: true, source }
}

function action(type: SpatialActionType, targetId: string | undefined, before: UserSpatialAction['before'], after: UserSpatialAction['after']): UserSpatialAction {
  return { id: uuid(), type, ...(targetId ? { targetId } : {}), elapsedMs: 0, before: before ?? null, after: after ?? null, source: 'user_input' }
}

function isSpatialRelation(value: UserSpatialAction['before'] | UserSpatialAction['after']): value is SpatialRelation {
  return Boolean(value && typeof value === 'object' && 'fromId' in value && 'toId' in value && 'type' in value)
}

export function createExperienceSpace(start: ExperienceStart, point?: { x: number; y: number }, initialKind?: SpatialObjectKind, at = now()): ExperienceSpaceV2 {
  if (!starts.has(start)) throw new Error('invalid_start')
  const objects: SpatialObject[] = []
  if (start === 'body') objects.push(makeObject('body', point?.x ?? 0.5, point?.y ?? 0.5))
  if (start === 'imagery') objects.push(makeObject(initialKind && initialKind !== 'body' && initialKind !== 'boundary' ? initialKind : 'shape'))
  if (start === 'relationship') {
    objects.push(makeObject('presence', 0.32, 0.52), makeObject('presence', 0.68, 0.52))
  }
  const id = uuid()
  return { version: 'experience-space-v2', id, rootId: id, start, objects, relations: [], viewpoint: { distance: 0.5 }, actions: [], createdAt: at, updatedAt: at }
}

export function isExperienceSpace(value: unknown): value is ExperienceSpaceV2 {
  if (!value || typeof value !== 'object') return false
  const space = value as Partial<ExperienceSpaceV2>
  if (space.version !== 'experience-space-v2' || typeof space.id !== 'string' || typeof space.rootId !== 'string') return false
  if (!starts.has(space.start as ExperienceStart) || !Array.isArray(space.objects) || !Array.isArray(space.actions)) return false
  if (!space.viewpoint || typeof space.viewpoint.distance !== 'number' || !Number.isFinite(space.viewpoint.distance)) return false
  if (typeof space.createdAt !== 'string' || Number.isNaN(Date.parse(space.createdAt))) return false
  if (space.relations !== undefined && (!Array.isArray(space.relations) || !space.relations.every(relation => relation && typeof relation.id === 'string'
    && (relation.type === 'connection' || relation.type === 'containment')
    && typeof relation.fromId === 'string' && typeof relation.toId === 'string'
    && relation.fromId !== relation.toId
    && relation.source === 'user_input'))) return false
  return space.objects.every(object => object && typeof object.id === 'string'
    && kinds.has(object.kind)
    && [object.x, object.y, object.depth, object.scale, object.opacity].every(number => typeof number === 'number' && Number.isFinite(number))
    && object.x >= 0 && object.x <= 1 && object.y >= 0 && object.y <= 1
    && object.depth >= 0 && object.depth <= 1
    && object.scale >= 0.25 && object.scale <= 3
    && object.opacity >= 0 && object.opacity <= 1
    && typeof object.visible === 'boolean'
    && (object.source === 'user_input' || object.source === 'system_generated'))
}

export function placeObject(space: ExperienceSpaceV2, kind: SpatialObjectKind, x = 0.5, y = 0.5, at = now()): ExperienceSpaceV2 {
  const object = makeObject(kind, x, y)
  return { ...space, objects: [...space.objects, object], actions: [...space.actions, action('place', object.id, null, object)], updatedAt: at }
}

export function moveObject(space: ExperienceSpaceV2, targetId: string, x: number, y: number, at = now()): ExperienceSpaceV2 {
  const before = space.objects.find(object => object.id === targetId)
  if (!before) throw new Error('object_not_found')
  const after: SpatialObject = { ...before, x: clamp(x, 0.04, 0.96), y: clamp(y, 0.08, 0.92) }
  return { ...space, objects: space.objects.map(object => object.id === targetId ? after : object), actions: [...space.actions, action('move', targetId, before, after)], updatedAt: at }
}

export function adjustObject(space: ExperienceSpaceV2, targetId: string, patch: Partial<Pick<SpatialObject, 'depth' | 'scale' | 'opacity'>>, at = now()): ExperienceSpaceV2 {
  const before = space.objects.find(object => object.id === targetId)
  if (!before) throw new Error('object_not_found')
  const after: SpatialObject = {
    ...before,
    ...(patch.depth === undefined ? {} : { depth: clamp(patch.depth, 0, 1) }),
    ...(patch.scale === undefined ? {} : { scale: clamp(patch.scale, 0.25, 3) }),
    ...(patch.opacity === undefined ? {} : { opacity: clamp(patch.opacity, 0, 1) }),
  }
  return { ...space, objects: space.objects.map(object => object.id === targetId ? after : object), actions: [...space.actions, action('adjust', targetId, before, after)], updatedAt: at }
}

export function setObjectVisibility(space: ExperienceSpaceV2, targetId: string, visible: boolean, at = now()): ExperienceSpaceV2 {
  const before = space.objects.find(object => object.id === targetId)
  if (!before) throw new Error('object_not_found')
  const after = { ...before, visible }
  return { ...space, objects: space.objects.map(object => object.id === targetId ? after : object), actions: [...space.actions, action('visibility', targetId, before, after)], updatedAt: at }
}

export function removeObject(space: ExperienceSpaceV2, targetId: string, at = now()): ExperienceSpaceV2 {
  const before = space.objects.find(object => object.id === targetId)
  if (!before) throw new Error('object_not_found')
  return { ...space, objects: space.objects.filter(object => object.id !== targetId), actions: [...space.actions, action('remove', targetId, before, null)], updatedAt: at }
}

export function setViewpoint(space: ExperienceSpaceV2, distance: number, at = now()): ExperienceSpaceV2 {
  const before = space.viewpoint
  const after = { distance: clamp(distance, 0, 1) }
  return { ...space, viewpoint: after, actions: [...space.actions, action('viewpoint', undefined, before, after)], updatedAt: at }
}

export function connectObjects(space: ExperienceSpaceV2, fromId: string, toId: string, type: SpatialRelation['type'] = 'connection', at = now()): ExperienceSpaceV2 {
  if (fromId === toId) throw new Error('cannot_connect_to_self')
  const from = space.objects.find(object => object.id === fromId)
  const to = space.objects.find(object => object.id === toId)
  if (!from || !to) throw new Error('object_not_found')
  const relation: SpatialRelation = { id: uuid(), type, fromId, toId, source: 'user_input' }
  const relations = space.relations ?? []
  if (relations.some(item => item.fromId === fromId && item.toId === toId && item.type === type)) return space
  return { ...space, relations: [...relations, relation], actions: [...space.actions, action('connect', toId, null, relation)], updatedAt: at }
}

export function disconnectRelation(space: ExperienceSpaceV2, relationId: string, at = now()): ExperienceSpaceV2 {
  const relation = space.relations?.find(item => item.id === relationId)
  if (!relation) throw new Error('relation_not_found')
  return { ...space, relations: (space.relations ?? []).filter(item => item.id !== relationId), actions: [...space.actions, action('disconnect', relation.toId, relation, null)], updatedAt: at }
}

/** Restore the object/viewpoint state before the latest explicit user action. */
export function undoLastAction(space: ExperienceSpaceV2, at = now()): ExperienceSpaceV2 {
  const last = space.actions.at(-1)
  if (!last) return space
  let objects = space.objects
  let viewpoint = space.viewpoint
  if (last.type === 'place' && last.targetId) objects = objects.filter(object => object.id !== last.targetId)
  if (last.type === 'remove' && last.before && 'kind' in last.before) objects = [...objects, last.before as SpatialObject]
  if ((last.type === 'move' || last.type === 'adjust' || last.type === 'visibility') && last.targetId && last.before && 'kind' in last.before) {
    objects = objects.map(object => object.id === last.targetId ? last.before as SpatialObject : object)
  }
  if (last.type === 'viewpoint' && last.before && 'distance' in last.before) viewpoint = last.before
  let relations = space.relations ?? []
  if (last.type === 'connect' && isSpatialRelation(last.after)) {
    const relation = last.after
    relations = relations.filter(item => item.id !== relation.id)
  }
  if (last.type === 'disconnect' && isSpatialRelation(last.before)) {
    const relation = last.before
    relations = [...relations, relation]
  }
  return { ...space, objects, relations, viewpoint, actions: space.actions.slice(0, -1), updatedAt: at }
}

export function loadExperienceSpaces(storage: ExperienceStorageLike): ExperienceSpaceV2[] {
  try {
    const raw = storage.getItem(experienceSpaceStorageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isExperienceSpace).slice(0, experienceSpaceCapacity) : []
  } catch { return [] }
}

export function saveExperienceSpaces(storage: ExperienceStorageLike, spaces: ExperienceSpaceV2[]) {
  storage.setItem(experienceSpaceStorageKey, JSON.stringify(spaces.slice(0, experienceSpaceCapacity)))
}

export interface SpaceDifference {
  objectId?: string
  kind: SpatialObjectKind
  field: 'added' | 'removed' | 'position' | 'depth' | 'scale' | 'opacity' | 'visibility' | 'viewpoint'
  before: string
  after: string
}

export interface SpaceTrail {
  rootId: string
  root: ExperienceSpaceV2
  visits: ExperienceSpaceV2[]
  latest: ExperienceSpaceV2
}

/** Copy the current scene into a new child snapshot; the parent stays immutable. */
export function branchExperienceSpace(space: ExperienceSpaceV2, at = now()): ExperienceSpaceV2 {
  return {
    ...space,
    id: uuid(),
    rootId: space.rootId,
    parentId: space.id,
    objects: space.objects.map(object => ({ ...object })),
    relations: (space.relations ?? []).map(relation => ({ ...relation })),
    viewpoint: { ...space.viewpoint },
    actions: [],
    createdAt: at,
    updatedAt: at,
  }
}

export function buildSpaceTrails(spaces: readonly ExperienceSpaceV2[]): SpaceTrail[] {
  const groups = new Map<string, ExperienceSpaceV2[]>()
  for (const space of spaces) {
    const group = groups.get(space.rootId) ?? []
    group.push(space)
    groups.set(space.rootId, group)
  }
  return [...groups.entries()].map(([rootId, group]) => {
    const visits = [...group].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.id.localeCompare(right.id))
    const root = visits.find(space => space.id === rootId) ?? visits[0]
    return { rootId, root, visits, latest: visits[visits.length - 1] }
  }).sort((left, right) => Date.parse(right.latest.updatedAt) - Date.parse(left.latest.updatedAt))
}

/** Compare only explicit scene configuration; never interpret the difference. */
export function compareExperienceSpaces(before: ExperienceSpaceV2, after: ExperienceSpaceV2): SpaceDifference[] {
  const differences: SpaceDifference[] = []
  const beforeObjects = new Map(before.objects.map(object => [object.id, object]))
  const afterObjects = new Map(after.objects.map(object => [object.id, object]))
  for (const object of before.objects) {
    if (!afterObjects.has(object.id)) differences.push({ objectId: object.id, kind: object.kind, field: 'removed', before: object.kind, after: '—' })
  }
  for (const object of after.objects) {
    const old = beforeObjects.get(object.id)
    if (!old) { differences.push({ objectId: object.id, kind: object.kind, field: 'added', before: '—', after: object.kind }); continue }
    if (old.x !== object.x || old.y !== object.y) differences.push({ objectId: object.id, kind: object.kind, field: 'position', before: `${old.x.toFixed(2)},${old.y.toFixed(2)}`, after: `${object.x.toFixed(2)},${object.y.toFixed(2)}` })
    if (old.depth !== object.depth) differences.push({ objectId: object.id, kind: object.kind, field: 'depth', before: old.depth.toFixed(2), after: object.depth.toFixed(2) })
    if (old.scale !== object.scale) differences.push({ objectId: object.id, kind: object.kind, field: 'scale', before: old.scale.toFixed(2), after: object.scale.toFixed(2) })
    if (old.opacity !== object.opacity) differences.push({ objectId: object.id, kind: object.kind, field: 'opacity', before: old.opacity.toFixed(2), after: object.opacity.toFixed(2) })
    if (old.visible !== object.visible) differences.push({ objectId: object.id, kind: object.kind, field: 'visibility', before: String(old.visible), after: String(object.visible) })
  }
  if (before.viewpoint.distance !== after.viewpoint.distance) differences.push({ kind: 'shape', field: 'viewpoint', before: before.viewpoint.distance.toFixed(2), after: after.viewpoint.distance.toFixed(2) })
  return differences
}
