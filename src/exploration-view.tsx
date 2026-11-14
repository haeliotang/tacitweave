// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useRef, useState } from 'react'
import {
  adjustObject,
  branchExperienceSpace,
  buildSpaceTrails,
  compareExperienceSpaces,
  createExperienceSpace,
  loadExperienceSpaces,
  moveObject,
  placeObject,
  removeObject,
  saveExperienceSpaces,
  setObjectVisibility,
  setViewpoint,
  undoLastAction,
  type ExperienceSpaceV2,
  type ExperienceStart,
  type SpatialObject,
  type SpatialObjectKind,
} from './experience-space'
import { useLanguage } from './i18n'
import './exploration.css'

const kinds: Array<{ value: SpatialObjectKind; label: string; labelEn: string }> = [
  { value: 'door', label: '门', labelEn: 'Door' },
  { value: 'water', label: '水', labelEn: 'Water' },
  { value: 'forest', label: '森林', labelEn: 'Forest' },
  { value: 'shape', label: '形状', labelEn: 'Shape' },
  { value: 'light', label: '光', labelEn: 'Light' },
  { value: 'boundary', label: '边界', labelEn: 'Boundary' },
  { value: 'presence', label: '存在', labelEn: 'Presence' },
]

function kindLabel(kind: SpatialObjectKind, lang: 'zh' | 'en') {
  const item = kinds.find(entry => entry.value === kind)
  return item ? item[lang === 'en' ? 'labelEn' : 'label'] : kind
}

function depthScale(object: SpatialObject) {
  return Math.max(0.35, 0.7 + object.depth * 0.7)
}

function objectStyle(object: SpatialObject, viewDistance: number): React.CSSProperties {
  const viewScale = 1.18 - viewDistance * 0.36
  return {
    left: `${object.x * 100}%`,
    top: `${object.y * 100}%`,
    opacity: object.visible ? object.opacity : 0,
    transform: `translate(-50%, -50%) scale(${object.scale * depthScale(object) * viewScale})`,
    zIndex: 10 + Math.round(object.depth * 80),
  }
}

function SpatialShape({ kind }: { kind: SpatialObjectKind }) {
  if (kind === 'boundary') return <span className="spatial-boundary" />
  if (kind === 'body') return <span className="spatial-body" />
  if (kind === 'water') return <span className="spatial-water" />
  if (kind === 'forest') return <span className="spatial-forest"><i /><i /><i /></span>
  if (kind === 'light') return <span className="spatial-light" />
  if (kind === 'presence') return <span className="spatial-presence" />
  if (kind === 'door') return <span className="spatial-door" />
  return <span className="spatial-shape" />
}

