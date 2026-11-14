// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import type { Encounter } from './encounter'
import { innerPlanFromCapture, type InnerFigure, type InnerMotif } from './inner'
import type { MotifSymbolic } from './motif-journal'
import { createComposedCaptureEncounter } from './inner-encounter'
import { composeInnerPlan, compositionFromSymbolic } from './space-composition'
import type { SomaticCapture } from './somatic'
import { useLanguage } from './i18n'
import './continuity.css'

const motifOptions: Array<{ value: InnerMotif; label: string; labelEn: string }> = [
  { value: 'corridor', label: '走廊', labelEn: 'Corridor' },
  { value: 'door', label: '门', labelEn: 'Door' },
  { value: 'water', label: '水', labelEn: 'Water' },
  { value: 'house', label: '房屋', labelEn: 'House' },
  { value: 'forest', label: '森林', labelEn: 'Forest' },
  { value: 'station', label: '车站', labelEn: 'Station' },
  { value: 'mirror', label: '镜子', labelEn: 'Mirror' },
  { value: 'field', label: '田野', labelEn: 'Field' },
]

const figureOptions: Array<{ value: InnerFigure; label: string; labelEn: string }> = [
  { value: 'none', label: '不需要形象', labelEn: 'No figure' },
  { value: 'shadow', label: '影子', labelEn: 'Shadow' },
  { value: 'stranger', label: '陌生人', labelEn: 'Stranger' },
  { value: 'child', label: '孩子', labelEn: 'Child' },
  { value: 'animal', label: '动物', labelEn: 'Animal' },
]

export function SpaceComposer({ capture, motifId, initial, onStart, onCancel }: { capture: SomaticCapture; motifId?: string; initial?: MotifSymbolic; onStart: (encounter: Encounter) => void; onCancel: () => void }) {
  const { lang, t } = useLanguage()
  const base = innerPlanFromCapture(capture)
  const initialComposition = initial ? compositionFromSymbolic(initial) : null
  const [motifs, setMotifs] = useState<InnerMotif[]>(initialComposition?.motifs ?? base.motifs)
  const [figure, setFigure] = useState<InnerFigure>(initialComposition?.figure ?? base.figure)
  const [durationSec, setDurationSec] = useState<75 | 180 | 'open'>(initialComposition?.durationSec ?? 75)

  const toggleMotif = (motif: InnerMotif) => {
    setMotifs(current => current.includes(motif)
      ? current.filter(value => value !== motif)
      : current.length >= 3 ? current : [...current, motif])
  }

  return <form className="space-composer" onSubmit={event => {
    event.preventDefault()
    if (!motifs.length) return
    const plan = composeInnerPlan(base, { motifs, figure, durationSec })
    onStart(createComposedCaptureEncounter(capture, plan, motifId))
  }}>
    <div className="composer-head"><div><p className="eyebrow">{t('自定义空间')}</p><h3>{t('你决定这个空间里有什么')}</h3><p className="note">{t('只从少量非语言输入出发；系统不解释你的选择。')}</p></div><button type="button" className="quiet small" onClick={onCancel}>{t('关闭')}</button></div>
    <div className="composer-section">
      <p className="card-label">{t('意象（1–3 块）')}</p>
      <div className="chip-row">{motifOptions.map(item => <button type="button" key={item.value} className={`chip ${motifs.includes(item.value) ? 'selected' : ''}`} aria-pressed={motifs.includes(item.value)} disabled={!motifs.includes(item.value) && motifs.length >= 3} onClick={() => toggleMotif(item.value)}>{item[lang === 'en' ? 'labelEn' : 'label']}</button>)}</div>
    </div>
    <div className="composer-section">
      <p className="card-label">{t('形象')}</p>
      <div className="chip-row">{figureOptions.map(item => <button type="button" key={item.value} className={`chip ${figure === item.value ? 'selected' : ''}`} aria-pressed={figure === item.value} onClick={() => setFigure(item.value)}>{item[lang === 'en' ? 'labelEn' : 'label']}</button>)}</div>
    </div>
    <label className="field-line">{t('形式')}<select value={durationSec} onChange={event => setDurationSec(event.target.value === 'open' ? 'open' : Number(event.target.value) as 75 | 180)}><option value={75}>{t('75 秒相遇')}</option><option value={180}>{t('180 秒空间')}</option><option value={'open'}>{t('开放空间（不自动结束）')}</option></select></label>
    <div className="actions"><button type="submit" className="primary-button" disabled={!motifs.length}>{t('进入这个空间')}</button><span className="note">{t('不解释、不诊断、不上传；随时可以离开。')}</span></div>
  </form>
}
