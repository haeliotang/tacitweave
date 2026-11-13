// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { EVIDENCE_MANIFEST_VERSION, validateEvidenceManifest, verifyEvidenceManifest, type EvidenceManifest } from './evidence-manifest'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })

function digest(text: string) {
  return createHash('sha256').update(text).digest('hex')
}

function entry(path: string, text: string) {
  return { path, sha256: digest(text), bytes: Buffer.byteLength(text) }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'evidence-manifest-'))
  dirs.push(root)
  const source = 'synthetic source\n'
  const canonical = '{"version":"lsm0-public-session-v1"}\n'
  const report = 'report\n'
  await writeFile(join(root, 'source.csv'), source)
  await writeFile(join(root, 'canonical.jsonl'), canonical)
  await writeFile(join(root, 'report.md'), report)
  const manifest: EvidenceManifest = {
    version: EVIDENCE_MANIFEST_VERSION,
    bundleId: 'test-bundle',
    createdAt: '2026-11-13T00:00:00.000Z',
    dataset: { name: 'synthetic', doi: '10.0000/test', license: 'CC0-1.0', sourceFiles: [entry('source.csv', source)] },
    adapter: { name: 'test-adapter', version: 'v1' },
    canonical: { ...entry('canonical.jsonl', canonical), sessions: 1, participants: 1 },
    analysis: { command: 'pnpm test', feature: 'x', outcome: 'y', exclusions: [], scriptVersion: 'v1' },
    reports: [entry('report.md', report)],
    limitations: ['synthetic fixture only'],
  }
  return { root, manifest }
}

describe('evidence manifest', () => {
  it('accepts a complete manifest with matching files', async () => {
    const { root, manifest } = await fixture()
    expect(validateEvidenceManifest(manifest)).toEqual({ ok: true, issues: [] })
    expect(await verifyEvidenceManifest(manifest, root)).toEqual({ ok: true, issues: [] })
  })

  it('detects a tampered canonical file', async () => {
    const { root, manifest } = await fixture()
    await writeFile(join(root, 'canonical.jsonl'), 'tampered\n')
    const result = await verifyEvidenceManifest(manifest, root)
    expect(result.ok).toBe(false)
    expect(result.issues.some(issue => issue.code === 'size_mismatch' || issue.code === 'hash_mismatch')).toBe(true)
  })

  it('requires explicit limitations and reject path traversal', async () => {
    const { manifest } = await fixture()
    expect(validateEvidenceManifest({ ...manifest, limitations: [] }).issues.some(issue => issue.code === 'missing_limitation')).toBe(true)
    expect(validateEvidenceManifest({ ...manifest, canonical: { ...manifest.canonical, path: '../escape' } }).issues.some(issue => issue.code === 'invalid_path')).toBe(true)
  })

  it('requires positive canonical counts and source files', async () => {
    const { manifest } = await fixture()
    expect(validateEvidenceManifest({ ...manifest, canonical: { ...manifest.canonical, sessions: 0 } }).issues.some(issue => issue.code === 'invalid_counts')).toBe(true)
    expect(validateEvidenceManifest({ ...manifest, dataset: { ...manifest.dataset, sourceFiles: [] } }).issues.some(issue => issue.code === 'missing_source')).toBe(true)
  })
})
