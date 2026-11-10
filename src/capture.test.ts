// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { captureIssue, isCaptureProvenance, type CaptureProvenance } from './capture'

const capture: CaptureProvenance = {
  version: 'capture-v1',
  captureId: 'capture-1',
  rendererKind: 'captured',
  mimeType: 'video/mp4',
  durationSec: 75,
  sha256: 'a'.repeat(64),
  url: '/synthetic-capture.mp4',
  model: 'synthetic-model',
  synthId: true,
  createdAt: '2026-11-01T00:00:00Z',
}

describe('capture provenance', () => {
  it('accepts a complete capture record', () => {
    expect(isCaptureProvenance(capture)).toBe(true)
    expect(captureIssue(capture)).toBeUndefined()
  })

  it('rejects missing, malformed, and unpublished captures', () => {
    expect(captureIssue(undefined)).toContain('没有可回放')
    expect(isCaptureProvenance({ ...capture, sha256: 'short' })).toBe(false)
    expect(isCaptureProvenance({ ...capture, durationSec: 0 })).toBe(false)
    expect(isCaptureProvenance({ ...capture, createdAt: 'not-a-date' })).toBe(false)
    expect(captureIssue({ ...capture, url: undefined })).toContain('回放入口')
  })
})
