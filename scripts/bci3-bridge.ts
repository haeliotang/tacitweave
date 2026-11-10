// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createServer } from 'node:http'
import { createInterface } from 'node:readline'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const port = Number(valueAfter('--port') ?? 8765)
const token = valueAfter('--token') ?? randomBytes(18).toString('base64url')
const sampleRateHz = Number(valueAfter('--rate') ?? 1)
const origin = valueAfter('--origin') ?? 'unknown'
const devicePseudonym = valueAfter('--device-pseudonym')
const adapterVersion = valueAfter('--adapter-version')
const streamId = valueAfter('--stream-id')
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('invalid --port')
if (!Number.isFinite(sampleRateHz) || sampleRateHz <= 0) throw new Error('invalid --rate')
if (!['simulated', 'hardware', 'unknown'].includes(origin)) throw new Error('invalid --origin')

function tokenMatches(expected: string, received: unknown) {
  if (typeof received !== 'string') return false
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  return left.length === right.length && timingSafeEqual(left, right)
}

const signalKinds = new Set(['heart_rate', 'eda', 'breath_phase', 'voice_energy', 'body_event', 'imagery_event', 'relationship_event'])
const stats = { received: 0, forwarded: 0, rejected: 0, lastSampleAt: null as string | null }

function allowedOrigin(origin: string | undefined) {
  if (!origin) return true
  if (origin === 'tauri://localhost' || origin === 'http://tauri.localhost') return true
  try {
    const url = new URL(origin)
    return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true, bridge: 'bci-3', clients: wss.clients.size, ...stats }))
    return
  }
  response.writeHead(404, { 'content-type': 'text/plain' })
  response.end('Tacitweave BCI-3 local bridge\n')
})
const wss = new WebSocketServer({ server, path: '/bci', maxPayload: 256 * 1024 })
const authenticated = new Set<WebSocket>()

function send(socket: WebSocket, packet: unknown) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(packet))
}

function broadcast(packet: unknown) {
  for (const socket of authenticated) send(socket, packet)
}

wss.on('connection', (socket, request) => {
  if (!allowedOrigin(request.headers.origin)) {
    socket.close(1008, 'origin_not_allowed')
    return
  }
  const timeout = setTimeout(() => {
    send(socket, { type: 'error', message: 'bridge_hello_timeout' })
    socket.close(1008, 'hello_timeout')
  }, 5000)
  socket.on('message', raw => {
    let packet: { type?: string; token?: string; client?: string } | null = null
    try { packet = JSON.parse(String(raw)) } catch { packet = null }
    if (!packet || packet.type !== 'hello') {
      if (!authenticated.has(socket)) send(socket, { type: 'error', message: 'bridge_hello_required' })
      return
    }
    if (!tokenMatches(token, packet.token) || packet.client !== 'tacitweave') {
      send(socket, { type: 'error', message: 'bridge_auth_failed' })
      socket.close(1008, 'auth_failed')
      return
    }
    clearTimeout(timeout)
    authenticated.add(socket)
    send(socket, {
      type: 'hello',
      sourceId: 'bci-3-bridge',
      origin,
      ...(devicePseudonym ? { devicePseudonym } : {}),
      ...(adapterVersion ? { adapterVersion } : {}),
      ...(streamId ? { streamId } : {}),
      kinds: [...signalKinds],
      sampleRateHz,
    })
  })
  socket.on('close', () => { clearTimeout(timeout); authenticated.delete(socket) })
  socket.on('error', () => { clearTimeout(timeout); authenticated.delete(socket) })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`Tacitweave BCI-3 local bridge listening on ws://127.0.0.1:${port}/bci`)
  console.log(`Token: ${token}`)
  console.log('Health: http://127.0.0.1:' + port + '/health')
  console.log(`Declared origin: ${origin} (use --origin hardware only for a verified adapter).`)
  console.log('Pipe JSONL sample/samples packets via stdin; no raw samples are stored by this process.')
console.log(`Declared source rate: ${sampleRateHz} Hz (override with --rate).`)
})

const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
input.on('line', line => {
  if (!line.trim()) return
  try {
    const packet = JSON.parse(line) as { type?: string; sourceId?: string; kind?: string; samples?: Array<{ kind?: string; value?: number; tMs?: number }>; value?: number; tMs?: number }
    stats.received += 1
    if (packet.type !== 'sample' && packet.type !== 'samples') {
      stats.rejected += 1
      console.error('Ignoring packet: expected type sample or samples')
      return
    }
    const samples = packet.type === 'sample' ? [packet] : (packet.samples ?? [])
    if (!samples.length || samples.some(sample => typeof sample.kind !== 'string' || !signalKinds.has(sample.kind)
      || (sample.value !== undefined && (typeof sample.value !== 'number' || !Number.isFinite(sample.value)))
      || (sample.tMs !== undefined && (typeof sample.tMs !== 'number' || !Number.isFinite(sample.tMs) || sample.tMs < 0)))) {
      stats.rejected += 1
      console.error('Ignoring packet: invalid sample shape')
      return
    }
    stats.forwarded += 1
    stats.lastSampleAt = new Date().toISOString()
    broadcast({ ...packet, sourceId: packet.sourceId ?? 'bci-3-bridge' })
  } catch (error) {
    console.error('Invalid JSONL packet:', error instanceof Error ? error.message : String(error))
  }
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    for (const socket of wss.clients) socket.close(1001, 'bridge_shutdown')
    server.close(() => process.exit(0))
  })
}
