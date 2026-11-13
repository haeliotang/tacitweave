#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { verifyEvidenceManifest } from '../src/evidence-manifest'

const args = process.argv.slice(2)
const valueAfter = (flag: string) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined }
const manifestPath = valueAfter('--manifest')
if (!manifestPath) {
  console.error('usage: pnpm evidence:verify --manifest <manifest.json> --root <bundle-directory>')
  process.exit(2)
}
const root = resolve(valueAfter('--root') ?? '.')
try {
  const manifest: unknown = JSON.parse(await readFile(resolve(manifestPath), 'utf8'))
  const result = await verifyEvidenceManifest(manifest, root)
  if (!result.ok) {
    for (const issue of result.issues) console.error(`${issue.code}${issue.path ? ` (${issue.path})` : ''}: ${issue.message}`)
    process.exit(1)
  }
  console.log(`evidence manifest verified: ${resolve(manifestPath)}`)
} catch (error) {
  console.error(`evidence-verify: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}
