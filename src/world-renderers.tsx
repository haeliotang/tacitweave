// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { CapturedRenderer, validateCaptured } from './captured-renderer'
import { SymbolicRenderer, validateSymbolic } from './symbolic-renderer'
import { worldRenderers, type WorldRendererProps } from './world-renderer'

worldRenderers.register({
  kind: 'genie4',
  label: 'Google Genie 4',
  status: 'requires_api_access',
  capabilities: { interactive: true, nativeAudio: true, capture: true },
  reason: '等待 Genie 4 API / Project Genie 访问；当前不调用任何外部服务。',
})

worldRenderers.register({
  kind: 'marble',
  label: 'World Labs Marble',
  status: 'not_configured',
  capabilities: { interactive: true, nativeAudio: false, capture: false },
  reason: '保留为环境生成备选，尚未接入。',
})

worldRenderers.register({
  kind: 'symbolic',
  label: '象征空间',
  status: 'available',
  capabilities: { interactive: true, nativeAudio: false, capture: false },
  validate: validateSymbolic,
  Component: SymbolicRenderer,
})

worldRenderers.register({
  kind: 'captured',
  label: '捕获回放',
  status: 'available',
  capabilities: { interactive: false, nativeAudio: true, capture: false },
  validate: validateCaptured,
  Component: CapturedRenderer,
})
