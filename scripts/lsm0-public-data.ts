#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { evaluatePublicData, formatPublicDataReport, parsePublicDataText } from '../src/lsm0-public-data'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined }
const input = valueAfter('--in')
if (!input) {
  console.error('usage: pnpm lsm0:public --in <canonical.jsonl> [--feature heartRateBpm] [--out report.json]')
  process.exit(2)
}
try {
  const parsed = parsePublicDataText(await readFile(resolve(input), 'utf8'))
  if (parsed.rejected.length) console.error(`ignored ${parsed.rejected.length} invalid line(s)`)
  const report = evaluatePublicData(parsed.sessions, { feature: valueAfter('--feature') ?? 'heartRateBpm', outcome: valueAfter('--outcome') ?? 'intensity' })
  process.stdout.write(`${formatPublicDataReport(report)}\n`)
  if (valueAfter('--out')) {
    const path = resolve(valueAfter('--out')!)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(`wrote ${path}`)
  }
} catch (error) {
  console.error(`lsm0-public-data: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}
