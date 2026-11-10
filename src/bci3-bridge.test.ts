// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import WebSocket from 'ws'
import { dedupeSignalSamples, reconcileSignalSamples } from './signal-source'
import { createSignalSession, removeSignalSession } from './signal-session'

const port = 19000 + Math.floor(Math.random() * 1000)
let bridge: ChildProcessWithoutNullStreams
let output = ''

function waitForBridge() {
  return new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error(`bridge did not start: ${output}`)), 8000)
    const timer = setInterval(() => {
      if (output.includes('listening')) { clearInterval(timer); clearTimeout(deadline); resolve() }
    }, 50)
  })
}

function connect() {
  return new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}/bci`)
    socket.once('open', () => resolve(socket))
    socket.once('error', reject)
  })
}

function next(socket: WebSocket) {
  return new Promise<Record<string, unknown>>(resolve => {
    socket.once('message', data => resolve(JSON.parse(String(data)) as Record<string, unknown>))
  })
}

beforeAll(async () => {
  bridge = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/bci3-bridge.ts', '--port', String(port), '--token', 'test-token'], { stdio: ['pipe', 'pipe', 'pipe'] })
  bridge.stdout.on('data', chunk => { output += chunk })
  await waitForBridge()
}, 15_000)

afterAll(() => {
  bridge?.kill('SIGTERM')
})

describe('BCI-3 local bridge', () => {
  it('rejects a bad token and accepts a valid hello', async () => {
    const bad = await connect()
    const badReply = next(bad)
    bad.send(JSON.stringify({ type: 'hello', client: 'tacitweave', token: 'wrong' }))
    expect(await badReply).toMatchObject({ type: 'error', message: 'bridge_auth_failed' })
    bad.close()

    const good = await connect()
    const goodReply = next(good)
    good.send(JSON.stringify({ type: 'hello', client: 'tacitweave', token: 'test-token' }))
    expect(await goodReply).toMatchObject({ type: 'hello', sourceId: 'bci-3-bridge' })
    good.close()
  }, 10_000)

  it('forwards a stdin sample to authenticated clients', async () => {
    const socket = await connect()
    const hello = next(socket)
    socket.send(JSON.stringify({ type: 'hello', client: 'tacitweave', token: 'test-token' }))
    await hello
    const sampleReply = next(socket)
    bridge.stdin.write(JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 66, tMs: 100 }) + '\n')
    expect(await sampleReply).toMatchObject({ type: 'sample', kind: 'heart_rate', value: 66, sourceId: 'bci-3-bridge' })
    socket.close()
    const health = await fetch(`http://127.0.0.1:${port}/health`).then(response => response.json())
    expect(health).toMatchObject({ ok: true, forwarded: 1 })
    expect(health.received).toBeGreaterThanOrEqual(1)
  }, 10_000)
})

describe('SIL bridge reconnect and session boundary', () => {
  it('dedupes a sample repeated after reconnect and keeps an explicit retraction boundary', async () => {
    const first = await connect()
    const firstHello = next(first)
    first.send(JSON.stringify({ type: 'hello', client: 'tacitweave', token: 'test-token' }))
    await firstHello
    const firstSample = next(first)
    bridge.stdin.write(JSON.stringify({ type: 'sample', kind: 'heart_rate', value: 70, tMs: 0 }) + '\n')
    const packetA = await firstSample as { sourceId: string; kind: string; value: number; tMs: number }
    first.close()

    const second = await connect()
    const secondHello = next(second)
    second.send(JSON.stringify({ type: 'hello', client: 'tacitweave', token: 'test-token' }))
    await secondHello
    const secondSample = next(second)
    bridge.stdin.write(JSON.stringify({ type: 'samples', samples: [
      { kind: 'heart_rate', value: 70, tMs: 0 },
      { kind: 'heart_rate', value: 71, tMs: 1000 },
    ] }) + '\n')
    const packetB = await secondSample as { samples: Array<{ kind: 'heart_rate'; value: number; tMs: number }>; sourceId: string }
    second.close()

    expect(packetA.sourceId).toBe(packetB.sourceId)
    const received = [
      { kind: 'heart_rate' as const, value: packetA.value, tMs: packetA.tMs, sourceId: packetA.sourceId },
      ...(packetB.samples ?? []).map(sample => ({ ...sample, sourceId: packetB.sourceId })),
    ]
    const reconciled = reconcileSignalSamples(received)
    const samples = reconciled.samples
    expect(samples).toHaveLength(2)
    expect(reconciled.conflicts).toEqual([])
    const sources = [...new Set(samples.map(sample => sample.sourceId))]
    const timeline = {
      version: 'signal-timeline-v1' as const,
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T00:00:01.000Z',
      samples,
      sources,
      simulated: true,
    }
    const session = createSignalSession(timeline, '2026-01-01T00:00:01.000Z', 'sil-bridge-session')
    expect(session.summary.sampleCount).toBe(2)
    expect(session.summary.bySource?.[0]).toMatchObject({ sourceId: sources[0], sampleCount: 2 })
    expect(removeSignalSession([session], session.id)).toEqual([])
  }, 10_000)
})
