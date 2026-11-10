// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { sourceBaseUrl, sourceCommit, sourceUrl } from './source-link'

describe('AGPL source link', () => {
  it('points at the repository tree and a safe commit identifier', () => {
    expect(sourceBaseUrl).toBe('https://github.com/haeliotang/tacitweave')
    expect(sourceCommit).toMatch(/^[A-Za-z0-9._-]+$/)
    expect(sourceUrl).toBe(`${sourceBaseUrl}/tree/${sourceCommit}`)
  })
})
