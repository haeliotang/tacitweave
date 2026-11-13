#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { resolve } from 'node:path'
import { computeEcgHrv } from '../src/ecg-hrv'

const input = process.argv[process.argv.indexOf('--in') + 1]
if (!input || input === '--in') {
  console.error('usage: pnpm qol:hrv-check --in <ecg.csv>')
  process.exit(2)
}
const rows: Array<{ recorded: number; detected: number | null; peaks: number; sdnn: number | null }> = []
const lines = createInterface({ input: createReadStream(resolve(input), { encoding: 'utf8' }), crlfDelay: Infinity })
let header: string[] | null = null
for await (const line of lines) {
  if (!line.trim()) continue
  const parts = line.split(',')
  if (!header) { header = parts.map(value => value.replace(/^\ufeff/, '')); continue }
  const index = (name: string) => header!.indexOf(name)
  const waveform = parts[index('waveform_samples')]
  const recorded = Number(parts[index('heart_rate')])
  if (!waveform || !Number.isFinite(recorded)) continue
  const samples = waveform.split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite)
  const hrv = computeEcgHrv(samples, 250)
  rows.push({ recorded, detected: hrv.heartRateBpm, peaks: hrv.peaks.length, sdnn: hrv.sdnnMs })
}
const valid = rows.filter(row => row.detected !== null) as Array<{ recorded: number; detected: number; peaks: number; sdnn: number | null }>
const errors = valid.map(row => Math.abs(row.detected - row.recorded))
console.log(`records=${rows.length} detected=${valid.length}`)
console.log(`mean_abs_hr_error=${(errors.reduce((a, b) => a + b, 0) / errors.length).toFixed(2)} bpm`)
console.log(`within_10_bpm=${valid.filter(row => Math.abs(row.detected - row.recorded) <= 10).length}/${valid.length}`)
console.log(`mean_sdnn_ms=${(valid.filter(row => row.sdnn !== null).reduce((sum, row) => sum + (row.sdnn as number), 0) / valid.filter(row => row.sdnn !== null).length).toFixed(1)}`)
console.log('Descriptive detector check only; not a clinical or research-grade validation.')
