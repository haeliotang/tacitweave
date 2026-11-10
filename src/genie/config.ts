// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from 'zod'

// No network calls live here. This only describes what a future Genie 4 adapter
// would need; the world renderer stays `requires_api_access` until all fields are
// configured and the account has actual API access.

const configSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  modelId: z.string().min(1),
})

export interface GenieConfig {
  apiKey: string
  baseUrl: string
  modelId: string
}

export function readGenieConfig(env: Record<string, string | undefined>): GenieConfig | null {
  const parsed = configSchema.safeParse({
    apiKey: env.GENIE_API_KEY,
    baseUrl: env.GENIE_BASE_URL,
    modelId: env.GENIE_MODEL_ID,
  })
  return parsed.success ? parsed.data : null
}

export function genieReadiness(env: Record<string, string | undefined>) {
  const config = readGenieConfig(env)
  return config
    ? { configured: true as const, reason: 'Genie 4 适配器配置齐全；仍需确认账户与 API 访问已开通。' }
    : { configured: false as const, reason: '等待 GENIE_API_KEY / GENIE_BASE_URL / GENIE_MODEL_ID 与实际 API 访问；当前不调用任何外部服务。' }
}
