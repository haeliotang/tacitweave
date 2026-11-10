// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
export interface ReleaseInfo {
  tagName: string
  name: string
  url: string
  publishedAt: string
}

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'current'; latest: ReleaseInfo }
  | { kind: 'available'; latest: ReleaseInfo }
  | { kind: 'error'; message: string }

const releaseApi = 'https://api.github.com/repos/haeliotang/tacitweave/releases/latest'

function parseVersion(value: string) {
  const match = value.trim().replace(/^v/i, '').match(/^(\d+)\.(\d+)\.(\d+)/)
  return match ? match.slice(1).map(Number) : null
}

export function compareReleaseVersion(current: string, latestTag: string): 'current' | 'available' | 'unknown' {
  const left = parseVersion(current)
  const right = parseVersion(latestTag)
  if (!left || !right) return 'unknown'
  for (let index = 0; index < 3; index += 1) {
    if (right[index] > left[index]) return 'available'
    if (right[index] < left[index]) return 'current'
  }
  return 'current'
}

export async function fetchLatestRelease(fetcher: typeof fetch = fetch): Promise<ReleaseInfo> {
  const response = await fetcher(releaseApi, { headers: { Accept: 'application/vnd.github+json' } })
  if (!response.ok) throw new Error(`github_release_${response.status}`)
  const data = await response.json() as { tag_name?: unknown; name?: unknown; html_url?: unknown; published_at?: unknown }
  if (typeof data.tag_name !== 'string' || typeof data.html_url !== 'string') throw new Error('invalid_release_payload')
  return {
    tagName: data.tag_name,
    name: typeof data.name === 'string' ? data.name : data.tag_name,
    url: data.html_url,
    publishedAt: typeof data.published_at === 'string' ? data.published_at : '',
  }
}
