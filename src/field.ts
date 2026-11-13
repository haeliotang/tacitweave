// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
export type FieldNodeKind = 'motif' | 'relationship'
export type FieldLens = 'juxtaposition' | 'body' | 'imagery' | 'relations'
export type FieldRange = 'all' | '30d' | '90d'

export interface FieldPosition {
  x: number
  y: number
}

export interface FieldLink {
  id: string
  from: string
  to: string
  createdAt: string
}

export interface FieldLayout {
  version: 'field-layout-v1'
  positions: Record<string, FieldPosition>
  links: FieldLink[]
}

export const fieldStorageKey = 'tacitweave.field-layout.v1'
export const fieldMin = 0.04
export const fieldMax = 0.96

export function emptyFieldLayout(): FieldLayout {
  return { version: 'field-layout-v1', positions: {}, links: [] }
}

export function fieldNodeKey(kind: FieldNodeKind, id: string) {
  return `${kind}:${id}`
}

export function clampFieldPosition(position: FieldPosition): FieldPosition {
  const clamp = (value: number) => Math.min(fieldMax, Math.max(fieldMin, Number.isFinite(value) ? value : 0.5))
  return { x: clamp(position.x), y: clamp(position.y) }
}

export function isFieldLayout(value: unknown): value is FieldLayout {
  if (!value || typeof value !== 'object') return false
  const layout = value as Partial<FieldLayout>
  if (layout.version !== 'field-layout-v1' || !layout.positions || typeof layout.positions !== 'object' || !Array.isArray(layout.links)) return false
  const positions = Object.values(layout.positions)
  if (!positions.every(position => position && typeof position === 'object'
    && typeof (position as FieldPosition).x === 'number'
    && typeof (position as FieldPosition).y === 'number'
    && Number.isFinite((position as FieldPosition).x)
    && Number.isFinite((position as FieldPosition).y)
    && (position as FieldPosition).x >= 0
    && (position as FieldPosition).x <= 1
    && (position as FieldPosition).y >= 0
    && (position as FieldPosition).y <= 1)) return false
  return layout.links.every(link => link && typeof link === 'object'
    && typeof (link as FieldLink).id === 'string'
    && typeof (link as FieldLink).from === 'string'
    && typeof (link as FieldLink).to === 'string'
    && (link as FieldLink).from !== (link as FieldLink).to
    && typeof (link as FieldLink).createdAt === 'string'
    && !Number.isNaN(Date.parse((link as FieldLink).createdAt)))
}

function linkId(from: string, to: string) {
  return [from, to].sort().join('->')
}

export function addFieldLink(layout: FieldLayout, from: string, to: string, now = new Date().toISOString()): FieldLayout {
  if (from === to) return layout
  const id = linkId(from, to)
  if (layout.links.some(link => link.id === id)) return layout
  return { ...layout, links: [...layout.links, { id, from, to, createdAt: now }] }
}

export function removeFieldLink(layout: FieldLayout, id: string): FieldLayout {
  return { ...layout, links: layout.links.filter(link => link.id !== id) }
}

export function setFieldPosition(layout: FieldLayout, key: string, position: FieldPosition): FieldLayout {
  return { ...layout, positions: { ...layout.positions, [key]: clampFieldPosition(position) } }
}

export function removeFieldNode(layout: FieldLayout, key: string): FieldLayout {
  const positions = { ...layout.positions }
  delete positions[key]
  return { ...layout, positions, links: layout.links.filter(link => link.from !== key && link.to !== key) }
}

export function attachFieldNode(layout: FieldLayout, sourceKey: string, targetKey: string, now = new Date().toISOString()): FieldLayout {
  if (sourceKey === targetKey) return layout
  const source = layout.positions[sourceKey] ?? { x: 0.5, y: 0.5 }
  const offset = 0.06 + (targetKey.length % 3) * 0.01
  const next = setFieldPosition(layout, targetKey, { x: source.x + offset, y: source.y + offset })
  return addFieldLink(next, sourceKey, targetKey, now)
}

export function resetFieldPositions(layout: FieldLayout): FieldLayout {
  return { ...layout, positions: {} }
}


export interface FieldStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function loadFieldLayout(storage: FieldStorageLike): FieldLayout {
  try {
    const raw = storage.getItem(fieldStorageKey)
    if (!raw) return emptyFieldLayout()
    const parsed: unknown = JSON.parse(raw)
    return isFieldLayout(parsed) ? parsed : emptyFieldLayout()
  } catch {
    return emptyFieldLayout()
  }
}

export function saveFieldLayout(storage: FieldStorageLike, layout: FieldLayout) {
  storage.setItem(fieldStorageKey, JSON.stringify(layout))
}

export function clearFieldLayout(storage: FieldStorageLike) {
  storage.removeItem(fieldStorageKey)
}
