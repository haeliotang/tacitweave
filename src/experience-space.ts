// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

export type ExperienceStart = 'body' | 'imagery' | 'blank'

export type SpatialObjectKind = 'body' | 'door' | 'water' | 'forest' | 'shape' | 'light' | 'boundary' | 'presence'

export type SpatialActionType = 'place' | 'move' | 'adjust' | 'visibility' | 'remove' | 'viewpoint'

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

export interface UserSpatialAction {
  id: string
  type: SpatialActionType
  targetId?: string
  elapsedMs: number
  before?: SpatialObject | Viewpoint | null
  after?: SpatialObject | Viewpoint | null
  source: 'user_input'
}

export interface ExperienceSpaceV2 {
  version: 'experience-space-v2'
  id: string
  rootId: string
  parentId?: string
  start: ExperienceStart
  objects: SpatialObject[]
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
const starts = new Set<ExperienceStart>(['body', 'imagery', 'blank'])

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : (min + max) / 2))
}

function makeObject(kind: SpatialObjectKind, x = 0.5, y = 0.5, source: SpatialObject['source'] = 'user_input'): SpatialObject {
  return { id: uuid(), kind, x: clamp(x, 0.04, 0.96), y: clamp(y, 0.08, 0.92), depth: 0.5, scale: 1, opacity: 1, visible: true, source }
}

function action(type: SpatialActionType, targetId: string | undefined, before: UserSpatialAction['before'], after: UserSpatialAction['after']): UserSpatialAction {
  return { id: uuid(), type, ...(targetId ? { targetId } : {}), elapsedMs: 0, before: before ?? null, after: after ?? null, source: 'user_input' }
}

export function createExperienceSpace(start: ExperienceStart, point?: { x: number; y: number }, initialKind?: SpatialObjectKind, at = now()): ExperienceSpaceV2 {
  if (!starts.has(start)) throw new Error('invalid_start')
  const objects: SpatialObject[] = []
  if (start === 'body') objects.push(makeObject('body', point?.x ?? 0.5, point?.y ?? 0.5))
  if (start === 'imagery') objects.push(makeObject(initialKind && initialKind !== 'body' && initialKind !== 'boundary' ? initialKind : 'shape'))
  const id = uuid()
  return { version: 'experience-space-v2', id, rootId: id, start, objects, viewpoint: { distance: 0.5 }, actions: [], createdAt: at, updatedAt: at }
}

export function isExperienceSpace(value: unknown): value is ExperienceSpaceV2 {
  if (!value || typeof value !== 'object') return false
  const space = value as Partial<ExperienceSpaceV2>
  if (space.version !== 'experience-space-v2' || typeof space.id !== 'string' || typeof space.rootId !== 'string') return false
  if (!starts.has(space.start as ExperienceStart) || !Array.isArray(space.objects) || !Array.isArray(space.actions)) return false
  if (!space.viewpoint || typeof space.viewpoint.distance !== 'number' || !Number.isFinite(space.viewpoint.distance)) return false
  if (typeof space.createdAt !== 'string' || Number.isNaN(Date.parse(space.createdAt))) return false
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
  return { ...space, objects, viewpoint, actions: space.actions.slice(0, -1), updatedAt: at }
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
