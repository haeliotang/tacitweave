// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { breaths, regions, sensations, type BreathState, type SomaticRegion, type SomaticSensation } from './somatic'
import { exportRelationshipTriggers, responses, summarizeRelationshipTriggers, type RelationshipInput, type RelationshipResponse, type RelationshipSummary, type RelationshipTrigger } from './relationship'
import { buildRelationshipTrails, compareRelationshipContinuity, localizedRelationshipField, type RelationshipRevisitInput } from './relationship-continuity'
import { useLanguage, type Language } from './i18n'
import { RelationshipTopologyView } from './relationship-topology.jsx'

function TriggerSummary({ summary, lang, t }: { summary: RelationshipSummary; lang: Language; t: (zh: string) => string }) {
  if (!summary.total) return null
  const groups = [
    { title: t('身体位置'), items: summary.regions },
    { title: t('感觉'), items: summary.sensations },
    { title: t('身体的第一反应'), items: summary.responses },
  ]
  return <div className="trigger-summary">
    <p className="note">{t('共')} {summary.total} {t('条。下面只是按你选过的字段计数，不是解释，也不代表因果。')}</p>
    <div className="trigger-summary-grid">
      {groups.map(group => <div key={group.title}>
        <h3>{group.title}</h3>
        {group.items.slice(0, 5).map(item => <p key={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']} · {item.count}</p>)}
      </div>)}
    </div>
  </div>
}

function TriggerMap({ entries, lang, t }: { entries: RelationshipTrigger[]; lang: Language; t: (zh: string) => string }) {
  const shown = entries.slice(0, 8)
  return <svg className="trigger-map" viewBox="0 0 360 300" role="img" aria-label={t('关系瞬间地图，节点由用户自己命名')}>
    <circle cx="180" cy="150" r="118" className="trigger-orbit" />
    <circle cx="180" cy="150" r="30" className="trigger-self" />
    <text x="180" y="155" textAnchor="middle" className="trigger-self-label">{t('我')}</text>
    {shown.map((entry, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(shown.length, 1) - Math.PI / 2
      const x = 180 + Math.cos(angle) * 118
      const y = 150 + Math.sin(angle) * 118
      const label = entry.role || entry.situation || entry.cue || t('未命名')
      return <g key={entry.id}>
        <line x1="180" y1="150" x2={x} y2={y} className="trigger-edge" />
        <circle cx={x} cy={y} r="17" className="trigger-node" />
        <text x={x} y={y + 4} textAnchor="middle" className="trigger-node-label">{label.slice(0, 4)}</text>
      </g>
    })}
    {entries.length > 8 && <text x="180" y="288" textAnchor="middle" className="trigger-more">{t('还有')} {entries.length - 8} {t('条')}</text>}
  </svg>
}

function RelationshipContinuityPanel({ entries, lang, t }: { entries: RelationshipTrigger[]; lang: Language; t: (zh: string) => string }) {
  const trails = buildRelationshipTrails(entries).filter(trail => trail.visits.length >= 2)
  const [rootId, setRootId] = useState<string | null>(trails[0]?.rootId ?? null)
  const selected = trails.find(trail => trail.rootId === rootId) ?? trails[0] ?? null
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const [afterId, setAfterId] = useState<string | null>(null)
  if (!selected) return null
  const before = selected.visits.find(entry => entry.id === beforeId) ?? selected.visits[0]
  const after = selected.visits.find(entry => entry.id === afterId) ?? selected.latest
  const changes = compareRelationshipContinuity(before, after)
  return <section className="relationship-continuity-panel">
    <div className="journal-header">
      <div><p className="eyebrow">{t('关系轨迹')}</p><h3>{t('同一个瞬间，之后的再次进入')}</h3><p className="note">{t('只比较你写下的字段；不推断对方、依恋类型或关系变化。')}</p></div>
      <select aria-label={t('选择关系轨迹')} value={selected.rootId} onChange={event => { setRootId(event.target.value); setBeforeId(null); setAfterId(null) }}>
        {trails.map(trail => <option key={trail.rootId} value={trail.rootId}>{trail.root.role || trail.root.situation || trail.root.cue || t('未命名')}</option>)}
      </select>
    </div>
    <div className="compare-pickers">
      <label>{t('较早')}<select value={before.id} onChange={event => setBeforeId(event.target.value)}>{selected.visits.map(entry => <option key={entry.id} value={entry.id}>{new Date(entry.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')} · #{entry.continuity?.visit ?? 1}</option>)}</select></label>
      <label>{t('较晚')}<select value={after.id} onChange={event => setAfterId(event.target.value)}>{selected.visits.map(entry => <option key={entry.id} value={entry.id}>{new Date(entry.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')} · #{entry.continuity?.visit ?? 1}</option>)}</select></label>
    </div>
    <div className="compare-table">
      {changes.filter(change => change.changed).map(change => <div key={change.field} className="compare-row changed">
        <span className="compare-field">{t(change.field === 'role' ? '角色' : change.field === 'situation' ? '场景' : change.field === 'cue' ? '那个瞬间' : change.field === 'region' ? '位置' : change.field === 'sensation' ? '感觉' : change.field === 'intensity' ? '强度' : change.field === 'breath' ? '呼吸' : '身体的第一反应')}</span>
        <span>{localizedRelationshipField(change.field, change.before, lang)}</span>
        <span className="compare-arrow">→</span>
        <span>{localizedRelationshipField(change.field, change.after, lang)}</span>
      </div>)}
      {!changes.some(change => change.changed) && <p className="muted">{t('这次没有字段变化。')}</p>}
    </div>
  </section>
}

export function RelationshipJournal({ entries, onAdd, onRevisit, onRemove, onClear }: { entries: RelationshipTrigger[]; onAdd: (input: RelationshipInput) => void; onRevisit: (sourceId: string, input: RelationshipRevisitInput) => void; onRemove: (id: string) => void; onClear: () => void }) {
  const { lang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('')
  const [situation, setSituation] = useState('')
  const [cue, setCue] = useState('')
  const [region, setRegion] = useState<SomaticRegion>('chest')
  const [sensation, setSensation] = useState<SomaticSensation>('tightness')
  const [intensity, setIntensity] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [breath, setBreath] = useState<BreathState>('shallow')
  const [response, setResponse] = useState<RelationshipResponse>('freeze')
  const [revisitSource, setRevisitSource] = useState<RelationshipTrigger | null>(null)
  const [note, setNote] = useState('')
  const canSave = Boolean(situation.trim() || cue.trim())
  const summary = summarizeRelationshipTriggers(entries)

  const save = () => {
    if (!canSave) return
    if (revisitSource) {
      onRevisit(revisitSource.id, { role, situation, cue, region, sensation, intensity, breath, response, note })
    } else {
      onAdd({ role, situation, cue, region, sensation, intensity, breath, response })
    }
    setRole(''); setSituation(''); setCue(''); setNote(''); setRevisitSource(null); setOpen(false)
  }
  const startRevisit = (entry: RelationshipTrigger) => {
    setRole(entry.role); setSituation(entry.situation); setCue(entry.cue); setRegion(entry.region); setSensation(entry.sensation); setIntensity(entry.intensity); setBreath(entry.breath); setResponse(entry.response)
    setNote(''); setRevisitSource(entry); setOpen(true)
  }
  const exportAll = () => {
    if (!entries.length) return
    const blob = new Blob([exportRelationshipTriggers(entries)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tacitweave-relationship-triggers.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="relationship-journal" aria-labelledby="relationship-title">
    <div className="journal-header">
      <div>
        <h2 id="relationship-title">{t('关系瞬间')}</h2>
        <p className="note">{t('只记录你自己写下的瞬间；不分析对方，不做匹配，不推断“依恋类型”。')}</p>
      </div>
      <div className="actions">
        <button type="button" className="quiet" onClick={() => setOpen(value => !value)}>{open ? t('收起') : t('添加触发点')}</button>
        {entries.length > 0 && <button type="button" className="quiet" onClick={exportAll}>{t('导出 JSON')}</button>}
        {entries.length > 0 && <button type="button" className="quiet" onClick={() => { if (confirm(t('删除本机全部关系瞬间？此操作不可撤销。'))) onClear() }}>{t('全部删除')}</button>}
      </div>
    </div>

    {open && <div className="relationship-form">
      <p className="step-note">{t('请不要写对方真实姓名；用角色或化名即可。全部只保存在本机。')}</p>
      <label>{t('对方角色（可留空）')}<input value={role} maxLength={40} onChange={event => setRole(event.target.value)} placeholder={t('比如：一个总在忙的人')} /></label>
      <label>{t('当时的场景')}<input value={situation} maxLength={100} onChange={event => setSituation(event.target.value)} placeholder={t('比如：对方很久没有回复')} /></label>
      <label>{t('那个瞬间')}<input value={cue} maxLength={100} onChange={event => setCue(event.target.value)} placeholder={t('比如：我看到手机屏幕暗下去')} /></label>
      <div className="relationship-grid">
        <label>{t('身体位置')}<select value={region} onChange={event => setRegion(event.target.value as SomaticRegion)}>{regions.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}</select></label>
        <label>{t('感觉')}<select value={sensation} onChange={event => setSensation(event.target.value as SomaticSensation)}>{sensations.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}</select></label>
        <label>{t('强度')}<select value={intensity} onChange={event => setIntensity(Number(event.target.value) as 1 | 2 | 3 | 4 | 5)}>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>{t('呼吸')}<select value={breath} onChange={event => setBreath(event.target.value as BreathState)}>{breaths.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}</select></label>
      </div>
      <div className="chip-row" role="group" aria-label={t('身体的第一反应')}>
        {responses.map(item => <button type="button" key={item.value} className={`chip ${response === item.value ? 'selected' : ''}`} aria-pressed={response === item.value} onClick={() => setResponse(item.value)}>{item[lang === 'en' ? 'labelEn' : 'label']}</button>)}
      </div>
      {revisitSource && <label>{t('这次再次进入的说明（可选）')}<input value={note} maxLength={200} onChange={event => setNote(event.target.value)} placeholder={t('只记录你愿意留下的说明；系统不解释它。')} /></label>}
      <div className="actions"><button type="button" disabled={!canSave} onClick={save}>{revisitSource ? t('保存为新的进入') : t('保存到本机')}</button><span className="note">{revisitSource ? t('原关系瞬间保留，不会被覆盖。') : t('不解释、不评分、不推断。')}</span></div>
    </div>}

    {entries.length === 0
      ? <p className="note">{t('还没有关系瞬间。你可以记录一个让你身体先反应的瞬间。')}</p>
      : <>
        <TriggerMap entries={entries} lang={lang} t={t} />
        <TriggerSummary summary={summary} lang={lang} t={t} />
        <RelationshipContinuityPanel entries={entries} lang={lang} t={t} />
        <RelationshipTopologyView entries={entries} />
        <ul className="motif-list">
          {entries.map(entry => <li key={entry.id} className="motif-item">
            <div className="motif-main"><span className="motif-name">{entry.role || t('未命名的角色')}</span><span className="motif-date">{new Date(entry.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}</span></div>
            <p className="motif-meta">{entry.situation || t('未写场景')} · {entry.cue || t('未写瞬间')}<br />{regions.find(item => item.value === entry.region)?.[lang === 'en' ? 'labelEn' : 'label']} · {sensations.find(item => item.value === entry.sensation)?.[lang === 'en' ? 'labelEn' : 'label']} · {t('强度')} {entry.intensity}/5 · {responses.find(item => item.value === entry.response)?.[lang === 'en' ? 'labelEn' : 'label']}</p>
            {entry.continuity && <p className="motif-meta">{t('第')} {entry.continuity.visit} {t('次进入')}{entry.continuity.note ? ` · ${entry.continuity.note}` : ''}</p>}
            <div className="actions">
              <button type="button" className="quiet small" onClick={() => startRevisit(entry)}>{t('再次进入')}</button>
              <button type="button" className="quiet small" onClick={() => onRemove(entry.id)}>{t('删除这条')}</button>
            </div>
          </li>)}
        </ul>
      </>}
  </section>
}
