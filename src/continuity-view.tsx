// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useEffect, useMemo, useState } from 'react'
import { breaths, certainties, fragments, regions, sensations, type AssociativeFragmentId, type SomaticCapture, type SomaticCertainty, type SomaticRegion, type SomaticSensation } from './somatic'
import { buildContinuityTrails, compareContinuity, continuityRootId, type ContinuityTrail, type RevisitInput } from './continuity'
import type { MotifEntry } from './motif-journal'
import type { SymbolicSession } from './symbolic-session'
import { useLanguage, type Language } from './i18n'
import './continuity.css'

function dateLabel(iso: string, lang: Language) {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function localized(items: ReadonlyArray<{ value: string; label: string; labelEn: string }>, value: string, lang: Language) {
  const item = items.find(entry => entry.value === value)
  return lang === 'en' ? (item?.labelEn ?? value) : (item?.label ?? value)
}

function fieldValue(field: string, value: string, lang: Language) {
  if (field === 'region') return localized(regions, value, lang)
  if (field === 'sensation') return localized(sensations, value, lang)
  if (field === 'breath') return localized(breaths, value, lang)
  if (field === 'certainty') return localized(certainties, value, lang)
  return value
}

function clockLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

const actionLabel: Record<string, string> = {
  approach: '靠近',
  stay: '停留',
  resume: '继续',
  leave: '离开',
  reenter: '重新进入',
  extend: '延长',
  change: '调整',
}

export function ContinuityView({ motifs, sessions, focusId, onRevisit, onOpen, onEnter, onNew }: { motifs: MotifEntry[]; sessions: SymbolicSession[]; focusId?: string | null; onRevisit: (sourceId: string, input: RevisitInput) => void; onOpen: (id: string) => void; onEnter: (id: string) => void; onNew: () => void }) {
  const { lang, t } = useLanguage()
  const trails = useMemo(() => buildContinuityTrails(motifs), [motifs])
  const [selectedRoot, setSelectedRoot] = useState<string | null>(() => {
    const focus = focusId ? motifs.find(motif => motif.id === focusId) : null
    const focusRootId = focus ? continuityRootId(focus) : null
    return trails.find(trail => trail.rootId === focusRootId)?.rootId ?? trails[0]?.rootId ?? null
  })
  const selected = trails.find(trail => trail.rootId === selectedRoot) ?? trails[0] ?? null
  const selectedSessions = selected ? sessions.filter(session => session.motifId === selected.latest.id) : []
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const [afterId, setAfterId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!selected) { setBeforeId(null); setAfterId(null); return }
    if (!selected.visits.some(entry => entry.id === beforeId)) setBeforeId(selected.visits[Math.max(0, selected.visits.length - 2)]?.id ?? null)
    if (!selected.visits.some(entry => entry.id === afterId)) setAfterId(selected.latest.id)
    setEditing(false)
  }, [selected, beforeId, afterId])

  if (!trails.length) return <section className="continuity-empty">
    <p className="eyebrow">{t('连续性')}</p>
    <h2>{t('过去的感觉可以再次进入，而不是被覆盖。')}</h2>
    <p>{t('先留下一个片段；之后可以从这里重新进入，并保留每次变化。')}</p>
    <button type="button" className="primary-button" onClick={onNew}>{t('新建片段')}</button>
  </section>

  const before = selected?.visits.find(entry => entry.id === beforeId) ?? null
  const after = selected?.visits.find(entry => entry.id === afterId) ?? null
  const comparison = before && after ? compareContinuity(before, after) : null
  const latest = selected?.latest ?? null

  return <div className="continuity-view">
    <header className="continuity-heading">
      <div>
        <p className="eyebrow">{t('连续性')}</p>
        <h1>{t('过去的片段，可以再次进入')}</h1>
        <p className="workspace-meta">{t('每次重新进入都会留下新的一版；原记录不被覆盖，也不替你解释变化。')}</p>
      </div>
      <span className="local-badge">{t('只在本机')}</span>
    </header>

    <div className="continuity-layout">
      <aside className="continuity-trails" aria-label={t('经验轨迹')}>
        <p className="section-label">{t('经验轨迹')}</p>
        {trails.map(trail => <button key={trail.rootId} type="button" className={`continuity-trail ${selected?.rootId === trail.rootId ? 'active' : ''}`} onClick={() => setSelectedRoot(trail.rootId)}>
          <span className="trail-title">{trail.root.name || t('未命名')}</span>
          <span className="trail-meta">{trail.visits.length} {t('次进入')} · {dateLabel(trail.latest.createdAt, lang)}</span>
        </button>)}
      </aside>

      {selected && latest && <section className="continuity-detail">
        <div className="continuity-detail-head">
          <div>
            <p className="eyebrow">{t('当前轨迹')}</p>
            <h2>{selected.root.name || t('未命名')}</h2>
            <p className="muted">{selected.visits.length} {t('次进入')} · {t('原记录保留')}</p>
          </div>
          <div className="actions">
            <button type="button" className="quiet" onClick={() => onOpen(selected.latest.id)}>{t('查看最新片段')}</button>
            <button type="button" className="quiet" onClick={() => onEnter(selected.latest.id)}>{t('进入最新空间')}</button>
            <button type="button" className="primary-button" onClick={() => setEditing(value => !value)}>{editing ? t('取消') : t('再次进入')}</button>
          </div>
          {selectedSessions.length > 0 && <div className="continuity-sessions"><p className="card-label">{t('这次片段的主动交互')}</p>{selectedSessions.map(session => <details key={session.id}><summary>{dateLabel(session.createdAt, lang)} · {session.agency.length} {t('个事件')}</summary><ul>{session.agency.map((event, index) => <li key={`${session.id}-${index}`}><span>{clockLabel(event.atSec)}</span><span>{t(actionLabel[event.action] ?? event.action)}</span>{event.change ? <span>{event.change.field}: {event.change.value}</span> : null}{event.durationSec ? <span>{event.durationSec}{t('秒')}</span> : null}</li>)}</ul></details>)}</div>}
        </div>

        <ol className="continuity-visits">
          {selected.visits.map((entry, index) => {
            const entered = sessions.filter(session => session.motifId === entry.id)
            const actionCount = (action: string) => sessions.filter(session => session.motifId === entry.id).reduce((sum, session) => sum + session.agency.filter(event => event.action === action).length, 0)
            const changeCount = actionCount('change')
            return <li key={entry.id} className={`continuity-visit ${entry.id === selected.latest.id ? 'latest' : ''}`}>
              <button type="button" className="visit-main" onClick={() => onOpen(entry.id)}>
                <span className="visit-index">{entry.continuity?.visit ?? index + 1}</span>
                <span><strong>{dateLabel(entry.createdAt, lang)}</strong><small>{entry.continuity?.note || t('没有额外说明')}{entered.length > 0 ? ` · ${entered.length} ${t('次空间')} · ${t('靠近')} ${actionCount('approach')} · ${t('停留')} ${actionCount('stay')} · ${t('离开')} ${actionCount('leave')}${changeCount > 0 ? ` · ${changeCount} ${t('次调整')}` : ''}` : ''}</small></span>
              </button>
              <span className="visit-kind">{entry.continuity?.action === 'revise' ? t('修订') : t('重新进入')}</span>
            </li>
          })}
        </ol>

        {editing && <RevisitEditor source={latest} onCancel={() => setEditing(false)} onSave={input => { onRevisit(latest.id, input); setEditing(false) }} />}

        {!editing && selected.visits.length >= 2 && <section className="continuity-compare">
          <p className="card-label">{t('比较两次进入')}</p>
          <div className="compare-pickers">
            <label>{t('较早')}<select value={beforeId ?? ''} onChange={event => setBeforeId(event.target.value)}>{selected.visits.map(entry => <option key={entry.id} value={entry.id}>{dateLabel(entry.createdAt, lang)} · #{entry.continuity?.visit ?? 1}</option>)}</select></label>
            <label>{t('较晚')}<select value={afterId ?? ''} onChange={event => setAfterId(event.target.value)}>{selected.visits.map(entry => <option key={entry.id} value={entry.id}>{dateLabel(entry.createdAt, lang)} · #{entry.continuity?.visit ?? 1}</option>)}</select></label>
          </div>
          {comparison && <div className="compare-table">
            {comparison.changes.map(change => <div key={change.field} className={`compare-row ${change.changed ? 'changed' : ''}`}>
              <span className="compare-field">{t(change.field === 'name' ? '名字' : change.field === 'region' ? '位置' : change.field === 'sensation' ? '感觉' : change.field === 'intensity' ? '强度' : change.field === 'breath' ? '呼吸' : change.field === 'certainty' ? '确定程度' : change.field === 'symbolic' ? '空间配置' : '意象碎片')}</span>
              <span>{fieldValue(change.field, change.before, lang) || t('空')}</span>
              <span className="compare-arrow">→</span>
              <span>{fieldValue(change.field, change.after, lang) || t('空')}</span>
            </div>)}
            {comparison.changedCount === 0 && <p className="muted">{t('这次没有字段变化；地点本身保持稳定。')}</p>}
          </div>}
        </section>}
      </section>}
    </div>
  </div>
}

function RevisitEditor({ source, onCancel, onSave }: { source: MotifEntry; onCancel: () => void; onSave: (input: RevisitInput) => void }) {
  const { lang, t } = useLanguage()
  const [name, setName] = useState(source.name)
  const [region, setRegion] = useState<SomaticRegion>(source.capture.region)
  const [sensation, setSensation] = useState<SomaticSensation>(source.capture.sensation)
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(source.capture.intensity)
  const [breath, setBreath] = useState(source.capture.breath)
  const [certainty, setCertainty] = useState<SomaticCertainty>(source.capture.certainty ?? 'clear')
  const [selectedFragments, setSelectedFragments] = useState<AssociativeFragmentId[]>([...source.capture.fragments])
  const [note, setNote] = useState('')

  const toggleFragment = (id: AssociativeFragmentId) => {
    setSelectedFragments(current => current.includes(id) ? current.filter(item => item !== id) : current.length >= 3 ? current : [...current, id])
  }

  return <form className="revisit-editor" onSubmit={event => {
    event.preventDefault()
    const capture: SomaticCapture = { region, sensation, intensity, breath, fragments: selectedFragments, certainty }
    onSave({ capture, name, note })
  }}>
    <p className="card-label">{t('再次进入：本次可以改变字段，原记录保留')}</p>
    <label className="field-line">{t('名字')}<input value={name} maxLength={60} onChange={event => setName(event.target.value)} /></label>
    <div className="revisit-grid">
      <label>{t('位置')}<select value={region} onChange={event => setRegion(event.target.value as SomaticRegion)}>{regions.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}</select></label>
      <label>{t('感觉')}<select value={sensation} onChange={event => setSensation(event.target.value as SomaticSensation)}>{sensations.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}</select></label>
      <label>{t('呼吸')}<select value={breath} onChange={event => setBreath(event.target.value as typeof breath)}>{breaths.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}</select></label>
      <label>{t('确定程度')}<select value={certainty} onChange={event => setCertainty(event.target.value as SomaticCertainty)}>{certainties.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}</select></label>
    </div>
    <label className="field-line">{t('强度')} {intensity}/5<input type="range" min={1} max={5} value={intensity} onChange={event => setIntensity(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)} /></label>
    <div className="revisit-fragments">
      <span>{t('意象碎片')}</span>
      <div>{fragments.map(fragment => <button type="button" key={fragment.id} className={`chip small ${selectedFragments.includes(fragment.id) ? 'selected' : ''}`} aria-pressed={selectedFragments.includes(fragment.id)} disabled={!selectedFragments.includes(fragment.id) && selectedFragments.length >= 3} onClick={() => toggleFragment(fragment.id)}>{fragment[lang === 'en' ? 'labelEn' : 'label']}</button>)}</div>
    </div>
    <label className="field-line">{t('这次进入的说明（可选）')}<textarea rows={2} maxLength={200} value={note} onChange={event => setNote(event.target.value)} placeholder={t('只记录你愿意留下的说明；系统不解释它。')} /></label>
    <div className="actions"><button className="primary-button" disabled={selectedFragments.length === 0}>{t('保存为新的进入')}</button><button type="button" className="quiet" onClick={onCancel}>{t('取消')}</button></div>
  </form>
}
