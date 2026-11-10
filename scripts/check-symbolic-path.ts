// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(process.cwd(), 'dist')
const mainBudgetBytes = 320_000
const html = await readFile(join(root, 'index.html'), 'utf8')
const assets = await readdir(join(root, 'assets'))
const scene = assets.find(name => name.startsWith('scene-') && name.endsWith('.js'))
const main = assets.find(name => name.startsWith('index-') && name.endsWith('.js'))
if (!main) {
  process.stderr.write('missing main bundle; run pnpm build\n')
  process.exit(1)
}
const mainBytes = (await stat(join(root, 'assets', main))).size
const scenePreloaded = scene ? html.includes(scene) : false
const problems: string[] = []
if (scenePreloaded) problems.push(`scene chunk must not be preloaded: ${scene}`)
if (mainBytes > mainBudgetBytes) problems.push(`main bundle ${mainBytes}B exceeds ${mainBudgetBytes}B budget`)
const report = { main, mainBytes, mainBudgetBytes, scene: scene ?? null, scenePreloaded, ok: problems.length === 0, problems }
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
process.exit(problems.length ? 1 : 0)
