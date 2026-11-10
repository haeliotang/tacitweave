// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import type { CaptureProvenance } from './capture'
import type { RendererKind } from './encounter'
import { demoInnerEncounter } from './inner-encounter'
import { WorldRendererRegistry, worldRenderers } from './world-renderer'
import './world-renderers'

describe('world renderer registry', () => {
  it('resolves episodes without a renderer field to symbolic', () => {
    const renderer = worldRenderers.resolve(undefined)
    expect(renderer).toMatchObject({ kind: 'symbolic', status: 'available' })
    expect(renderer?.Component).toBeTypeOf('function')
  })

  it('reserves Genie 4 without calling an API and explains why', () => {
    const renderer = worldRenderers.get('genie4')
    expect(renderer).toMatchObject({ kind: 'genie4', status: 'requires_api_access', capabilities: { interactive: true, nativeAudio: true, capture: true } })
    expect(renderer?.reason).toMatch(/API/)
    expect(renderer?.Component).toBeUndefined()
  })

  it('plays captured episodes only when valid provenance and a URL exist', () => {
    const captured = worldRenderers.get('captured')!
    expect(captured).toMatchObject({ kind: 'captured', status: 'available', capabilities: { interactive: false, nativeAudio: true, capture: false } })
    expect(captured.validate!(demoInnerEncounter())).toContain('没有可回放')
    const capture: CaptureProvenance = {
      version: 'capture-v1', captureId: 'capture-1', rendererKind: 'captured', mimeType: 'video/mp4',
      durationSec: 75, sha256: 'a'.repeat(64), url: '/synthetic-capture.mp4', synthId: true, createdAt: '2026-11-01T00:00:00Z',
    }
    expect(captured.validate!({ ...demoInnerEncounter(), capture })).toBeUndefined()
  })

  it('exposes the symbolic renderer as a working local prototype', () => {
    const symbolic = worldRenderers.get('symbolic')!
    expect(symbolic).toMatchObject({ kind: 'symbolic', status: 'available', capabilities: { interactive: true, nativeAudio: false, capture: false } })
    expect(symbolic.validate!(demoInnerEncounter())).toBeUndefined()
    expect(symbolic.Component).toBeTypeOf('function')
  })

  it('does not fall back for an unavailable or unknown kind', () => {
    expect(worldRenderers.resolve('genie4')?.kind).toBe('genie4')
    expect(worldRenderers.resolve('unknown' as RendererKind)).toBeUndefined()
  })

  it('keeps every registered renderer contract-complete for future adapters', () => {
    for (const renderer of worldRenderers.list()) {
      expect(renderer.label.length).toBeGreaterThan(0)
      expect(typeof renderer.capabilities.interactive).toBe('boolean')
      expect(typeof renderer.capabilities.nativeAudio).toBe('boolean')
      expect(typeof renderer.capabilities.capture).toBe('boolean')
      if (renderer.status === 'available') {
        expect(renderer.Component).toBeTypeOf('function')
        expect(renderer.validate).toBeTypeOf('function')
      } else {
        expect(renderer.reason?.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps the latest registration for a kind so HMR can re-register descriptors', () => {
    const registry = new WorldRendererRegistry()
    const capabilities = { interactive: true, nativeAudio: false, capture: false }
    registry.register({ kind: 'symbolic', label: 'first', status: 'available', capabilities })
    registry.register({ kind: 'symbolic', label: 'second', status: 'available', capabilities })
    expect(registry.get('symbolic')?.label).toBe('second')
  })
})
