// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { addFieldLink, clampFieldPosition, fieldNodeKey, removeFieldLink, resetFieldPositions, setFieldPosition, type FieldLayout, type FieldLens, type FieldRange } from './field'
import { regions } from './somatic'
import { useLanguage, type Language } from './i18n'
import type { MotifEntry } from './motif-journal'
import type { RelationshipTrigger } from './relationship'

function dateLabel(iso: string, lang: Language) {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function localizedLabel(items: ReadonlyArray<{ value: string; label: string; labelEn: string }>, value: string, lang: Language) {
  const item = items.find(entry => entry.value === value)
  return lang === 'en' ? item?.labelEn : item?.label
}

function FieldView({ motifs, relationships, selectedId, lens, range, layout, onChange, onSelect, onNew, onDemo, onRangeChange }: { motifs: MotifEntry[]; relationships: RelationshipTrigger[]; selectedId: string | null; lens: FieldLens; range: FieldRange; layout: FieldLayout; onChange: (layout: FieldLayout) => void; onSelect: (id: string) => void; onNew: () => void; onDemo: () => void; onRangeChange: (range: FieldRange) => void }) {
  const { lang, t } = useLanguage()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [linkMode, setLinkMode] = useState(false)
  const [linkSource, setLinkSource] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ key: string; dx: number; dy: number } | null>(null)
  const [draft, setDraft] = useState<FieldLayout['positions'] | null>(null)
  const center = { x: 380, y: 268 }
  const showRelations = lens === 'relations'
  const motifLimit = motifs.slice(0, 14)
  const relationLimit = relationships.slice(0, 10)
  const fallback = (index: number, count: number, inner = false) => {
    const angle = (Math.PI * 2 * index) / Math.max(count, 1) + (inner ? Math.PI / 7 : -Math.PI / 2)
    const radiusX = inner ? 0.12 : 0.22
    const radiusY = inner ? 0.1 : 0.2
    return { x: 0.5 + Math.cos(angle) * radiusX, y: 0.5 + Math.sin(angle) * radiusY }
  }
  const positionOf = (key: string, fallbackPosition: { x: number; y: number }) => draft?.[key] ?? layout.positions[key] ?? fallbackPosition
  const motifNodes = motifLimit.map((motif, index) => ({ motif, key: fieldNodeKey('motif', motif.id), position: positionOf(fieldNodeKey('motif', motif.id), fallback(index, motifLimit.length)) }))
  const relationNodes = relationLimit.map((entry, index) => ({ entry, key: fieldNodeKey('relationship', entry.id), position: positionOf(fieldNodeKey('relationship', entry.id), fallback(index, relationLimit.length, true)) }))
  const nodeMap = new Map<string, { x: number; y: number; kind: 'motif' | 'relationship'; id: string; label: string }>()
  motifNodes.forEach(node => nodeMap.set(node.key, { x: node.position.x * 760, y: node.position.y * 536, kind: 'motif', id: node.motif.id, label: node.motif.name || t('未命名') }))
  relationNodes.forEach(node => nodeMap.set(node.key, { x: node.position.x * 760, y: node.position.y * 536, kind: 'relationship', id: node.entry.id, label: node.entry.role || t('关系瞬间') }))
  const visibleLinks = layout.links.filter(link => nodeMap.has(link.from) && nodeMap.has(link.to) && (showRelations || (!link.from.startsWith('relationship:') && !link.to.startsWith('relationship:'))))

  const pointToField = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: center.x, y: center.y }
    const x = ((clientX - rect.left) / rect.width) * 760
    const y = ((clientY - rect.top) / rect.height) * 536
    return { x: center.x + (x - center.x) / zoom, y: center.y + (y - center.y) / zoom }
  }

  const startDrag = (key: string, event: ReactPointerEvent<SVGGElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    if (linkMode) {
      if (linkSource === key) setLinkSource(null)
      else if (!linkSource) setLinkSource(key)
      else {
        onChange(addFieldLink(layout, linkSource, key))
        setLinkSource(null)
        setLinkMode(false)
      }
      return
    }
    const node = nodeMap.get(key)
    if (!node) return
    const point = pointToField(event.clientX, event.clientY)
    setDrag({ key, dx: node.x - point.x, dy: node.y - point.y })
    svgRef.current?.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return
    const point = pointToField(event.clientX, event.clientY)
    const next = clampFieldPosition({ x: (point.x + drag.dx) / 760, y: (point.y + drag.dy) / 536 })
    setDraft(current => ({ ...(current ?? {}), [drag.key]: next }))
  }

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return
    if (draft) {
      let next = layout
      for (const [key, position] of Object.entries(draft)) next = setFieldPosition(next, key, position)
      onChange(next)
    }
    setDrag(null)
    setDraft(null)
    svgRef.current?.releasePointerCapture?.(event.pointerId)
  }

  const activateNode = (key: string) => {
    if (linkMode) return
    const node = nodeMap.get(key)
    if (node?.kind === 'motif') onSelect(node.id)
  }

  const resetLayout = () => {
    if (drag || linkMode) return
    onChange(resetFieldPositions(layout))
  }

  return <div className={`field-view lens-${lens}`}>
    <div className="field-heading">
      <div><p className="eyebrow">{t('场域')}</p><h1>{t('你的内在地形')}</h1><p className="workspace-meta">{t('片段、意象与关系瞬间并列在这里；没有解释，只有你写下的结构。')}</p></div>
      <button className="primary-button" onClick={onNew}>{t('新建片段')}</button>
    </div>
    {motifs.length === 0 && relationships.length === 0
      ? <div className="field-empty"><p>{t('场域还是空的。先从一个身体位置开始。')}</p><div className="field-empty-actions"><button className="primary-button" onClick={onNew}>{t('开始记录')}</button><button className="quiet-button" onClick={onDemo}>{t('载入示例场域')}</button></div></div>
      : <>
        <div className="field-tools" role="toolbar" aria-label={t('场域工具')}>
          <select value={range} onChange={event => onRangeChange(event.target.value as FieldRange)} aria-label={t('时间范围')}>
            <option value="all">{t('全部时间')}</option>
            <option value="30d">{t('近 30 天')}</option>
            <option value="90d">{t('近 90 天')}</option>
          </select>
          <span className="field-tool-sep" />
          <button type="button" className={linkMode ? 'active' : ''} aria-pressed={linkMode} onClick={() => { setLinkMode(value => !value); setLinkSource(null) }}>{linkMode ? t('取消连接') : t('连接')}</button>
          <button type="button" onClick={() => setZoom(value => Math.min(1.6, Math.round((value + 0.1) * 10) / 10))} aria-label={t('放大')}>＋</button>
          <span className="field-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(value => Math.max(0.7, Math.round((value - 0.1) * 10) / 10))} aria-label={t('缩小')}>−</button>
          <button type="button" onClick={resetLayout}>{t('重置布局')}</button>
          <span className="field-tool-hint">{linkMode ? (linkSource ? t('再选择一个节点') : t('先选择一个节点')) : t('拖动节点排列；点击连线删除')}</span>
        </div>
        <div className="field-canvas">
          <svg ref={svgRef} viewBox="0 0 760 536" role="group" aria-label={t('内在场域地图')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
            <defs><radialGradient id="field-glow"><stop offset="0%" stopColor="currentColor" stopOpacity=".16" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></radialGradient></defs>
            <g transform={`translate(${center.x} ${center.y}) scale(${zoom}) translate(-${center.x} -${center.y})`}>
              <circle cx={center.x} cy={center.y} r="210" className="field-orbit" />
              <circle cx={center.x} cy={center.y} r="136" className="field-orbit inner" />
              <circle cx={center.x} cy={center.y} r="220" fill="url(#field-glow)" className="field-glow" />
              {motifNodes.map(node => <line key={`e-${node.motif.id}`} x1={center.x} y1={center.y} x2={node.position.x * 760} y2={node.position.y * 536} className="field-edge" />)}
              {showRelations && relationNodes.map(node => <line key={`re-${node.entry.id}`} x1={center.x} y1={center.y} x2={node.position.x * 760} y2={node.position.y * 536} className="field-edge relation-edge" />)}
              {visibleLinks.map(link => {
                const from = nodeMap.get(link.from)
                const to = nodeMap.get(link.to)
                if (!from || !to) return null
                return <line key={link.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="field-user-link" onClick={event => { event.stopPropagation(); onChange(removeFieldLink(layout, link.id)) }}><title>{t('点击删除连接')}</title></line>
              })}
              <circle cx={center.x} cy={center.y} r="34" className="field-self" />
              <text x={center.x} y={center.y + 4} textAnchor="middle" className="field-self-label">{t('我')}</text>
              {motifNodes.map(node => <g key={node.key} role="button" tabIndex={0} className={`field-node region-${node.motif.capture.region} ${selectedId === node.motif.id ? 'selected' : ''} ${linkSource === node.key ? 'link-source' : ''} ${drag?.key === node.key ? 'dragging' : ''}`} onPointerDown={event => startDrag(node.key, event)} onClick={() => activateNode(node.key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateNode(node.key) } }}>
                <circle cx={node.position.x * 760} cy={node.position.y * 536} r={lens === 'imagery' ? 14 + node.motif.capture.fragments.length * 2 : 17} />
                <text x={node.position.x * 760} y={node.position.y * 536 + 34} textAnchor="middle" className="field-node-label">{node.motif.name ? node.motif.name.slice(0, 14) : t('未命名')}</text>
                {lens === 'body' && <text x={node.position.x * 760} y={node.position.y * 536 + 48} textAnchor="middle" className="field-node-sub">{localizedLabel(regions, node.motif.capture.region, lang)}</text>}
              </g>)}
              {showRelations && relationNodes.map(node => <g key={node.key} role="button" tabIndex={0} aria-label={node.entry.role || t('关系瞬间')} className={`field-relation-node ${linkSource === node.key ? 'link-source' : ''}`} transform={`translate(${node.position.x * 760},${node.position.y * 536}) rotate(45)`} onPointerDown={event => startDrag(node.key, event)} onClick={() => activateNode(node.key)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateNode(node.key) } }}>
                <rect x="-9" y="-9" width="18" height="18" rx="3" />
              </g>)}
            </g>
          </svg>
        </div>
        <div className="field-legend">
          <span><i className="legend-dot motif" />{t('片段')} · {motifs.length}</span>
          <span><i className="legend-dot relation" />{t('关系瞬间')} · {relationships.length}</span>
          <span className="field-signal"><i className="signal-pulse" />{t('信号')}{lang === 'en' ? ': ' : '：'}{t('本机信号层 · 可选')}</span>
          <span className="field-lens-note">{t('视角')}：{t(lens === 'juxtaposition' ? '并置' : lens === 'body' ? '身体' : lens === 'imagery' ? '意象' : '关系')}</span>
        </div>
      </>}
  </div>
}

