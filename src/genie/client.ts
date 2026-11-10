// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { isCloudConsentRecord, type CloudConsentRecord } from '../consent'
import type { InnerPlan } from '../inner'
import type { WorldRenderSession } from '../world-renderer'

export interface GenieSessionRequest {
  plan: InnerPlan
  /** Required before any user-provided reference leaves the device. */
  consent?: CloudConsentRecord
  referenceFrameUrl?: string
}

export interface GenieClient {
  createSession(request: GenieSessionRequest): Promise<WorldRenderSession>
}

export class GenieNotConfiguredError extends Error {}
export class GenieConsentRequiredError extends Error {}

export function assertGenieRequestAllowed(request: GenieSessionRequest) {
  if (request.referenceFrameUrl && !isCloudConsentRecord(request.consent)) {
    throw new GenieConsentRequiredError('reference_requires_explicit_consent')
  }
}

/** Placeholder client used until the real API access and adapter are available. */
export function notConfiguredGenieClient(): GenieClient {
  return {
    async createSession(request) {
      assertGenieRequestAllowed(request)
      throw new GenieNotConfiguredError('genie_not_configured')
    },
  }
}
