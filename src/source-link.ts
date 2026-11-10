/// <reference types="vite/client" />
// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
function normalizeBase(value: string | undefined): string {
  const fallback = 'https://github.com/haeliotang/tacitweave'
  if (!value) return fallback
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString().replace(/\/$/, '') : fallback
  } catch {
    return fallback
  }
}

function normalizeCommit(value: string | undefined): string {
  return value && /^[A-Za-z0-9._-]{1,128}$/.test(value) ? value : 'main'
}

export const sourceBaseUrl = normalizeBase(import.meta.env.VITE_SOURCE_URL)
export const sourceCommit = normalizeCommit(import.meta.env.VITE_SOURCE_COMMIT)
export const sourceUrl = `${sourceBaseUrl}/tree/${sourceCommit}`
