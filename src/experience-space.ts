// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

export type ExperienceStart = 'body' | 'imagery' | 'blank' | 'relationship'

export type SpatialObjectKind = 'body' | 'door' | 'water' | 'forest' | 'shape' | 'light' | 'boundary' | 'presence' | 'container'

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
  /** Not collected in v0.2; kept optional rather than emitting a false zero. */
  elapsedMs?: number
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

const kinds = new Set<SpatialObjectKind>(['body', 'door', 'water', 'forest', 'shape', 'light', 'boundary', 'presence', 'container'])
const starts = new Set<ExperienceStart>(['body', 'imagery', 'blank', 'relationship'])

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : (min + max) / 2))
}

function makeObject(kind: SpatialObjectKind, x = 0.5, y = 0.5, source: SpatialObject['source'] = 'user_input'): SpatialObject {
  return { id: uuid(), kind, x: clamp(x, 0.04, 0.96), y: clamp(y, 0.08, 0.92), depth: 0.5, scale: 1, opacity: 1, visible: true, source }
}

function action(type: SpatialActionType, targetId: string | undefined, before: UserSpatialAction['before'], after: UserSpatialAction['after']): UserSpatialAction {
  return { id: uuid(), type, ...(targetId ? { targetId } : {}), before: before ?? null, after: after ?? null, source: 'user_input' }
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

function isSpatialObject(value: unknown): value is SpatialObject {
  if (!value || typeof value !== 'object') return false
  const object = value as Partial<SpatialObject>
  return typeof object.id === 'string' && object.id.length > 0
    && kinds.has(object.kind as SpatialObjectKind)
    && [object.x, object.y, object.depth, object.scale, object.opacity].every(number => typeof number === 'number' && Number.isFinite(number))
    && (object.x as number) >= 0 && (object.x as number) <= 1
    && (object.y as number) >= 0 && (object.y as number) <= 1
    && (object.depth as number) >= 0 && (object.depth as number) <= 1
    && (object.scale as number) >= 0.25 && (object.scale as number) <= 3
    && (object.opacity as number) >= 0 && (object.opacity as number) <= 1
    && typeof object.visible === 'boolean'
    && (object.source === 'user_input' || object.source === 'system_generated')
}

function isViewpoint(value: unknown): value is Viewpoint {
  if (!value || typeof value !== 'object') return false
  const viewpoint = value as Partial<Viewpoint>
  return typeof viewpoint.distance === 'number' && Number.isFinite(viewpoint.distance) && viewpoint.distance >= 0 && viewpoint.distance <= 1
}

function isRelationSchema(value: unknown): value is SpatialRelation {
  if (!value || typeof value !== 'object') return false
  const relation = value as Partial<SpatialRelation>
  return typeof relation.id === 'string' && relation.id.length > 0
    && (relation.type === 'connection' || relation.type === 'containment')
    && typeof relation.fromId === 'string' && relation.fromId.length > 0
    && typeof relation.toId === 'string' && relation.toId.length > 0
    && relation.fromId !== relation.toId
    && relation.source === 'user_input'
}

function isActionSchema(value: unknown): value is UserSpatialAction {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<UserSpatialAction>
  if (typeof item.id !== 'string' || item.id.length === 0 || item.source !== 'user_input') return false
  if (item.elapsedMs !== undefined && (typeof item.elapsedMs !== 'number' || !Number.isFinite(item.elapsedMs) || item.elapsedMs < 0)) return false
  const validTarget = item.targetId === undefined || (typeof item.targetId === 'string' && item.targetId.length > 0)
  if (!validTarget) return false
  if (item.type === 'place') return Boolean(item.targetId && isSpatialObject(item.after) && item.after.id === item.targetId && item.before === null)
  if (item.type === 'move' || item.type === 'adjust' || item.type === 'visibility') {
    return Boolean(item.targetId && isSpatialObject(item.before) && isSpatialObject(item.after)
      && item.before.id === item.targetId && item.after.id === item.targetId)
  }
  if (item.type === 'remove') return Boolean(item.targetId && isSpatialObject(item.before) && item.after === null)
  if (item.type === 'connect') return Boolean(item.targetId && item.before === null && isRelationSchema(item.after) && item.after.toId === item.targetId)
  if (item.type === 'disconnect') return Boolean(item.targetId && item.after === null && isRelationSchema(item.before) && item.before.toId === item.targetId)
  if (item.type === 'viewpoint') return item.targetId === undefined && isViewpoint(item.before) && isViewpoint(item.after)
  return false
}

export function isExperienceSpace(value: unknown): value is ExperienceSpaceV2 {
  if (!value || typeof value !== 'object') return false
  const space = value as Partial<ExperienceSpaceV2>
  if (space.version !== 'experience-space-v2' || typeof space.id !== 'string' || space.id.length === 0) return false
  if (typeof space.rootId !== 'string' || space.rootId.length === 0) return false
  if (space.parentId !== undefined && (typeof space.parentId !== 'string' || space.parentId.length === 0 || space.parentId === space.id)) return false
  if (!starts.has(space.start as ExperienceStart) || !Array.isArray(space.objects) || !Array.isArray(space.actions)) return false
  if (!space.viewpoint || typeof space.viewpoint.distance !== 'number' || !Number.isFinite(space.viewpoint.distance) || space.viewpoint.distance < 0 || space.viewpoint.distance > 1) return false
  if (typeof space.createdAt !== 'string' || Number.isNaN(Date.parse(space.createdAt))) return false
  if (typeof space.updatedAt !== 'string' || Number.isNaN(Date.parse(space.updatedAt))) return false
  const objectIds = new Set<string>()
  if (!space.objects.every(object => {
    if (!isSpatialObject(object) || objectIds.has(object.id)) return false
    objectIds.add(object.id)
    return true
  })) return false
  const relationIds = new Set<string>()
  if (space.relations !== undefined && !space.relations.every(relation => {
    if (!isRelationSchema(relation) || relationIds.has(relation.id)) return false
    if (!objectIds.has(relation.fromId) || !objectIds.has(relation.toId)) return false
    relationIds.add(relation.id)
    return true
  })) return false
  const actionIds = new Set<string>()
  return space.actions.every(item => {
    if (!isActionSchema(item) || actionIds.has(item.id)) return false
    actionIds.add(item.id)
    return true
  })

}

/** Validate a saved collection, including parent/root references. */
export function isExperienceSpaceCollection(value: unknown): value is ExperienceSpaceV2[] {
  if (!Array.isArray(value) || value.length > experienceSpaceCapacity || !value.every(isExperienceSpace)) return false
  const ids = new Set(value.map(space => space.id))
  if (ids.size !== value.length) return false
  const byId = new Map(value.map(space => [space.id, space]))
  for (const space of value) {
    if (!ids.has(space.rootId)) return false
    if (space.parentId === undefined) {
      if (space.id !== space.rootId) return false
      continue
    }
    const seen = new Set<string>([space.id])
    let cursor: ExperienceSpaceV2 | undefined = space
    while (cursor?.parentId) {
      if (seen.has(cursor.parentId)) return false
      seen.add(cursor.parentId)
      const parent = byId.get(cursor.parentId)
      if (!parent || parent.rootId !== space.rootId) return false
      cursor = parent
    }
    if (!cursor || cursor.id !== space.rootId) return false
  }
  return true
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
  const affected = (space.relations ?? []).filter(relation => relation.fromId === targetId || relation.toId === targetId)
  const actions = affected.map(relation => action('disconnect', relation.toId, relation, null))
  return {
    ...space,
    objects: space.objects.filter(object => object.id !== targetId),
    relations: (space.relations ?? []).filter(relation => relation.fromId !== targetId && relation.toId !== targetId),
    actions: [...space.actions, ...actions, action('remove', targetId, before, null)],
    updatedAt: at,
  }
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
    return isExperienceSpaceCollection(parsed) ? parsed.slice(0, experienceSpaceCapacity) : []
  } catch { return [] }
}

