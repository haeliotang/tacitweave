// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocketServer, type WebSocket as ServerSocket } from 'ws'
import { grantLocalSignalConsent } from './somatic-signal'
import { WebSocketSignalSource } from './device-signal-source'
import type { SignalSample } from './signal-source'

async function waitFor(check: () => boolean, timeoutMs = 4000) {
  const started = Date.now()
  while (!check()) {
    if (Date.now() - started > timeoutMs) throw new Error('timed out')
    await new Promise(resolve => setTimeout(resolve, 25))
  }
}

const servers: WebSocketServer[] = []
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
})

describe('WebSocketSignalSource reconnect', () => {
  it('reconnects after a dropped bridge and keeps one timeline', async () => {
    const server = new WebSocketServer({ port: 0 })
    servers.push(server)
    await new Promise<void>(resolve => server.once('listening', () => resolve()))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('missing port')
    let connections = 0
    server.on('connection', (socket: ServerSocket) => {
      connections += 1
      socket.on('message', raw => {
        const packet = JSON.parse(String(raw)) as { type?: string }
        if (packet.type !== 'hello') return
        socket.send(JSON.stringify({ type: 'hello', sourceId: 'test-bridge', kinds: ['heart_rate'], sampleRateHz: 2 }))
        socket.send(JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 60 + connections, tMs: 100 + (connections - 1) * 800 }))
        if (connections === 1) setTimeout(() => socket.close(), 20)
      })
    })
    const samples: SignalSample[] = []
    const states: string[] = []
    const source = new WebSocketSignalSource(`ws://127.0.0.1:${address.port}`, 'token', state => states.push(state))
    try {
      source.start(grantLocalSignalConsent('2026-11-01T00:00:00Z'))
      source.subscribe(sample => samples.push(sample))
      await waitFor(() => samples.length >= 2)
      expect(connections).toBeGreaterThanOrEqual(2)
      expect(states).toContain('reconnecting')
      const trace = source.stop()
      expect(trace.samples).toHaveLength(2)
      expect(source.health().reconnects).toBeGreaterThan(0)
      expect(source.health().samples).toBe(2)
      expect(source.health().maxGapMs).toBe(800)
    } finally {
      try { source.stop() } catch { /* already stopped */ }
    }
  })
})
