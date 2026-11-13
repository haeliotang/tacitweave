// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Evidence-manifest contract for public-data reanalysis bundles.
 *
 * The manifest binds dataset files, adapter version, canonical output and
 * reports by SHA-256. Verification never embeds or redistributes raw data; it
 * only checks that the named local files match the recorded hashes.
 */
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, normalize, relative, resolve, sep } from 'node:path'

export const EVIDENCE_MANIFEST_VERSION = 'lsm0-evidence-manifest-v1' as const

export interface EvidenceFile {
  path: string
  sha256: string
  bytes: number
}

export interface EvidenceManifest {
  version: typeof EVIDENCE_MANIFEST_VERSION
  bundleId: string
  createdAt: string
  dataset: {
    name: string
    doi: string
    license: string
    sourceFiles: EvidenceFile[]
  }
  adapter: { name: string; version: string; commit?: string }
  canonical: EvidenceFile & { sessions: number; participants: number }
  analysis: {
    command: string
    feature: string
    outcome: string
    exclusions: string[]
    scriptVersion: string
  }
  reports: EvidenceFile[]
  limitations: string[]
}

export type ManifestIssueCode =
  | 'invalid_manifest'
  | 'invalid_version'
  | 'missing_field'
  | 'invalid_hash'
  | 'invalid_path'
  | 'missing_file'
  | 'hash_mismatch'
  | 'size_mismatch'
  | 'missing_source'
  | 'missing_limitation'
  | 'invalid_counts'

export interface ManifestIssue {
  code: ManifestIssueCode
  path?: string
  message: string
}

export interface ManifestValidation {
  ok: boolean
  issues: ManifestIssue[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function safeRelativePath(path: string): boolean {
  if (!path || isAbsolute(path)) return false
  const normalized = normalize(path)
  return normalized !== '..' && !normalized.startsWith(`..${sep}`) && !relative('.', normalized).startsWith('..')
}

function isFile(value: unknown): value is EvidenceFile {
  if (!isObject(value)) return false
  const bytes = value.bytes
  return typeof value.path === 'string' && typeof value.sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sha256) && typeof bytes === 'number' && Number.isInteger(bytes) && bytes >= 0
}

/** Structural validation; file hashes are checked separately. */
export function validateEvidenceManifest(value: unknown): ManifestValidation {
  const issues: ManifestIssue[] = []
  if (!isObject(value)) return { ok: false, issues: [{ code: 'invalid_manifest', message: 'manifest must be an object' }] }
  if (value.version !== EVIDENCE_MANIFEST_VERSION) issues.push({ code: 'invalid_version', message: `version must be ${EVIDENCE_MANIFEST_VERSION}` })
  if (typeof value.bundleId !== 'string' || !value.bundleId.trim()) issues.push({ code: 'missing_field', message: 'bundleId is required' })
  if (typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt))) issues.push({ code: 'missing_field', message: 'createdAt must be an ISO timestamp' })
  const dataset = value.dataset
  if (!isObject(dataset) || typeof dataset.name !== 'string' || typeof dataset.doi !== 'string' || typeof dataset.license !== 'string') {
    issues.push({ code: 'missing_field', message: 'dataset name/doi/license are required' })
  } else {
    if (typeof dataset.name !== 'string' || !dataset.name.trim()) issues.push({ code: 'missing_field', message: 'dataset.name is required' })
    if (typeof dataset.license !== 'string' || !dataset.license.trim()) issues.push({ code: 'missing_field', message: 'dataset.license is required' })
    if (!Array.isArray(dataset.sourceFiles) || dataset.sourceFiles.length === 0) {
      issues.push({ code: 'missing_source', message: 'at least one source file is required' })
    } else {
      for (const source of dataset.sourceFiles) {
        if (!isFile(source)) issues.push({ code: 'invalid_manifest', path: isObject(source) && typeof source.path === 'string' ? source.path : undefined, message: 'source file needs path, sha256 and bytes' })
        else if (!safeRelativePath(source.path)) issues.push({ code: 'invalid_path', path: source.path, message: 'source path must be relative and stay inside the bundle' })
      }
    }
  }
  const adapter = value.adapter
  if (!isObject(adapter) || typeof adapter.name !== 'string' || typeof adapter.version !== 'string') issues.push({ code: 'missing_field', message: 'adapter name/version are required' })
  const canonical = value.canonical
  if (!isFile(canonical)) {
    issues.push({ code: 'invalid_manifest', message: 'canonical needs path, sha256 and bytes' })
  } else {
    if (!safeRelativePath(canonical.path)) issues.push({ code: 'invalid_path', path: canonical.path, message: 'canonical path must be relative' })
    if (!Number.isInteger((canonical as unknown as Record<string, unknown>).sessions) || (canonical as unknown as Record<string, unknown>).sessions as number <= 0 || !Number.isInteger((canonical as unknown as Record<string, unknown>).participants) || (canonical as unknown as Record<string, unknown>).participants as number <= 0) {
      issues.push({ code: 'invalid_counts', message: 'canonical sessions/participants must be positive integers' })
    }
  }
  const analysis = value.analysis
  if (!isObject(analysis) || typeof analysis.command !== 'string' || typeof analysis.feature !== 'string' || typeof analysis.outcome !== 'string' || typeof analysis.scriptVersion !== 'string' || !Array.isArray(analysis.exclusions)) {
    issues.push({ code: 'missing_field', message: 'analysis command/feature/outcome/scriptVersion/exclusions are required' })
  }
  if (!Array.isArray(value.reports) || !value.reports.every(isFile) || value.reports.some(report => !safeRelativePath(report.path))) {
    issues.push({ code: 'invalid_manifest', message: 'reports must be relative files with hashes' })
  }
  if (!Array.isArray(value.limitations) || value.limitations.length === 0 || value.limitations.some(limitation => typeof limitation !== 'string' || !limitation.trim())) {
    issues.push({ code: 'missing_limitation', message: 'at least one explicit limitation is required' })
  }
  return { ok: issues.length === 0, issues }
}

export async function sha256File(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex')
}

async function checkFile(baseDir: string, file: EvidenceFile): Promise<ManifestIssue[]> {
  if (!safeRelativePath(file.path)) return [{ code: 'invalid_path', path: file.path, message: 'path must be relative' }]
  const fullPath = resolve(baseDir, file.path)
  try {
    const info = await stat(fullPath)
    if (!info.isFile()) return [{ code: 'missing_file', path: file.path, message: 'not a regular file' }]
    if (info.size !== file.bytes) return [{ code: 'size_mismatch', path: file.path, message: `expected ${file.bytes} bytes, got ${info.size}` }]
    const digest = await sha256File(fullPath)
    return digest === file.sha256 ? [] : [{ code: 'hash_mismatch', path: file.path, message: `expected ${file.sha256}, got ${digest}` }]
  } catch {
    return [{ code: 'missing_file', path: file.path, message: 'file is not readable' }]
  }
}

/** Verify every declared file against the local bundle root without modifying it. */
export async function verifyEvidenceManifest(value: unknown, baseDir: string): Promise<ManifestValidation> {
  const structure = validateEvidenceManifest(value)
  if (!structure.ok) return structure
  const manifest = value as EvidenceManifest
  const files = [
    ...manifest.dataset.sourceFiles,
    manifest.canonical,
    ...manifest.reports,
  ]
  const issues: ManifestIssue[] = []
  for (const file of files) issues.push(...await checkFile(baseDir, file))
  return { ok: issues.length === 0, issues }
}
