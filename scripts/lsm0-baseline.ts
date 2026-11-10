// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * LSM-0 offline evaluation CLI.
 *
 * Reads a local JSON/JSONL fixture, prints the deterministic descriptive
 * baseline report, and optionally writes the JSON report. No network access,
 * no new dependencies.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { evaluateLsm0Text, formatLsm0Report } from '../src/lsm0-eval'

const usage = [
  'Usage: pnpm tsx scripts/lsm0-baseline.ts --in <fixture.json|fixture.jsonl> [--out <report.json>] [--negative-control] [--seed N]',
  '',
  'Read a local LSM-0 fixture, compute the prespecified descriptive metrics, and',
  'print a report. No network access. This baseline is not a clinical result.',
  '',
  'Options:',
  '  --in <path>   Local JSON or JSONL fixture (required)',
  '  --out <path>  Write the deterministic JSON report to this path',
  '  --negative-control  Include a deterministic within-participant signal-shuffle control',
  '  --seed <n>    Shuffle seed (default 1)',
  '  -h, --help    Show this help',
  '',
  'Exit codes: 0 report printed; 1 read/evaluation failure; 2 usage error.',
].join('\n')

class UsageError extends Error {}

function parseArguments(argv: readonly string[]): { inputPath: string; outputPath?: string; negativeControl?: boolean; seed?: number } {
  let inputPath: string | undefined
  let outputPath: string | undefined
  let negativeControl = false
  let seed = 1
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      process.stdout.write(`${usage}\n`)
      process.exit(0)
    }
    if (argument === '--negative-control') {
      negativeControl = true
      continue
    }
    if (argument === '--seed') {
      const value = argv[index + 1]
      if (value === undefined || !/^\d+$/.test(value)) throw new UsageError('--seed requires a nonnegative integer')
      seed = Number(value)
      index++
      continue
    }
    if (argument === '--in' || argument === '--out') {
      const value = argv[index + 1]
      if (value === undefined || value.startsWith('-')) throw new UsageError(`${argument} requires a path`)
      if (argument === '--in') inputPath = value
      else outputPath = value
      index++
      continue
    }
    throw new UsageError(`unknown argument: ${argument}`)
  }
  if (!inputPath) throw new UsageError('--in is required')
  return { inputPath, ...(outputPath === undefined ? {} : { outputPath }), negativeControl, seed }
}

try {
  const { inputPath, outputPath, negativeControl, seed } = parseArguments(process.argv.slice(2))
  const text = await readFile(resolve(inputPath), 'utf8')
  const report = evaluateLsm0Text(text, { negativeControl, seed })
  process.stdout.write(`${formatLsm0Report(report)}\n`)
  if (outputPath !== undefined) {
    const resolvedOutput = resolve(outputPath)
    await writeFile(resolvedOutput, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    process.stdout.write(`JSON report written to ${resolvedOutput}\n`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (error instanceof UsageError) {
    process.stderr.write(`lsm0-baseline: ${message}\n\n${usage}\n`)
    process.exit(2)
  }
  process.stderr.write(`lsm0-baseline: ${message}\n`)
  process.exit(1)
}
