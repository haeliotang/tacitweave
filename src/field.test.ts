// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { addFieldLink, attachFieldNode, clampFieldPosition, emptyFieldLayout, fieldNodeKey, isFieldLayout, removeFieldLink, removeFieldNode, setFieldPosition } from './field'

describe('field layout', () => {
  it('validates and clamps normalized positions', () => {
    expect(clampFieldPosition({ x: -1, y: 2 })).toEqual({ x: 0.04, y: 0.96 })
    expect(clampFieldPosition({ x: 0.4, y: 0.6 })).toEqual({ x: 0.4, y: 0.6 })
    expect(isFieldLayout(emptyFieldLayout())).toBe(true)
  })

  it('adds a user-authored link once and removes it', () => {
    const from = fieldNodeKey('motif', 'a')
    const to = fieldNodeKey('relationship', 'b')
    const withLink = addFieldLink(emptyFieldLayout(), from, to, '2026-11-01T00:00:00Z')
    expect(withLink.links).toHaveLength(1)
    expect(addFieldLink(withLink, to, from).links).toHaveLength(1)
    expect(removeFieldLink(withLink, withLink.links[0].id).links).toHaveLength(0)
  })

  it('removes a node position and every attached link', () => {
    const from = fieldNodeKey('motif', 'a')
    const to = fieldNodeKey('motif', 'b')
    const layout = addFieldLink(setFieldPosition(setFieldPosition(emptyFieldLayout(), from, { x: 0.2, y: 0.3 }), to, { x: 0.7, y: 0.8 }), from, to)
    const next = removeFieldNode(layout, from)
    expect(next.positions[from]).toBeUndefined()
    expect(next.positions[to]).toEqual({ x: 0.7, y: 0.8 })
    expect(next.links).toHaveLength(0)
  })

  it('attaches a new continuity node near its source and links it', () => {
    const source = fieldNodeKey('motif', 'root')
    const target = fieldNodeKey('motif', 'revision')
    const layout = setFieldPosition(emptyFieldLayout(), source, { x: 0.4, y: 0.4 })
    const next = attachFieldNode(layout, source, target, '2026-11-14T00:00:00Z')
    expect(next.positions[target]).toEqual({ x: 0.48000000000000004, y: 0.48000000000000004 })
    expect(next.links).toHaveLength(1)
    expect(next.links[0]).toMatchObject({ from: source, to: target })
  })

  it('rejects malformed layout data', () => {
    expect(isFieldLayout(null)).toBe(false)
    expect(isFieldLayout({ version: 'field-layout-v1', positions: { a: { x: 2, y: 0.5 } }, links: [] })).toBe(false)
    expect(isFieldLayout({ version: 'field-layout-v1', positions: {}, links: [{ id: 'x', from: 'a', to: 'a', createdAt: '2026-11-01T00:00:00Z' }] })).toBe(false)
  })
})
