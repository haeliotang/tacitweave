#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { formatPrecisionReport, simulatePrecision } from '../src/lsm0-precision'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined }
const out = valueAfter('--out')
const number = (flag: string, fallback: number) => { const raw = valueAfter(flag); if (raw === undefined) return fallback; const value = Number(raw); if (!Number.isInteger(value) || value <= 0) throw new Error(`invalid ${flag}`); return value }
try {
  const report = simulatePrecision({
    seed: number('--seed', 20261107),
    replications: number('--replicates', 200),
    bootstrapReplicates: number('--bootstrap', 100),
    blockLength: number('--block', 3),
  })
  process.stdout.write(`${formatPrecisionReport(report)}\n`)
  if (out) {
    const path = resolve(out)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    process.stdout.write(`JSON report written to ${path}\n`)
  }
} catch (error) {
  console.error(`lsm0-precision: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}
