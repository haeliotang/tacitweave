#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { buildCaseSessions, type CaseParticipantFiles } from '../src/case-adapter'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined }
const root = valueAfter('--root')
if (!root) {
  console.error('usage: pnpm case:canonical --root <CASE_snippet> [--participants 1,2] [--out canonical.jsonl]')
  process.exit(2)
}
const participants = (valueAfter('--participants') ?? '1,2').split(',').map(value => value.trim()).filter(Boolean)
const base = resolve(root)
const files: CaseParticipantFiles[] = participants.map(participant => ({
  participantCode: `P${participant}`,
  annotationPath: join(base, 'data', 'interpolated', 'annotations', `sub_${participant}.csv`),
  physiologicalPath: join(base, 'data', 'interpolated', 'physiological', `sub_${participant}.csv`),
}))
const sessions = await buildCaseSessions(files)
const out = valueAfter('--out') ?? join(base, 'case-canonical.jsonl')
await mkdir(dirname(resolve(out)), { recursive: true })
await writeFile(resolve(out), `${sessions.map(session => JSON.stringify(session)).join('\n')}\n`, 'utf8')
console.log(`wrote ${sessions.length} sessions to ${resolve(out)}`)
