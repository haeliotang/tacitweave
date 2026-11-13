#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { buildQolSessions } from '../src/qol-adapter'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined }
const root = valueAfter('--root')
if (!root) {
  console.error('usage: pnpm qol:canonical --root <QoL_Stress/data> [--out canonical.jsonl]')
  process.exit(2)
}
const sessions = await buildQolSessions({ root: resolve(root) })
const out = valueAfter('--out') ?? resolve(root, 'qol-canonical.jsonl')
await mkdir(dirname(resolve(out)), { recursive: true })
await writeFile(resolve(out), `${sessions.map(session => JSON.stringify(session)).join('\n')}\n`, 'utf8')
console.log(`wrote ${sessions.length} sessions to ${resolve(out)}`)
