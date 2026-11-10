#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const platforms = new Set(['darwin-aarch64', 'darwin-x86_64', 'linux-x86_64', 'windows-x86_64'])

function usage() {
  console.log(`Usage:
  node scripts/make-updater-manifest.mjs --version 0.2.0 --tag v0.2.0 --repo owner/repo \\
    --platform windows-x86_64=path/to/Tacitweave-setup.exe.sig \\
    --platform linux-x86_64=path/to/Tacitweave.AppImage.sig \\
    --notes "release notes" --out latest.json

Artifacts are uploaded to GitHub Releases and referenced by their signature filename
without the trailing .sig. Requires Tauri updater artifacts created with the matching
updater private key.`)
}

const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) { usage(); process.exit(0) }
const options = { notes: '', out: 'latest.json', baseUrl: '' }
const artifacts = []
for (let index = 0; index < args.length; index += 1) {
  const key = args[index]
  const value = args[index + 1]
  if (key === '--platform') {
    if (!value || !value.includes('=')) throw new Error('--platform expects PLATFORM=FILE.sig')
    const [platform, file] = value.split('=', 2)
    if (!platforms.has(platform)) throw new Error(`unsupported platform: ${platform}`)
    artifacts.push({ platform, file: resolve(file) })
    index += 1
  } else if (key === '--version' || key === '--tag' || key === '--repo' || key === '--notes' || key === '--out' || key === '--base-url') {
    if (!value) throw new Error(`${key} expects a value`)
    options[key.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase())] = value
    index += 1
  } else {
    throw new Error(`unknown argument: ${key}`)
  }
}
const missing = ['version', 'tag', 'repo'].filter(key => !options[key])
if (missing.length) throw new Error(`missing: ${missing.map(key => `--${key}`).join(', ')}`)
if (artifacts.length === 0) throw new Error('at least one --platform is required')
const baseUrl = options.baseUrl || `https://github.com/${options.repo}/releases/download/${options.tag}/`
const manifest = { version: options.version, notes: options.notes, pub_date: new Date().toISOString(), platforms: {} }
for (const { platform, file } of artifacts) {
  if (manifest.platforms[platform]) throw new Error(`duplicate platform: ${platform}`)
  const signature = readFileSync(file, 'utf8').trim()
  if (!signature) throw new Error(`empty signature: ${file}`)
  const artifactName = basename(file).replace(/\.sig$/, '')
  manifest.platforms[platform] = { signature, url: new URL(artifactName, baseUrl).toString() }
}
writeFileSync(resolve(options.out), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${options.out}`)