export function ExplorationView({ onExit }: { onExit?: () => void }) {
  const { lang, t } = useLanguage()
  const [spaces, setSpaces] = useState<ExperienceSpaceV2[]>(() => typeof window === 'undefined' ? [] : loadExperienceSpaces(window.localStorage))
  const [space, setSpace] = useState<ExperienceSpaceV2 | null>(null)
  const [bodyPick, setBodyPick] = useState(false)
  const [imageryPick, setImageryPick] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [compareBefore, setCompareBefore] = useState<string>('')
  const [compareAfter, setCompareAfter] = useState<string>('')
  const [drag, setDrag] = useState<{ id: string; startX: number; startY: number; originX: number; originY: number; rect: DOMRect } | null>(null)
  const [preview, setPreview] = useState<{ id: string; x: number; y: number } | null>(null)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!space) return
    setSelectedId(current => current && space.objects.some(object => object.id === current) ? current : space.objects.at(-1)?.id ?? null)
  }, [space])

  const selected = space?.objects.find(object => object.id === selectedId) ?? null

  const start = (kind: ExperienceStart, point?: { x: number; y: number }, initial?: SpatialObjectKind) => {
    const next = createExperienceSpace(kind, point, initial)
    setSpace(next)
    setSelectedId(next.objects.at(-1)?.id ?? null)
    setBodyPick(false)
    setImageryPick(false)
    setStatus('')
  }

  const save = () => {
    if (!space) return
    const next = [space, ...spaces.filter(item => item.id !== space.id)].slice(0, 500)
    setSpaces(next)
    saveExperienceSpaces(window.localStorage, next)
    setStatus(t('已保存到本机。'))
  }

  const branch = () => {
    if (!space) return
    const child = branchExperienceSpace(space)
    setSpace(child)
    setSelectedId(child.objects.at(-1)?.id ?? null)
    setStatus(t('已创建新分支；保存后写入本机。'))
  }

  const leave = () => {
    setSpace(null)
    setSelectedId(null)
    setPreview(null)
    setDrag(null)
    onExit?.()
  }

  const update = (next: ExperienceSpaceV2) => setSpace(next)

  const onBodyPoint = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    start('body', { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height })
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>, object: SpatialObject) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = stage.current?.getBoundingClientRect()
    if (!rect) return
    setSelectedId(object.id)
    setDrag({ id: object.id, startX: event.clientX, startY: event.clientY, originX: object.x, originY: object.y, rect })
    setPreview({ id: object.id, x: object.x, y: object.y })
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId)) return
    const x = Math.min(0.96, Math.max(0.04, drag.originX + (event.clientX - drag.startX) / drag.rect.width))
    const y = Math.min(0.92, Math.max(0.08, drag.originY + (event.clientY - drag.startY) / drag.rect.height))
    setPreview({ id: drag.id, x, y })
  }

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || !space) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (preview && (preview.x !== drag.originX || preview.y !== drag.originY)) update(moveObject(space, drag.id, preview.x, preview.y))
    setDrag(null)
    setPreview(null)
  }

  const selectedPatch = (patch: Partial<Pick<SpatialObject, 'depth' | 'scale' | 'opacity'>>) => {
    if (space && selected) update(adjustObject(space, selected.id, patch))
  }

  if (!space) {
    return <section className="exploration-entry">
      <header className="exploration-heading">
        <p className="eyebrow">{t('探索')}</p>
        <h1>{t('不用先命名，先进入一个空间。')}</h1>
        <p className="workspace-meta">{t('你可以从身体、一个画面，或一片空白开始。所有对象、位置和距离都由你改变；系统不替你解释。')}</p>
      </header>

      <div className="start-grid">
        <button type="button" className="start-card" onClick={() => setBodyPick(true)}>
          <span className="start-symbol">◌</span>
          <strong>{t('从身体开始')}</strong>
          <span>{t('在身体轮廓上点一个位置，不需要先选类别。')}</span>
        </button>
        <button type="button" className="start-card" onClick={() => setImageryPick(true)}>
          <span className="start-symbol">◇</span>
          <strong>{t('从一个画面开始')}</strong>
          <span>{t('选择一个抽象对象，不必解释它代表什么。')}</span>
        </button>
        <button type="button" className="start-card" onClick={() => start('blank')}>
          <span className="start-symbol">□</span>
          <strong>{t('从空白开始')}</strong>
          <span>{t('没有对象也可以；你之后可以添加，也可以什么都不添加。')}</span>
        </button>
      </div>

      {bodyPick && <div className="start-panel">
        <div className="start-panel-head"><h2>{t('点一个身体位置')}</h2><button type="button" className="quiet small" onClick={() => setBodyPick(false)}>{t('取消')}</button></div>
        <button type="button" className="body-outline" aria-label={t('身体轮廓')} onPointerDown={onBodyPoint}>
          <span className="body-head" /><span className="body-torso" /><span className="body-legs" />
        </button>
        <p className="note">{t('只记录你点的位置，不要求命名感受。')}</p>
      </div>}

      {imageryPick && <div className="start-panel">
        <div className="start-panel-head"><h2>{t('选择一个初始对象')}</h2><button type="button" className="quiet small" onClick={() => setImageryPick(false)}>{t('取消')}</button></div>
        <div className="chip-row">{kinds.filter(kind => kind.value !== 'boundary').map(kind => <button key={kind.value} type="button" className="chip" onClick={() => start('imagery', undefined, kind.value)}>{kindLabel(kind.value, lang)}</button>)}</div>
        <p className="note">{t('对象没有预设意义。')}</p>
      </div>}

      {spaces.length > 0 && <div className="saved-spaces">
        <p className="card-label">{t('回访已保存的空间')}</p>
        {buildSpaceTrails(spaces).map(trail => <div key={trail.rootId} className="saved-trail">
          <p className="note">{trail.visits.length} {t('个版本')} · {new Date(trail.root.createdAt).toLocaleString()}</p>
          {trail.visits.map(saved => <button key={saved.id} type="button" className="saved-space" onClick={() => { setSpace(saved); setSelectedId(saved.objects.at(-1)?.id ?? null) }}>
            <span>{saved.parentId ? t('分支') : t('原始空间')} · {new Date(saved.createdAt).toLocaleString()}</span><span>{saved.objects.length} {t('个对象')}</span>
          </button>)}
        </div>)}
        <details className="space-compare">
          <summary>{t('对照两个空间')}</summary>
          <div className="compare-pickers">
            <label>{t('较早')}<select value={compareBefore} onChange={event => setCompareBefore(event.target.value)}><option value="">{t('选择')}</option>{spaces.map(saved => <option key={saved.id} value={saved.id}>{new Date(saved.createdAt).toLocaleString()} · {saved.objects.length} {t('个对象')}</option>)}</select></label>
            <label>{t('较晚')}<select value={compareAfter} onChange={event => setCompareAfter(event.target.value)}><option value="">{t('选择')}</option>{spaces.map(saved => <option key={saved.id} value={saved.id}>{new Date(saved.createdAt).toLocaleString()} · {saved.objects.length} {t('个对象')}</option>)}</select></label>
          </div>
          {compareBefore && compareAfter && compareBefore !== compareAfter ? <div className="space-diff">
            {compareExperienceSpaces(spaces.find(saved => saved.id === compareBefore)!, spaces.find(saved => saved.id === compareAfter)!).map((change, index) => <div key={`${change.objectId ?? 'view'}-${change.field}-${index}`} className="space-diff-row"><span>{change.field}</span><span>{change.kind}</span><span>{change.before}</span><span>→</span><span>{change.after}</span></div>)}
            {compareExperienceSpaces(spaces.find(saved => saved.id === compareBefore)!, spaces.find(saved => saved.id === compareAfter)!).length === 0 && <p className="note">{t('两个空间没有显式配置差异。')}</p>}
          </div> : <p className="note">{t('选择两个已保存空间进行比较。')}</p>}
        </details>
      </div>}
    </section>
  }

  const renderedObjects = space.objects.map(object => preview?.id === object.id ? { ...object, x: preview.x, y: preview.y } : object)
  return <section className="exploration-canvas-view">
    <header className="canvas-toolbar">
      <button type="button" className="text-button" onClick={leave}>← {t('离开')}</button>
      <span className="canvas-title">{t('未命名的空间')}</span>
      <span className="canvas-count">{space.objects.length} {t('个对象')}</span>
      <button type="button" className="quiet small" onClick={() => update(undoLastAction(space))} disabled={!space.actions.length}>{t('撤销')}</button>
      <button type="button" className="quiet small" onClick={branch}>{t('另存为新分支')}</button>
      <button type="button" className="quiet small" onClick={save}>{t('保存')}</button>
      {status && <span className="note" role="status">{status}</span>}
    </header>

    <div className="canvas-layout">
      <div ref={stage} className="symbolic-canvas" role="application" aria-label={t('可操作的象征空间')} style={{ '--view-distance': space.viewpoint.distance } as React.CSSProperties}>
        <svg className="canvas-horizon" viewBox="0 0 100 55" preserveAspectRatio="none" aria-hidden="true"><path d="M0 42 L100 34" /><path d="M0 48 L100 43" /></svg>
        {renderedObjects.map(object => <div
          key={object.id}
          className={`spatial-object kind-${object.kind} ${selectedId === object.id ? 'selected' : ''}`}
          style={objectStyle(object, space.viewpoint.distance)}
          role="button"
          tabIndex={0}
          aria-label={`${t('对象')} ${kindLabel(object.kind, lang)}`}
          aria-pressed={selectedId === object.id}
          onPointerDown={event => onPointerDown(event, object)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={event => {
            if (!space) return
            if (event.key === 'ArrowLeft') { event.preventDefault(); update(moveObject(space, object.id, object.x - 0.03, object.y)) }
            if (event.key === 'ArrowRight') { event.preventDefault(); update(moveObject(space, object.id, object.x + 0.03, object.y)) }
            if (event.key === 'ArrowUp') { event.preventDefault(); update(moveObject(space, object.id, object.x, object.y - 0.03)) }
            if (event.key === 'ArrowDown') { event.preventDefault(); update(moveObject(space, object.id, object.x, object.y + 0.03)) }
            if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); update(removeObject(space, object.id)) }
          }}>
          <SpatialShape kind={object.kind} />
        </div>)}
        {space.objects.length === 0 && <p className="canvas-empty">{t('空间是空的。你可以添加一个对象，也可以就这样待着。')}</p>}
      </div>

      <aside className="canvas-panel">
        <div className="canvas-panel-section">
          <p className="card-label">{t('放置')}</p>
          <div className="object-palette">{kinds.map(kind => <button key={kind.value} type="button" className="chip" onClick={() => update(placeObject(space, kind.value))}>{kindLabel(kind.value, lang)}</button>)}</div>
        </div>
        <label className="canvas-slider">{t('视角距离')} <input type="range" min="0" max="1" step="0.01" value={space.viewpoint.distance} onChange={event => update(setViewpoint(space, Number(event.target.value)))} /></label>
        {selected ? <div className="canvas-panel-section">
          <p className="card-label">{t('已选对象')} · {kindLabel(selected.kind, lang)}</p>
          <label className="canvas-slider">{t('远近')} <input type="range" min="0" max="1" step="0.01" value={selected.depth} onChange={event => selectedPatch({ depth: Number(event.target.value) })} /></label>
          <label className="canvas-slider">{t('大小')} <input type="range" min="0.25" max="3" step="0.05" value={selected.scale} onChange={event => selectedPatch({ scale: Number(event.target.value) })} /></label>
          <label className="canvas-slider">{t('显隐')} <input type="range" min="0" max="1" step="0.05" value={selected.opacity} onChange={event => selectedPatch({ opacity: Number(event.target.value) })} /></label>
          <label className="canvas-check"><input type="checkbox" checked={selected.visible} onChange={event => update(setObjectVisibility(space, selected.id, event.target.checked))} /> {t('可见')}</label>
          <button type="button" className="quiet small" onClick={() => update(removeObject(space, selected.id))}>{t('移除对象')}</button>
        </div> : <p className="note">{t('点一个对象，或从上面放置一个。')}</p>}
        <div className="canvas-panel-section">
          <p className="card-label">{t('操作历史')}</p>
          {space.actions.length === 0 ? <p className="note">{t('还没有操作。')}</p> : <ol className="action-list">{space.actions.slice(-6).reverse().map(action => <li key={action.id}><span>{action.type}</span><span>{action.targetId ? kindLabel(space.objects.find(object => object.id === action.targetId)?.kind ?? 'shape', lang) : t('视角')}</span></li>)}</ol>}
        </div>
      </aside>
    </div>
  </section>
}
