// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { captureIssue } from './capture'
import { useLanguage } from './i18n'
import type { Encounter } from './encounter'
import type { WorldRendererProps } from './world-renderer'

export function validateCaptured(encounter: Encounter) {
  return captureIssue(encounter.capture)
}

export function CapturedRenderer({ encounter }: WorldRendererProps) {
  const { t } = useLanguage()
  const capture = encounter.capture
  const issue = captureIssue(capture)
  if (issue || !capture?.url) return <div className="scene-placeholder" role="alert">{t(issue ?? '捕获文件尚未提供回放入口。')}</div>
  return (
    <div className="captured-episode">
      <video className="captured-video" src={capture.url} controls playsInline preload="metadata" aria-label={t('捕获的相遇回放')} />
      <p className="captured-caption">
        {t('捕获回放')} · {capture.model ?? capture.rendererKind} · {capture.durationSec} {t('秒')}
        {capture.synthId ? ` · ${t('含 SynthID 水印')}` : ` · ${t('未标记水印')}`}
        {` · ${t('AI 生成 / 虚构')}`}
      </p>
    </div>
  )
}
