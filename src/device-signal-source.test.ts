// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { grantLocalSignalConsent } from './somatic-signal'
import { isLocalBridgeUrl, parseBridgePacket, reconnectDelay, WebSocketSignalSource } from './device-signal-source'
import { dedupeSignalSamples } from './signal-source'

const consent = grantLocalSignalConsent('2026-11-01T00:00:00Z')

describe('BCI-2 device bridge contract', () => {
  it('only allows a local WebSocket bridge', () => {
    expect(isLocalBridgeUrl('ws://127.0.0.1:8765')).toBe(true)
    expect(isLocalBridgeUrl('ws://localhost:8765')).toBe(true)
    expect(isLocalBridgeUrl('wss://example.com')).toBe(false)
    expect(isLocalBridgeUrl('https://127.0.0.1:8765')).toBe(false)
    expect(() => new WebSocketSignalSource('ws://example.com:8765', '')).toThrow()
  })

  it('parses single and batched bridge samples', () => {
    const single = parseBridgePacket({ type: 'sample', kind: 'heart_rate', value: 68, tMs: 1200 }, 2000, 'bridge')
    expect(single).toEqual([{ tMs: 1200, kind: 'heart_rate', value: 68, sourceId: 'bridge' }])
    const batch = parseBridgePacket({ type: 'samples', samples: [{ kind: 'eda', value: 2.1 }, { kind: 'unknown' as never, value: 1 }] }, 5000, 'bridge')
    expect(batch).toEqual([{ tMs: 5000, kind: 'eda', value: 2.1, sourceId: 'bridge' }])
    expect(parseBridgePacket({ type: 'hello' }, 0, 'bridge')).toEqual([])
    expect(parseBridgePacket({ type: 'samples', samples: [{ kind: 'eda', value: Number.NaN }, { kind: 'eda', tMs: -1 }] }, 7000, 'bridge')).toEqual([
      { tMs: 7000, kind: 'eda', sourceId: 'bridge' },
      { tMs: 7000, kind: 'eda', sourceId: 'bridge' },
    ])
  })

  it('uses bounded exponential reconnect delays', () => {
    expect([1, 2, 3, 5, 8, 20].map(reconnectDelay)).toEqual([250, 500, 1000, 4000, 5000, 5000])
  })

  it('requires local consent before starting', () => {
    const source = new WebSocketSignalSource('ws://127.0.0.1:8765', '')
    expect(() => source.start({ ...consent, localOnly: false } as unknown as typeof consent)).toThrow()
    expect(() => source.stop()).toThrow()
  })
})


class FakeSocket {
  static instances: FakeSocket[] = []
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  sent: string[] = []
  constructor(public readonly url: string) { FakeSocket.instances.push(this) }
  send(data: string) { this.sent.push(data) }
  close() { this.onclose?.() }
  open() { this.onopen?.() }
  message(packet: unknown) { this.onmessage?.({ data: JSON.stringify(packet) }) }
}

const originalWebSocket = globalThis.WebSocket

beforeEach(() => {
  vi.useFakeTimers()
  FakeSocket.instances = []
  ;(globalThis as unknown as { WebSocket: typeof FakeSocket }).WebSocket = FakeSocket
})

afterEach(() => {
  vi.useRealTimers()
  ;(globalThis as unknown as { WebSocket: typeof originalWebSocket }).WebSocket = originalWebSocket
})

describe('WebSocketSignalSource reconnect path', () => {
  it('auto-reconnects, keeps source identity and deduplicates replay samples', async () => {
    const source = new WebSocketSignalSource('ws://127.0.0.1:8765', 'token')
    source.start(consent)
    const first = FakeSocket.instances[0]
    first.open()
    first.message({ type: 'hello', sampleRateHz: 1, origin: 'hardware', devicePseudonym: 'dev-1', adapterVersion: 'adapter-1' })
    first.message({ type: 'samples', sourceId: 'device-A', samples: [{ kind: 'heart_rate', value: 70, tMs: 0, seq: 1, streamId: 'stream-1' }] })
    first.close()
    await vi.advanceTimersByTimeAsync(300)
    const second = FakeSocket.instances[1]
    second.open()
    second.message({ type: 'hello', sampleRateHz: 1, origin: 'hardware', devicePseudonym: 'dev-1', adapterVersion: 'adapter-1' })
    second.message({ type: 'samples', sourceId: 'device-A', samples: [{ kind: 'heart_rate', value: 70, tMs: 0, seq: 1, streamId: 'stream-1' }] })
    const trace = source.stop()
    expect(source.health().reconnects).toBe(1)
    expect(trace).toMatchObject({ origin: 'hardware', simulated: false, devicePseudonym: 'dev-1', adapterVersion: 'adapter-1' })
    expect(trace.samples).toHaveLength(2)
    expect(trace.samples[0]).toMatchObject({ streamId: 'stream-1', seq: 1, sourceId: 'device-A' })
    expect(dedupeSignalSamples(trace.samples)).toHaveLength(1)
  })
})


describe('signal provenance', () => {
  it('marks a bridge that does not declare hardware origin as simulated', () => {
    const source = new WebSocketSignalSource('ws://127.0.0.1:8765', 'token')
    source.start(consent)
    const socket = FakeSocket.instances[0]
    socket.open()
    socket.message({ type: 'hello', sampleRateHz: 1 })
    socket.message({ type: 'sample', kind: 'heart_rate', value: 60, tMs: 0 })
    const trace = source.stop()
    expect(trace).toMatchObject({ origin: 'unknown', simulated: true })
  })
})
