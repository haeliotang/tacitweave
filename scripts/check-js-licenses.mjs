#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { execFileSync } from 'node:child_process'

const allowed = new Set([
  '0BSD', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'CC0-1.0', 'ISC',
  'LGPL-2.1-or-later', 'LGPL-3.0-or-later', 'MIT', 'MPL-2.0', 'Unicode-3.0',
  'Unicode-DFS-2016', 'Zlib', 'CC-BY-4.0',
])
const review = new Set(['CC-BY-4.0'])
const raw = execFileSync('pnpm', ['licenses', 'list', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const groups = JSON.parse(raw)
const denied = []
const flagged = []
for (const [expression, packages] of Object.entries(groups)) {
  const alternatives = expression.split(/\s+OR\s+/i).map(value => value.trim())
  const bad = alternatives.filter(value => !allowed.has(value))
  if (bad.length) denied.push(`${expression}: ${bad.join(', ')} (${packages.length} package(s))`)
  if (alternatives.some(value => review.has(value))) flagged.push(`${expression} (${packages.length} package(s))`)
}
if (flagged.length) console.warn(`license review flags: ${flagged.join('; ')}`)
if (denied.length) {
  console.error('license policy failed:')
  for (const item of denied) console.error(`- ${item}`)
  process.exit(1)
}
console.log(`JS dependency licenses accepted (${Object.keys(groups).length} expressions).`)
