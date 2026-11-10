#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Convert a local-dataset-v2 JSON export into LSM-0 session JSON.
 * Offline only; no network, no consent inference, no clinical claim.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { datasetToLsm0Sessions } from '../src/lsm0-dataset'
import { parseLocalDataset } from '../src/local-dataset'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const input = valueAfter('--dataset')
const participantId = valueAfter('--participant')
const output = valueAfter('--out')
if (!input || !participantId) {
  console.error('usage: pnpm lsm0:export --dataset <local-dataset.json> --participant <id> [--out <fixture.json>]')
  process.exit(2)
}
try {
  const dataset = parseLocalDataset(await readFile(resolve(input), 'utf8'))
  const full = { version: 'local-dataset-v2' as const, exportedAt: new Date().toISOString(), ...dataset }
  const result = datasetToLsm0Sessions(full, participantId)
  for (const warning of result.warnings) console.error(`warning: ${warning}`)
  const text = `${JSON.stringify(result.records, null, 2)}\n`
  if (output) {
    await writeFile(resolve(output), text, 'utf8')
    console.log(`wrote ${result.records.length} sessions to ${resolve(output)}`)
  } else {
    process.stdout.write(text)
  }
} catch (error) {
  console.error(`lsm0-export: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
