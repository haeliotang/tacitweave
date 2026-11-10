// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { useId, useMemo, useState } from 'react'
import { useLanguage, type Language } from './i18n'
import { responses, type RelationshipTrigger } from './relationship'
import { regions, sensations } from './somatic'
import {
  compareTriggerWindows,
  latestTriggerTime,
  rollingWindow,
  type TriggerChangeDirection,
  type TriggerFacetCount,
  type TriggerGroup,
  type TriggerGrouping,
  type TriggerGroupComparison,
  type TriggerWindow,
  type TriggerWindowComparison,
} from './relationship-topology'
import './relationship-topology.css'

export type RelationshipTopologyWindowDays = 30 | 90

export interface RelationshipTopologyViewProps {
  /** Relationship trigger records exactly as stored by the user. */
  entries: RelationshipTrigger[]
  /**
   * Exclusive end of the later comparison window, as an ISO timestamp.
   * Defaults to (newest record + 1ms) so the newest record is included, or to
   * the render time when there are no records. Pass a value to compare
   * calendar-relative periods instead.
   */
  now?: string
  /** Width of each of the two adjacent windows, in days. Defaults to 30. */
  initialWindowDays?: RelationshipTopologyWindowDays
  /** Initial grouping field; the user can switch it at runtime. Defaults to role. */
  initialGrouping?: TriggerGrouping
}

type ComparisonState = { ok: true; value: TriggerWindowComparison } | { ok: false }

type LabeledOption = { value: string; label: string; labelEn: string }

function localizedName(options: readonly LabeledOption[], value: string, lang: Language): string {
  const item = options.find(option => option.value === value)
  return (lang === 'en' ? item?.labelEn : item?.label) ?? value
}

function facetText(
  facets: ReadonlyArray<TriggerFacetCount<string>>,
  options: readonly LabeledOption[],
  lang: Language,
): string {
  return facets.map(facet => `${localizedName(options, facet.value, lang)} ${facet.count}`).join(' · ')
}

