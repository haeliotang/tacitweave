// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { grantCloudConsent, isCloudConsentRecord } from './consent'

describe('cloud consent', () => {
  it('creates a purpose-bound, timestamped record', () => {
    const consent = grantCloudConsent('2026-11-01T00:00:00Z')
    expect(consent).toEqual({ version: 'consent-v1', granted: true, purpose: 'environment_layout_only', grantedAt: '2026-11-01T00:00:00.000Z' })
    expect(isCloudConsentRecord(consent)).toBe(true)
  })

  it('rejects invalid timestamps and malformed records', () => {
    expect(() => grantCloudConsent('not-a-date')).toThrow('invalid_consent_timestamp')
    expect(isCloudConsentRecord({ version: 'consent-v1', granted: false })).toBe(false)
    expect(isCloudConsentRecord({ version: 'consent-v1', granted: true, purpose: 'other', grantedAt: '2026-11-01T00:00:00Z' })).toBe(false)
  })
})
