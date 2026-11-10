// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import type { RendererKind } from './encounter'

// Provider-neutral capture record. Non-deterministic world models cannot be
// replayed from a seed, so the episode keeps the captured media fingerprint and
// provenance instead. The media itself stays outside the public repository.

export interface CaptureProvenance {
  version: 'capture-v1'
  captureId: string
  rendererKind: RendererKind
  mimeType: string
  durationSec: number
  sha256: string
  /** Authenticated or local playback URL; absent until the media is published. */
  url?: string
  model?: string
  promptHash?: string
  synthId: boolean
  createdAt: string
}

const sha256Pattern = /^[a-f0-9]{64}$/

export function isCaptureProvenance(value: unknown): value is CaptureProvenance {
  if (value === null || typeof value !== 'object') return false
  const capture = value as Partial<CaptureProvenance>
  return capture.version === 'capture-v1'
    && typeof capture.captureId === 'string' && capture.captureId.length > 0
    && ['procedural', 'genie4', 'marble', 'captured', 'symbolic'].includes(capture.rendererKind ?? '')
    && typeof capture.mimeType === 'string' && capture.mimeType.length > 0
    && typeof capture.durationSec === 'number' && Number.isFinite(capture.durationSec) && capture.durationSec > 0
    && typeof capture.sha256 === 'string' && sha256Pattern.test(capture.sha256)
    && typeof capture.synthId === 'boolean'
    && typeof capture.createdAt === 'string' && !Number.isNaN(Date.parse(capture.createdAt))
}

export function captureIssue(capture: CaptureProvenance | undefined): string | undefined {
  if (!capture) return '这次相遇没有可回放的捕获记录。'
  if (!isCaptureProvenance(capture)) return '这次相遇的捕获记录不完整，暂时无法回放。'
  if (!capture.url) return '捕获文件尚未提供回放入口。'
  return undefined
}
