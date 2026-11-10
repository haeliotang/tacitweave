// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Component, Suspense, type ReactNode } from 'react'
import type { Encounter, SymbolicAgencyEvent } from './encounter'
import { worldRenderers } from './world-renderer'
import { useLanguage } from './i18n'
import './world-renderers'

function SceneFailure() {
  const { t } = useLanguage()
  return <div className="scene-placeholder" role="alert">
    <p>{t('暂时无法打开场景。可以返回，或重新加载页面。')}</p>
    <button onClick={() => window.location.reload()}>{t('重新加载')}</button>
  </div>
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <SceneFailure />
    return this.props.children
  }
}

export function SceneView({ encounter, replay, onAgency }: { encounter: Encounter; replay: number; onAgency?: (event: SymbolicAgencyEvent) => void }) {
  const { t } = useLanguage()
  const renderer = worldRenderers.resolve(encounter.rendererKind)
  if (!renderer) return <div className="scene-placeholder" role="alert">{`${t('未知渲染器')}: ${encounter.rendererKind}. ${t('请更新后再打开。')}`}</div>
  if (renderer.status !== 'available' || !renderer.Component) return <div className="scene-placeholder" role="alert">{`${t(renderer.label)} ${t('尚未就绪')}: ${t(renderer.reason ?? '当前版本不支持该渲染器。')}`}</div>
  if (!encounter.id.startsWith('demo') && !encounter.manifestVerified) return <div className="scene-placeholder" role="alert">{t('这次相遇的记录校验未通过，暂时无法播放。')}</div>
  const invalid = renderer.validate?.(encounter)
  if (invalid) return <div className="scene-placeholder" role="alert">{t(invalid)}</div>
  const Renderer = renderer.Component
  return <SceneBoundary key={encounter.id}><Suspense fallback={<div className="scene-placeholder" role="status">{t('正在打开场景…')}</div>}>
    <Renderer key={`${encounter.id}-${replay}`} encounter={encounter} replay={replay} onAgency={onAgency} />
  </Suspense></SceneBoundary>
}
