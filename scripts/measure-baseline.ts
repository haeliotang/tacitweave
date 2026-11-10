// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(process.cwd(), 'dist')
let names: string[]
try {
  names = await readdir(join(root, 'assets'))
} catch {
  process.stderr.write('尚未找到 dist/。先运行 pnpm build。\n')
  process.exit(1)
}
const files = await Promise.all(names
  .filter(name => /\.(js|css)$/.test(name))
  .map(async name => ({ name, bytes: (await stat(join(root, 'assets', name))).size })))
files.sort((a, b) => b.bytes - a.bytes)
const html = await readFile(join(root, 'index.html'), 'utf8')
const scene = files.find(file => file.name.startsWith('scene-') && file.name.endsWith('.js'))
const report = {
  measuredAt: new Date().toISOString(),
  files,
  totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
  sceneChunk: scene ? { name: scene.name, bytes: scene.bytes, preloadedInHtml: html.includes(scene.name) } : null,
  mainChunk: files.find(file => file.name.startsWith('index-') && file.name.endsWith('.js')) ?? null,
  note: 'symbolic-only builds should not produce a scene chunk; a null sceneChunk is expected.',
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
