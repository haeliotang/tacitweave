// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile } from 'node:fs/promises'

const expectedTag = process.argv[2] ?? process.env.GITHUB_REF_NAME
if (!expectedTag) {
  console.error('usage: node scripts/check-release-version.mjs vX.Y.Z')
  process.exit(1)
}
const config = JSON.parse(await readFile(new URL('../apps/desktop/src-tauri/tauri.conf.json', import.meta.url), 'utf8'))
const expected = `v${config.version}`
if (expectedTag !== expected) {
  console.error(`release tag ${expectedTag} does not match tauri.conf.json version ${config.version}`)
  process.exit(1)
}
console.log(`release tag ${expectedTag} matches app version ${config.version}`)
