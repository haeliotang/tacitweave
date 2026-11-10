#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { runSilSuite } from '../src/sil-harness'

const args = process.argv.slice(2)
const outIndex = args.indexOf('--out')
const out = outIndex >= 0 ? args[outIndex + 1] : undefined
const results = runSilSuite()
const failed = results.filter(result => !result.passed)
for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.id}: ${result.description} (${result.deliveredSamples} samples)`)
  for (const check of result.checks.filter(item => !item.passed)) {
    console.error(`  ${check.name}: expected ${check.expected}, got ${check.actual}`)
  }
}
if (out) {
  const path = resolve(out)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify({ version: 'sil-run-v1', generatedAt: new Date().toISOString(), results }, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${path}`)
}
if (failed.length) process.exit(1)