export function saveExperienceSpaces(storage: ExperienceStorageLike, spaces: ExperienceSpaceV2[]) {
  if (spaces.length > experienceSpaceCapacity) throw new Error('experience_space_capacity_exceeded')
  storage.setItem(experienceSpaceStorageKey, JSON.stringify(spaces))
}

export interface SpaceDifference {
  objectId?: string
  kind: SpatialObjectKind
  field: 'added' | 'removed' | 'position' | 'depth' | 'scale' | 'opacity' | 'visibility' | 'viewpoint' | 'relation'
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
  const beforeRelations = new Map((before.relations ?? []).map(relation => [relation.id, relation]))
  const afterRelations = new Map((after.relations ?? []).map(relation => [relation.id, relation]))
  for (const relation of before.relations ?? []) {
    if (!afterRelations.has(relation.id)) differences.push({ kind: 'shape', field: 'relation', before: relation.type, after: '—' })
  }
  for (const relation of after.relations ?? []) {
    if (!beforeRelations.has(relation.id)) differences.push({ kind: 'shape', field: 'relation', before: '—', after: relation.type })
  }
  if (before.viewpoint.distance !== after.viewpoint.distance) differences.push({ kind: 'shape', field: 'viewpoint', before: before.viewpoint.distance.toFixed(2), after: after.viewpoint.distance.toFixed(2) })
  return differences
}