function formatDay(iso: string, lang: Language): string {
  const time = Date.parse(iso)
  if (Number.isNaN(time)) return iso
  return new Date(time).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatRange(window: TriggerWindow, lang: Language): string {
  const from = window.from === null ? '…' : formatDay(window.from, lang)
  const to = window.to === null ? '…' : formatDay(window.to, lang)
  return `${from} – ${to}`
}

function directionLabel(direction: TriggerChangeDirection, t: (zh: string) => string): string {
  switch (direction) {
    case 'only-earlier': return t('只在前一段')
    case 'only-later': return t('只在后一段')
    case 'more-earlier': return t('前一段更多')
    case 'more-later': return t('后一段更多')
    default: return t('两段相同')
  }
}

function WindowColumn({
  label,
  window,
  group,
  lang,
  t,
}: {
  label: string
  window: TriggerWindow
  group: TriggerGroup | null
  lang: Language
  t: (zh: string) => string
}) {
  const topResponses = group ? group.facets.responses.slice(0, 3) : []
  return <div className="relationship-topology-window">
    <p className="relationship-topology-window-label">
      <span>{label}</span>
      <span className="relationship-topology-range">{formatRange(window, lang)}</span>
    </p>
    <p className="relationship-topology-count">
      <strong>{group?.total ?? 0}</strong>{' '}
      <span className="relationship-topology-count-unit">{t('条记录')}</span>
    </p>
    {group && topResponses.length > 0
      ? <p className="relationship-topology-facets">{facetText(topResponses, responses, lang)}</p>
      : <p className="relationship-topology-window-empty">{t('这一段没有记录')}</p>}
  </div>
}

function MomentList({ group, lang, t }: { group: TriggerGroup; lang: Language; t: (zh: string) => string }) {
  const moments = group.entries.slice(-3).reverse()
  if (moments.length === 0) return null
  return <>
    <ul className="relationship-topology-moments">
      {moments.map(entry => <li key={entry.id}>
        <time dateTime={entry.createdAt}>{formatDay(entry.createdAt, lang)}</time>
        <span>{entry.cue || entry.situation || t('未写瞬间')}</span>
      </li>)}
    </ul>
    {group.total > moments.length && <p className="relationship-topology-window-empty">
      {t('还有')} {group.total - moments.length} {t('条')}
    </p>}
  </>
}

function DetailWindow({
  label,
  group,
  lang,
  t,
}: {
  label: string
  group: TriggerGroup | null
  lang: Language
  t: (zh: string) => string
}) {
  return <section className="relationship-topology-detail" aria-label={label}>
    <h4>{label}</h4>
    {group
      ? <>
        <dl className="relationship-topology-detail-facets">
          <div><dt>{t('身体的第一反应')}</dt><dd>{facetText(group.facets.responses, responses, lang)}</dd></div>
          <div><dt>{t('身体位置')}</dt><dd>{facetText(group.facets.regions, regions, lang)}</dd></div>
          <div><dt>{t('感觉')}</dt><dd>{facetText(group.facets.sensations, sensations, lang)}</dd></div>
        </dl>
        <MomentList group={group} lang={lang} t={t} />
      </>
      : <p className="relationship-topology-window-empty">{t('这一段没有记录')}</p>}
  </section>
}

function GroupCard({
  group,
  grouping,
  earlierWindow,
  laterWindow,
  lang,
  t,
}: {
  group: TriggerGroupComparison
  grouping: TriggerGrouping
  earlierWindow: TriggerWindow
  laterWindow: TriggerWindow
  lang: Language
  t: (zh: string) => string
}) {
  const label = group.unlabeled
    ? (grouping === 'role' ? t('未命名的角色') : t('未写场景'))
    : group.label
  const deltaLabel = group.delta > 0 ? `+${group.delta}` : String(group.delta)
  return <li className={`relationship-topology-group ${group.unlabeled ? 'unlabeled' : ''}`}>
    <div className="relationship-topology-group-head">
      <h3>{label}</h3>
      <span className={`relationship-topology-direction direction-${group.direction}`}>
        {directionLabel(group.direction, t)}
        <span className="relationship-topology-delta"> {deltaLabel}</span>
      </span>
    </div>
    <div className="relationship-topology-windows">
      <WindowColumn label={t('前一段')} window={earlierWindow} group={group.earlier} lang={lang} t={t} />
      <WindowColumn label={t('后一段')} window={laterWindow} group={group.later} lang={lang} t={t} />
    </div>
    <details className="relationship-topology-details">
      <summary>{t('查看每一段的字段计数')}</summary>
      <div className="relationship-topology-details-grid">
        <DetailWindow label={t('前一段')} group={group.earlier} lang={lang} t={t} />
        <DetailWindow label={t('后一段')} group={group.later} lang={lang} t={t} />
      </div>
    </details>
  </li>
}

/**
 * Standalone, accessible longitudinal comparison of user-authored relationship
 * triggers. It compares two adjacent time windows and groups the records by
 * `role` or `situation` — both free text written by the user.
 *
 * It never infers anything about the other person, assigns no attachment type
 * and scores no one. The component is not wired into the desktop shell; the
 * Lead can mount it anywhere with `<RelationshipTopologyView entries={entries} />`.
 *
 * Import note: a bare `./relationship-topology` specifier resolves to the pure
 * data module in `relationship-topology.ts`. Import this component with
 * `./relationship-topology.jsx` (TypeScript's bundler resolution and Vite both
 * map that to this `.tsx` file), or through a one-line re-export shim.
 */
export function RelationshipTopologyView({
  entries,
  now,
  initialWindowDays = 30,
  initialGrouping = 'role',
}: RelationshipTopologyViewProps) {
  const { lang, t } = useLanguage()
  const titleId = useId()
  const [windowDays, setWindowDays] = useState<RelationshipTopologyWindowDays>(initialWindowDays)
  const [grouping, setGrouping] = useState<TriggerGrouping>(initialGrouping)
  const [mountedAt] = useState(() => new Date().toISOString())

  const anchor = useMemo(() => {
    if (now) return now
    const latest = latestTriggerTime(entries)
    // +1ms keeps the newest record inside the half-open later window.
    return latest === null ? mountedAt : new Date(latest + 1).toISOString()
  }, [entries, mountedAt, now])

  const comparisonState = useMemo<ComparisonState>(() => {
    try {
      const earlierWindow = rollingWindow(anchor, windowDays, windowDays)
      const laterWindow = rollingWindow(anchor, windowDays)
      return { ok: true, value: compareTriggerWindows(entries, earlierWindow, laterWindow, grouping) }
    } catch {
      return { ok: false }
    }
  }, [anchor, entries, grouping, windowDays])

  const comparison = comparisonState.ok ? comparisonState.value : null
  const statusText = comparison
    ? `${t('前一段')} ${comparison.totalEarlier} ${t('条记录')} · ${t('后一段')} ${comparison.totalLater} ${t('条记录')}`
    : t('时间范围无效，未生成比较。')

  return <section className="relationship-topology" aria-labelledby={`${titleId}-title`}>
    <div className="relationship-topology-header">
      <div>
        <p className="relationship-topology-eyebrow">{t('关系瞬间')}</p>
        <h2 id={`${titleId}-title`}>{t('纵向比较')}</h2>
      </div>
      <span className="relationship-topology-pill">{t('本机保存')}</span>
    </div>

    <p className="relationship-topology-note">{t('只记录你自己写下的瞬间；不分析对方，不做匹配，不推断“依恋类型”。')}</p>

    <div className="relationship-topology-controls">
      <fieldset className="relationship-topology-fieldset">
        <legend>{t('时间范围')}</legend>
        <div className="relationship-topology-options">
          {([30, 90] as const).map(days => <button
            key={days}
            type="button"
            className="relationship-topology-option"
            aria-pressed={windowDays === days}
            onClick={() => setWindowDays(days)}
          >{days} {t('天')}</button>)}
        </div>
      </fieldset>
      <fieldset className="relationship-topology-fieldset">
        <legend>{t('分组方式')}</legend>
        <div className="relationship-topology-options">
          <button
            type="button"
            className="relationship-topology-option"
            aria-pressed={grouping === 'role'}
            onClick={() => setGrouping('role')}
          >{t('按角色')}</button>
          <button
            type="button"
            className="relationship-topology-option"
            aria-pressed={grouping === 'situation'}
            onClick={() => setGrouping('situation')}
          >{t('按场景')}</button>
        </div>
      </fieldset>
    </div>

    <p className="relationship-topology-sr-only" role="status">{statusText}</p>

    {comparisonState.ok === false
      ? <p className="relationship-topology-empty">{t('时间范围无效，未生成比较。')}</p>
      : comparisonState.value.empty
        ? <p className="relationship-topology-empty">
          {entries.length === 0
            ? t('还没有关系瞬间。你可以记录一个让你身体先反应的瞬间。')
            : t('这两段时间里没有已写日期的记录。')}
        </p>
        : <>
          <p className="relationship-topology-summary">
            <span>{t('前一段')} {formatRange(comparisonState.value.earlierWindow, lang)}</span>
            <span>{t('后一段')} {formatRange(comparisonState.value.laterWindow, lang)}</span>
          </p>
          <ul className="relationship-topology-groups">
            {comparisonState.value.groups.map(group => <GroupCard
              key={`${group.unlabeled ? 'unlabeled' : 'labeled'}:${group.key}`}
              group={group}
              grouping={comparisonState.value.grouping}
              earlierWindow={comparisonState.value.earlierWindow}
              laterWindow={comparisonState.value.laterWindow}
              lang={lang}
              t={t}
            />)}
          </ul>
          {comparisonState.value.earlier.invalidDates > 0 && <p className="relationship-topology-footer">
            {t('有')} {comparisonState.value.earlier.invalidDates} {t('条记录缺少可用的日期，未计入比较。')}
          </p>}
          <p className="relationship-topology-footer">{t('不推断因果，只做并列、回看与导出。')}</p>
        </>}
  </section>
}
