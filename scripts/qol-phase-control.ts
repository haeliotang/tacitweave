#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parsePublicDataText } from '../src/lsm0-public-data'
import { summarizePhaseChange } from '../src/phase-control'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined }
const input = valueAfter('--in')
if (!input) {
  console.error('usage: pnpm qol:phase-control --in <qol-canonical.jsonl>')
  process.exit(2)
}
const parsed = parsePublicDataText(await readFile(resolve(input), 'utf8'))
const features = ['ecgHeartRateBpm', 'ecgHrvSdnnMs', 'ecgHrvRmssdMs', 'edaMeanSclMicroSiemens', 'stateAnxietyScore']
console.log('feature | paired | missing relax | missing stress | mean delta | median delta | increased | decreased | unchanged')
for (const feature of features) {
  const summary = summarizePhaseChange(parsed.sessions, feature)
  const fmt = (value: number | null) => value === null ? 'n/a' : value.toFixed(3)
  console.log(`${summary.feature} | ${summary.paired} | ${summary.missingRelax} | ${summary.missingStress} | ${fmt(summary.meanDelta)} | ${fmt(summary.medianDelta)} | ${summary.increased} | ${summary.decreased} | ${summary.unchanged}`)
}
console.log('Descriptive paired phase check only; no p-values, causal or construct-validity claim.')
