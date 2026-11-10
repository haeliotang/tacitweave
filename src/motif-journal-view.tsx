// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { breaths, fragments, regions, sensations } from './somatic'
import { exportMotifs, motifDisplayName, type MotifEntry } from './motif-journal'
import { useLanguage, type Language } from './i18n'

export function MotifJournal({ entries, onRemove, onClear }: { entries: MotifEntry[]; onRemove: (id: string) => void; onClear: () => void }) {
  const { lang, t } = useLanguage()
  const label = (items: ReadonlyArray<{ value: string; label: string; labelEn: string }>, value: string) => items.find(item => item.value === value)?.[lang === 'en' ? 'labelEn' : 'label']
  const exportAll = () => {
    if (!entries.length) return
    const blob = new Blob([exportMotifs(entries)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'tacitweave-motifs.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return <section className="motif-journal" aria-labelledby="motif-journal-title">
    <div className="journal-header">
      <div>
        <h2 id="motif-journal-title">{t('本机片段日记')}</h2>
        <p className="note">{t('只保存在这个浏览器；没有解释，也没有评分。')}</p>
      </div>
      <div className="actions">
        {entries.length > 0 && <button type="button" className="quiet" onClick={exportAll}>{t('导出 JSON')}</button>}
        {entries.length > 0 && <button type="button" className="quiet" onClick={() => { if (confirm(t('删除本机全部片段？此操作不可撤销。'))) onClear() }}>{t('全部删除')}</button>}
      </div>
    </div>
    {entries.length === 0
      ? <p className="note">{t('还没有片段。从身体开始时，可以选择留下一个名字。')}</p>
      : <ul className="motif-list">
        {entries.map(entry => <li key={entry.id} className="motif-item">
          <div className="motif-main">
            <span className="motif-name">{entry.name || t('未命名')}</span>
            <span className="motif-date">{new Date(entry.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}</span>
          </div>
          <p className="motif-meta">
            {label(regions, entry.capture.region)}
            {' · '}
            {label(sensations, entry.capture.sensation)}
            {' · 强度 '}{entry.capture.intensity}/5
            {' · '}{label(breaths, entry.capture.breath)}{lang === 'en' ? ' breath' : '呼吸'}
            {' · '}{entry.capture.fragments.map(id => { const fragment = fragments.find(item => item.id === id); return fragment ? fragment[lang === 'en' ? 'labelEn' : 'label'] : id }).join(' / ')}
            {entry.signals?.voice ? ' · 含本机声音摘要' : ''}
          </p>
          <button type="button" className="quiet small" onClick={() => onRemove(entry.id)}>{t('删除这条')}</button>
        </li>)}
      </ul>}
  </section>
}
