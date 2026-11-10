// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest'
import { grantCloudConsent } from '../consent'
import { innerPlan } from '../inner'
import { GenieConsentRequiredError, GenieNotConfiguredError, notConfiguredGenieClient } from './client'
import { genieReadiness, readGenieConfig } from './config'

describe('Genie adapter readiness', () => {
  it('stays unconfigured until all adapter fields exist', () => {
    expect(readGenieConfig({})).toBeNull()
    expect(genieReadiness({ GENIE_API_KEY: 'placeholder' })).toMatchObject({ configured: false })
    expect(genieReadiness({}).reason).toMatch(/API/)
    expect(readGenieConfig({ GENIE_API_KEY: 'key', GENIE_BASE_URL: 'not-a-url', GENIE_MODEL_ID: 'genie-4' })).toBeNull()
  })

  it('reads a complete configuration without contacting a network', () => {
    expect(readGenieConfig({ GENIE_API_KEY: 'key', GENIE_BASE_URL: 'https://example.invalid', GENIE_MODEL_ID: 'genie-4' })).toEqual({
      apiKey: 'key', baseUrl: 'https://example.invalid', modelId: 'genie-4',
    })
    expect(genieReadiness({ GENIE_API_KEY: 'key', GENIE_BASE_URL: 'https://example.invalid', GENIE_MODEL_ID: 'genie-4' })).toMatchObject({ configured: true })
  })

  it('rejects a reference frame without a purpose-bound consent record', async () => {
    const plan = innerPlan({ fragment: '一条走廊尽头有一扇门' })
    await expect(notConfiguredGenieClient().createSession({ plan, referenceFrameUrl: '/private/frame.jpg' })).rejects.toBeInstanceOf(GenieConsentRequiredError)
    await expect(notConfiguredGenieClient().createSession({
      plan,
      referenceFrameUrl: '/private/frame.jpg',
      consent: grantCloudConsent('2026-11-01T00:00:00Z'),
    })).rejects.toBeInstanceOf(GenieNotConfiguredError)
  })
})
