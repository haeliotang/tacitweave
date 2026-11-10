// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
export type ConsentPurpose = 'environment_layout_only'

// Explicit, purpose-bound consent record for any future cloud world-model call.
// The local prototype does not upload real photos or recordings by default; this
// record is what a future Genie adapter must check before sending a reference.
export interface CloudConsentRecord {
  version: 'consent-v1'
  granted: true
  purpose: ConsentPurpose
  grantedAt: string
}

export function grantCloudConsent(grantedAt = new Date().toISOString()): CloudConsentRecord {
  const timestamp = new Date(grantedAt)
  if (Number.isNaN(timestamp.getTime())) throw new Error('invalid_consent_timestamp')
  return { version: 'consent-v1', granted: true, purpose: 'environment_layout_only', grantedAt: timestamp.toISOString() }
}

export function isCloudConsentRecord(value: unknown): value is CloudConsentRecord {
  if (value === null || typeof value !== 'object') return false
  const consent = value as Partial<CloudConsentRecord>
  return consent.version === 'consent-v1'
    && consent.granted === true
    && consent.purpose === 'environment_layout_only'
    && typeof consent.grantedAt === 'string'
    && !Number.isNaN(Date.parse(consent.grantedAt))
}
