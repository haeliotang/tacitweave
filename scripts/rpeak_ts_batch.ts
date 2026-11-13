#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, writeFile } from 'node:fs/promises'
import { detectRPeaks } from '../src/ecg-hrv'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined }
const index = valueAfter('--index')
const out = valueAfter('--out')
if (!index || !out) {
  console.error('usage: pnpm tsx scripts/rpeak_ts_batch.ts --index <index.json> --out <peaks.json>')
  process.exit(2)
}
const items: Array<{ id: string; path: string; fs: number }> = JSON.parse(await readFile(index, 'utf8'))
const result: Record<string, number[]> = {}
for (const item of items) {
  const buffer = await readFile(item.path)
  const samples = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 8)
  result[item.id] = detectRPeaks(samples, item.fs)
}
await writeFile(out, JSON.stringify(result))
console.log(`ts peaks written for ${items.length} records`)
