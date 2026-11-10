// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { isCaptureProvenance, type CaptureProvenance } from './capture'

export const captureStorageKey = 'tacitweave.captures.v1'
export const maxCaptureProvenance = 100

export interface CaptureStorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export function isCaptureLedger(value: unknown): value is CaptureProvenance[] {
  return Array.isArray(value) && value.every(isCaptureProvenance)
}

export function loadCaptureProvenance(storage: CaptureStorageLike): CaptureProvenance[] {
  try {
    const raw = storage.getItem(captureStorageKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return isCaptureLedger(parsed) ? parsed.slice(0, maxCaptureProvenance) : []
  } catch {
    return []
  }
}

export function saveCaptureProvenance(storage: CaptureStorageLike, captures: CaptureProvenance[]) {
  storage.setItem(captureStorageKey, JSON.stringify(captures.slice(0, maxCaptureProvenance)))
}

export function clearCaptureProvenance(storage: CaptureStorageLike) {
  storage.removeItem(captureStorageKey)
}

/** Deduplicate by captureId and keep the newest records. */
export function addCaptureProvenance(captures: CaptureProvenance[], capture: CaptureProvenance): CaptureProvenance[] {
  return [capture, ...captures.filter(item => item.captureId !== capture.captureId)]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, maxCaptureProvenance)
}

export function removeCaptureProvenance(captures: CaptureProvenance[], captureId: string): CaptureProvenance[] {
  return captures.filter(item => item.captureId !== captureId)
}
