// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react'
import { createInnerEncounter } from './inner-encounter'
import type { InnerFeeling, InnerFormat } from './inner'
import type { Encounter } from './encounter'
import { useLanguage, type Language } from './i18n'

const feelings: Array<{ value: InnerFeeling; label: string; labelEn: string }> = [
  { value: 'unease', label: '说不清的不安', labelEn: 'Unclear unease' },
  { value: 'longing', label: '想念', labelEn: 'Longing' },
  { value: 'calm', label: '平静', labelEn: 'Calm' },
  { value: 'grief', label: '失落', labelEn: 'Grief' },
  { value: 'anger', label: '愤怒', labelEn: 'Anger' },
  { value: 'numbness', label: '麻木', labelEn: 'Numbness' },
]

export function InnerEntry({ onStart }: { onStart: (encounter: Encounter) => void }) {
  const { lang, t } = useLanguage()
  const [fragment, setFragment] = useState('')
  const [feeling, setFeeling] = useState<InnerFeeling | ''>('')
  const [format, setFormat] = useState<InnerFormat>('encounter')

  return (
    <form className="inner-entry" onSubmit={event => {
      event.preventDefault()
      if (!fragment.trim()) return
      onStart(createInnerEncounter({ fragment, feeling: feeling || undefined, format }))
    }}>
      <label htmlFor="inner-fragment">{t('一段梦、一个画面、一个地点，或一种说不清的感觉')}</label>
      <textarea
        id="inner-fragment"
        value={fragment}
        onChange={event => setFragment(event.target.value)}
        placeholder={t('比如：一条走廊尽头有一扇门，门外是水。')}
      />
      <div className="inner-options">
        <label>{t('形式')}
          <select value={format} onChange={event => setFormat(event.target.value as InnerFormat)}>
            <option value="encounter">{t('75 秒相遇')}</option>
            <option value="space">{t('180 秒空间')}</option>
          </select>
        </label>
        <label>{t('感觉（可选）')}
          <select value={feeling} onChange={event => setFeeling(event.target.value as InnerFeeling | '')}>
            <option value="">{t('不选择')}</option>
            {feelings.map(item => <option key={item.value} value={item.value}>{item[lang === 'en' ? 'labelEn' : 'label']}</option>)}
          </select>
        </label>
      </div>
      <div className="actions">
        <button disabled={!fragment.trim()}>{t('进入')}</button>
        <span className="note">{t('不解释、不诊断、不上传；随时可以离开。')}</span>
      </div>
    </form>
  )
}
