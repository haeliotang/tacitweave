// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { compareReleaseVersion, fetchLatestRelease } from './update-check'

describe('update check', () => {
  it('compares semantic release versions', () => {
    expect(compareReleaseVersion('0.1.0', 'v0.2.0')).toBe('available')
    expect(compareReleaseVersion('0.2.0', 'v0.2.0')).toBe('current')
    expect(compareReleaseVersion('0.3.0', 'v0.2.1')).toBe('current')
    expect(compareReleaseVersion('dev', 'v0.2.0')).toBe('unknown')
  })

  it('reads a release payload and rejects bad responses', async () => {
    const release = await fetchLatestRelease(async () => new Response(JSON.stringify({ tag_name: 'v0.2.0', html_url: 'https://example.test/release', published_at: '2026-11-04T00:00:00Z' }), { status: 200 }))
    expect(release).toMatchObject({ tagName: 'v0.2.0', url: 'https://example.test/release' })
    await expect(fetchLatestRelease(async () => new Response('{}', { status: 500 }))).rejects.toThrow('github_release_500')
  })
})
