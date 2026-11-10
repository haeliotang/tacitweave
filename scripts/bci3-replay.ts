#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Replay a local JSONL recording into `scripts/bci3-bridge.ts` with optional
 * timing jitter and deterministic drops. This is a verification aid, not real
 * hardware capture:
 *
 *   pnpm bci:replay --in recording.jsonl --jitter-ms 20 --drop-every 50 \
 *     | pnpm bci:bridge --port 8765 --token local-dev-token --rate 1
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { buildReplayPackets, parseReplaySamples } from '../src/bci3-replay'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const input = valueAfter('--in')
if (!input) {
  console.error('usage: pnpm bci:replay --in <recording.jsonl> [--jitter-ms 0] [--drop-every 0] [--speed 1] [--source-id bci3-replay]')
  process.exit(2)
}
const numberAfter = (flag: string, fallback: number) => {
  const raw = valueAfter(flag)
  if (raw === undefined) return fallback
  const value = Number(raw)
  if (!Number.isFinite(value)) throw new Error(`invalid ${flag}`)
  return value
}
try {
  const text = await readFile(resolve(input), 'utf8')
  const parsed = parseReplaySamples(text)
  if (parsed.rejected > 0) console.error(`bci3-replay: ignored ${parsed.rejected} invalid line(s)`)
  const packets = buildReplayPackets(parsed.samples, {
    sourceId: valueAfter('--source-id') ?? 'bci3-replay',
    speed: numberAfter('--speed', 1),
    jitterMs: numberAfter('--jitter-ms', 0),
    dropEvery: numberAfter('--drop-every', 0),
    seed: numberAfter('--seed', 1),
  })
  for (const item of packets) {
    if (item.delayMs > 0) await new Promise(resolve => setTimeout(resolve, item.delayMs))
    if (!item.dropped) process.stdout.write(`${JSON.stringify(item.packet)}\n`)
  }
} catch (error) {
  console.error(`bci3-replay: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