function TimelineRail({ motifs, relationships, onSelect }: { motifs: MotifEntry[]; relationships: RelationshipTrigger[]; onSelect: (id: string) => void }) {
  const { lang, t } = useLanguage()
  const items = [...motifs.map(entry => ({ kind: 'motif' as const, id: entry.id, at: entry.createdAt, name: entry.name || t('未命名') })), ...relationships.map(entry => ({ kind: 'relation' as const, id: entry.id, at: entry.createdAt, name: entry.role || t('关系瞬间') }))]
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at)).slice(-12)
  return <div className="timeline-rail">
    <span className="timeline-label">{t('时间轴')}</span>
    <div className="timeline-track">
      {items.length === 0 && <span className="timeline-empty">{t('还没有记录')}</span>}
      {items.map(item => <button key={`${item.kind}-${item.id}`} className={`timeline-item ${item.kind}`} disabled={item.kind === 'relation'} onClick={() => item.kind === 'motif' && onSelect(item.id)} title={item.name}>
        <span className="timeline-dot" /><span className="timeline-name">{item.name}</span><span className="timeline-date">{dateLabel(item.at, lang)}</span>
      </button>)}
    </div>
    <span className="timeline-now">{t('现在')}</span>
  </div>
}


export { FieldView, TimelineRail }
