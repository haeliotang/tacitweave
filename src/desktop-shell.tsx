// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Encounter, SymbolicAgencyEvent } from './encounter'
import { createInnerCaptureEncounter } from './inner-encounter'
import { innerPlanFromCapture } from './inner'
import { SceneView } from './scene-loader'
import { createMotif, loadMotifs, type MotifEntry } from './motif-journal'
import { createRevisit, symbolicFromSpaceChanges, type RevisitInput } from './continuity'
import { SpaceComposer } from './space-composer'
import { createRelationshipTrigger, loadRelationshipTriggers, type RelationshipInput, type RelationshipTrigger } from './relationship'
import { createRelationshipRevisit, type RelationshipRevisitInput } from './relationship-continuity'
import { clearActiveEncryption, clearLocalSnapshot, disableLocalEncryption, enableLocalEncryption, hasEncryptedLocalState, loadLocalSnapshot, recoverEncryptedSnapshot, saveLocalSnapshot, unlockLocalSnapshot } from './local-store'
import type { LocalSnapshot } from './local-dataset'
import { useLanguage, type Language } from './i18n'
import { sourceUrl } from './source-link'
import { useTheme } from './theme'
import { appLockStorageKey, createAppLockRecord, loadAppLockRecord, loadLockout, lockoutRemainingMs, registerFailedAttempt, saveAppLockRecord, saveLockout, verifyAppLock, type AppLockRecord, type LockoutState } from './app-lock'

import { getDbStatus, getHostInfo, isTauriRuntime, type DbStatus, type HostInfo } from './host'
import { fragments, regions, sensations, breaths } from './somatic'
import { addFieldLink, attachFieldNode, emptyFieldLayout, fieldNodeKey, loadFieldLayout, removeFieldNode, type FieldLayout, type FieldLens, type FieldRange } from './field'
import { createSignalSession, loadSignalSessions, removeSignalSession, type SignalSession } from './signal-session'
import type { CaptureProvenance } from './capture'
import { addCaptureProvenance, removeCaptureProvenance } from './capture-ledger'
import { createSymbolicSession, loadSymbolicSessions, removeSymbolicSession, symbolicSessionCapacity, type SymbolicSession } from './symbolic-session'

const FieldView = lazy(() => import('./field-view').then(module => ({ default: module.FieldView })))
const TimelineRail = lazy(() => import('./field-view').then(module => ({ default: module.TimelineRail })))
const LockScreen = lazy(() => import('./app-lock-view').then(module => ({ default: module.LockScreen })))
const AppLockSettings = lazy(() => import('./app-lock-view').then(module => ({ default: module.AppLockSettings })))
const SomaticEntry = lazy(() => import('./somatic-entry').then(module => ({ default: module.SomaticEntry })))
const InnerEntry = lazy(() => import('./inner-entry').then(module => ({ default: module.InnerEntry })))
const MotifJournal = lazy(() => import('./motif-journal-view').then(module => ({ default: module.MotifJournal })))
const ContinuityView = lazy(() => import('./continuity-view').then(module => ({ default: module.ContinuityView })))
const RelationshipJournal = lazy(() => import('./relationship-map').then(module => ({ default: module.RelationshipJournal })))
const SignalSimulator = lazy(() => import('./signal-simulator').then(module => ({ default: module.SignalSimulator })))
const DeviceSignalPanel = lazy(() => import('./device-signal-panel').then(module => ({ default: module.DeviceSignalPanel })))
const LocalDataPanel = lazy(() => import('./local-data-panel').then(module => ({ default: module.LocalDataPanel })))
const UpdatePanel = lazy(() => import('./update-panel').then(module => ({ default: module.UpdatePanel })))

type View = 'field' | 'new' | 'motif' | 'journal' | 'continuity' | 'relationship' | 'settings' | 'research' | 'space'
type DetailTab = 'overview' | 'body' | 'imagery' | 'relationship'

const navItems: Array<{ id: Exclude<View, 'motif' | 'space' | 'research'>; label: string; icon: string }> = [
  { id: 'field', label: '场域', icon: '◌' },
  { id: 'journal', label: '片段', icon: '◫' },
  { id: 'continuity', label: '连续性', icon: '⟲' },
  { id: 'relationship', label: '关系', icon: '◇' },
  { id: 'settings', label: '设置', icon: '⚙' },
]

function dateLabel(iso: string, lang: Language) {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function localizedLabel(items: ReadonlyArray<{ value: string; label: string; labelEn: string }>, value: string, lang: Language) {
  const item = items.find(entry => entry.value === value)
  return lang === 'en' ? item?.labelEn : item?.label
}

function hostLabel(host: HostInfo | null, db: DbStatus | null, lang: Language) {
  if (!host) return lang === 'en' ? 'Web preview · localStorage' : 'Web 预览 · localStorage'
  const database = db?.ready ? (lang === 'en' ? `SQLite ${db.tables} tables · schema v${db.schema_version}` : `SQLite ${db.tables} 表 · schema v${db.schema_version}`) : (lang === 'en' ? 'SQLite ready' : 'SQLite 已就绪')
  return `${host.platform} · Tauri 2 · ${database}`
}

function checkItem(label: string, present: boolean, detail?: string) {
  return <li key={label} className={`check-item ${present ? 'present' : 'absent'}`}>
    <span className="check-mark">{present ? '✓' : '—'}</span>
    <span><strong>{label}</strong>{detail && <small>{detail}</small>}</span>
  </li>
}

function WorkspaceHeader({ eyebrow, title, meta, action }: { eyebrow: string; title: string; meta?: string; action?: ReactNode }) {
  return <header className="workspace-header">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {meta && <p className="workspace-meta">{meta}</p>}
    </div>
    {action}
  </header>
}

function MotifDetail({ motif, tab, setTab, onEnter, onStart }: { motif: MotifEntry; tab: DetailTab; setTab: (tab: DetailTab) => void; onEnter: () => void; onStart: (encounter: Encounter) => void }) {
  const { lang, t } = useLanguage()
  const [composing, setComposing] = useState(false)
  const voice = motif.signals?.voice
  return <>
    <WorkspaceHeader
      eyebrow={t('片段')}
      title={motif.name || t('未命名')}
      meta={`${dateLabel(motif.createdAt, lang)} · ${t('本机保存')} · ${motif.capture.fragments.length} ${t('块意象')}`}
      action={<div className="actions"><button className="primary-button" onClick={onEnter}>{t('进入空间')}</button><button className="quiet" onClick={() => setComposing(value => !value)}>{composing ? t('关闭自定义') : t('自定义空间')}</button></div>}
    />
    {composing && <SpaceComposer capture={motif.capture} motifId={motif.id} initial={motif.symbolic} onStart={onStart} onCancel={() => setComposing(false)} />}
    {tab === 'overview' && <div className="detail-grid">
      <section className="paper-card span-2">
        <p className="card-label">{t('身体线索')}</p>
        <h2>{localizedLabel(regions, motif.capture.region, lang)} · {localizedLabel(sensations, motif.capture.sensation, lang)}</h2>
        <p className="muted">{t('强度')} {motif.capture.intensity}/5 · {localizedLabel(breaths, motif.capture.breath, lang)} {t('呼吸')}</p>
      </section>
      <section className="paper-card">
        <p className="card-label">{t('意象碎片')}</p>
        <p>{motif.capture.fragments.map(id => { const fragment = fragments.find(item => item.id === id); return fragment ? fragment[lang === 'en' ? 'labelEn' : 'label'] : id }).join(' / ')}</p>
      </section>
      <section className="paper-card">
        <p className="card-label">{t('可选声音摘要')}</p>
        <p>{voice ? `${t('音量均值')} ${voice.rmsMean.toFixed(3)} · ${t('停顿比例')} ${voice.pauseRatio.toFixed(2)}` : t('这次没有声音摘要')}</p>
      </section>
      {motif.symbolic && <section className="paper-card">
        <p className="card-label">{t('空间形式')}</p>
        <p>{motif.symbolic.motifs.join(' / ')} · {motif.symbolic.figure}</p>
        <p className="muted">{t('由捕获生成，仅用于本机回看与研究导出；不是解释。')}</p>
      </section>}
      <section className="paper-card span-2">
        <p className="card-label">{t('可以做什么')}</p>
        <p className="muted">{t('进入一段 75 秒象征空间；系统不解释这个片段，也不替它命名。离开随时可用。')}</p>
      </section>
    </div>}
    {tab === 'body' && <section className="paper-card">
      <p className="card-label">{t('身体线索')}</p>
      <div className="detail-rows">
        <div><span>{t('位置')}</span><strong>{localizedLabel(regions, motif.capture.region, lang)}</strong></div>
        <div><span>{t('感觉')}</span><strong>{localizedLabel(sensations, motif.capture.sensation, lang)}</strong></div>
        <div><span>{t('强度')}</span><strong>{motif.capture.intensity} / 5</strong></div>
        <div><span>{t('呼吸')}</span><strong>{localizedLabel(breaths, motif.capture.breath, lang)}</strong></div>
        {motif.capture.certainty && <div><span>{t('确定程度')}</span><strong>{motif.capture.certainty === 'clear' ? t('比较确定') : motif.capture.certainty === 'mixed' ? t('有些矛盾') : t('说不清')}</strong></div>}
      </div>
    </section>}
    {tab === 'imagery' && <section className="paper-card">
      <p className="card-label">{t('意象碎片')}</p>
      <div className="imagery-list">{motif.capture.fragments.map(id => {
        const fragment = fragments.find(item => item.id === id)
        return <div className="imagery-tile" key={id}><span className={`imagery-swatch palette-${fragment?.palette}`} /><span>{fragment ? fragment[lang === 'en' ? 'labelEn' : 'label'] : id}</span></div>
      })}</div>
    </section>}
    {tab === 'relationship' && <section className="paper-card">
      <p className="card-label">{t('关系')}</p>
      <p>{t('关系瞬间单独保存在「关系瞬间」里；这里不推断它们与当前片段的因果关系。')}</p>
      <p className="muted">{t('这是有意的边界：并列可以，解释不行。')}</p>
    </section>}
  </>
}

function ContextPanel({ motif, encounter, onEnter, onBack, onDetail }: { motif: MotifEntry | null; encounter: Encounter | null; onEnter: () => void; onBack: () => void; onDetail: () => void }) {
  const { lang, t } = useLanguage()
  if (encounter) {
    return <aside className="context-panel">
      <div className="context-heading"><span>{t('当前空间')}</span><span className="local-badge">{t('本地')}</span></div>
      <p className="context-lead">{t('空间在中间运行。你可以靠近、停留或离开；离开也是体验的一部分。')}</p>
      <button className="primary-button wide" onClick={onBack}>{t('返回工作台')}</button>
      <div className="context-section">
        <p className="card-label">{t('这次的空间')}</p>
        <p className="muted">{encounter.innerPlan?.format === 'open' ? t('开放空间') : encounter.innerPlan?.format === 'space' ? t('180 秒空间') : t('75 秒相遇')} · {t('无声')} · symbolic</p>
      </div>
      <div className="context-note">
        <p className="card-label">{t('不解释')}</p>
        <p>{t('空间不提供梦的字典，也不声称知道它“意味着什么”。')}</p>
      </div>
    </aside>
  }
  const voice = motif?.signals?.voice
  return <aside className="context-panel">
    <div className="context-heading"><span>{t('空间将收到的内容')}</span><span className="local-badge">{t('不上传')}</span></div>
    <ul className="check-list">
      {checkItem(t('身体位置'), Boolean(motif), motif ? localizedLabel(regions, motif.capture.region, lang) : t('先选择一个片段'))}
      {checkItem(t('感觉与强度'), Boolean(motif), motif ? `${localizedLabel(sensations, motif.capture.sensation, lang)} · ${motif.capture.intensity}/5` : undefined)}
      {checkItem(t('意象碎片'), Boolean(motif), motif ? `${motif.capture.fragments.length} ${t('块')}` : undefined)}
      {checkItem(t('可选声音摘要'), Boolean(voice), voice ? t('仅摘要，不含原始音频') : t('这次没有'))}
      {checkItem(t('关系瞬间'), false, t('不进入空间；保持独立'))}
    </ul>
    <button className="primary-button wide" disabled={!motif} onClick={onEnter}>{t('进入 75 秒空间')}</button>
    {motif && <button className="quiet-button wide" onClick={onDetail}>{t('打开片段详情')}</button>}
    <div className="context-section">
      <p className="card-label">{t('事件流')}</p>
      <p className="muted">{t('还没有活动。进入空间后，这里会显示当前会话。')}</p>
    </div>
    <div className="context-note">
      <p className="card-label">{t('下一步')}</p>
      <p>{motif ? t('进入空间，看看它如何变化；也可以回到片段日记继续记录。') : t('先从身体开始，选一个最明显的位置。')}</p>
    </div>
    <p className="context-privacy">{t('不解释、不诊断、默认不上传。所有片段与关系记录只在本机。')}</p>
  </aside>
}

export function DesktopShell() {
  const { lang, setLang, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [view, setView] = useState<View>('field')
  const [fieldLens, setFieldLens] = useState<FieldLens>('juxtaposition')
  const [fieldRange, setFieldRange] = useState<FieldRange>('all')
  const [fieldLayout, setFieldLayout] = useState<FieldLayout>(() => typeof window === 'undefined' ? emptyFieldLayout() : loadFieldLayout(window.localStorage))
  const [signalSessions, setSignalSessions] = useState<SignalSession[]>(() => typeof window === 'undefined' ? [] : loadSignalSessions(window.localStorage))
  const [captures, setCaptures] = useState<CaptureProvenance[]>([])
  const [symbolicSessions, setSymbolicSessions] = useState<SymbolicSession[]>([])
  const [lockRecord, setLockRecord] = useState<AppLockRecord | null>(() => typeof window === 'undefined' ? null : loadAppLockRecord(window.localStorage))
  const [locked, setLocked] = useState<boolean>(() => typeof window !== 'undefined' && Boolean(loadAppLockRecord(window.localStorage)))
  const [recoveryNeeded, setRecoveryNeeded] = useState(false)
  const [autoLockMs, setAutoLockMs] = useState<number>(() => typeof window === 'undefined' ? 300_000 : Number(window.localStorage.getItem('tacitweave.autolock-ms') ?? 300_000))
  const [lockout, setLockout] = useState<LockoutState>(() => typeof window === 'undefined' ? { failed: 0, blockedUntil: 0 } : loadLockout(window.localStorage))
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [motifs, setMotifs] = useState<MotifEntry[]>(() => typeof window === 'undefined' ? [] : loadMotifs(window.localStorage))
  const [relationships, setRelationships] = useState<RelationshipTrigger[]>(() => typeof window === 'undefined' ? [] : loadRelationshipTriggers(window.localStorage))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [replay, setReplay] = useState(0)
  const [textMode, setTextMode] = useState(false)
  const [search, setSearch] = useState('')
  const [host, setHost] = useState<HostInfo | null>(null)
  const [db, setDb] = useState<DbStatus | null>(null)

  useEffect(() => {
    void (async () => {
      const info = await getHostInfo()
      setHost(info)
      if (info) setDb(await getDbStatus())
    })()
  }, [])

  useEffect(() => {
    let active = true
    if (lockRecord) { setLocked(true); return () => { active = false } }
    void loadLocalSnapshot().then(snapshot => {
      if (!active) return
      setMotifs(snapshot.motifs)
      setRelationships(snapshot.relationships)
      setFieldLayout(snapshot.field ?? emptyFieldLayout())
      setSignalSessions(snapshot.signals ?? [])
      setCaptures(snapshot.captures ?? [])
      setSymbolicSessions(snapshot.symbolicSessions ?? [])
      setSelectedId(current => current && snapshot.motifs.some(motif => motif.id === current) ? current : null)
    })
    return () => { active = false }
  }, [])

  const rangeDays = fieldRange === 'all' ? Infinity : fieldRange === '90d' ? 90 : 30
  const rangeStart = Number.isFinite(rangeDays) ? Date.now() - rangeDays * 86_400_000 : 0
  const visibleMotifs = rangeStart ? motifs.filter(motif => Date.parse(motif.createdAt) >= rangeStart) : motifs
  const visibleRelationships = rangeStart ? relationships.filter(entry => Date.parse(entry.createdAt) >= rangeStart) : relationships
  const selected = motifs.find(motif => motif.id === selectedId) ?? null
  const filtered = useMemo(() => motifs.filter(motif => !search.trim() || (motif.name || '未命名').includes(search.trim())), [motifs, search])

  const openNew = () => { setEncounter(null); setSelectedId(null); setView('new'); setDetailTab('overview') }
  const openMotif = (id: string) => { setSelectedId(id); setEncounter(null); setView('field'); setDetailTab('overview') }
  const recordAgency = (event: SymbolicAgencyEvent) => {
    setEncounter(current => current ? { ...current, durationSec: event.durationSec ?? current.durationSec, agency: [...(current.agency ?? []), event] } : current)
  }

  const start = (next: Encounter) => {
    setEncounter(next)
    setView('space')
    if (next.capture) {
      const nextCaptures = addCaptureProvenance(captures, next.capture)
      setCaptures(nextCaptures)
      void saveLocalSnapshot({ motifs, relationships, field: fieldLayout, signals: signalSessions, captures: nextCaptures, symbolicSessions })
    }
  }
  const enterSelected = () => { if (selected) start(createInnerCaptureEncounter(selected.capture, selected.id, selected.symbolic)) }
  const enterMotif = (id: string) => {
    const motif = motifs.find(entry => entry.id === id)
    if (!motif) return
    setSelectedId(motif.id)
    start(createInnerCaptureEncounter(motif.capture, motif.id, motif.symbolic))
  }
  const backFromSpace = () => {
    if (encounter) {
      const session = createSymbolicSession(encounter)
      const next = [session, ...symbolicSessions].slice(0, symbolicSessionCapacity)
      setSymbolicSessions(next)
      void saveLocalSnapshot({ motifs, relationships, field: fieldLayout, signals: signalSessions, captures, symbolicSessions: next })
    }
    setEncounter(null)
    setView(selected ? 'field' : 'new')
  }
  const saveSpaceRevision = () => {
    if (!encounter?.motifId || !encounter.innerPlan) return
    const source = motifs.find(entry => entry.id === encounter.motifId)
    if (!source) return
    const plan = encounter.innerPlan
    const symbolic = symbolicFromSpaceChanges({ format: plan.format, motifs: plan.motifs, figure: plan.figure }, encounter.agency ?? [])
    const entry = createRevisit(motifs, source.id, { symbolic, note: t('从空间保存的调整') })
    const next = [entry, ...motifs]
    const nextField = attachFieldNode(fieldLayout, fieldNodeKey('motif', source.id), fieldNodeKey('motif', entry.id))
    const session = createSymbolicSession({ ...encounter, motifId: entry.id })
    const nextSessions = [session, ...symbolicSessions].slice(0, symbolicSessionCapacity)
    setMotifs(next)
    setFieldLayout(nextField)
    setSymbolicSessions(nextSessions)
    setSelectedId(entry.id)
    setEncounter(null)
    setView('continuity')
    persist(next, relationships, nextField, signalSessions, captures, nextSessions)
  }
  const persist = (nextMotifs: MotifEntry[], nextRelationships: RelationshipTrigger[], nextField = fieldLayout, nextSignals = signalSessions, nextCaptures = captures, nextSymbolicSessions = symbolicSessions) => {
    void saveLocalSnapshot({ motifs: nextMotifs, relationships: nextRelationships, field: nextField, signals: nextSignals, captures: nextCaptures, symbolicSessions: nextSymbolicSessions })
  }
  const remember = (capture: Parameters<typeof createMotif>[0]['capture'], name: string, signals?: Parameters<typeof createMotif>[0]['signals']) => {
    const plan = innerPlanFromCapture(capture)
    const entry = createMotif({ capture, name, signals, symbolic: { format: plan.format, motifs: plan.motifs, figure: plan.figure } })
    const next = [entry, ...motifs]
    setMotifs(next)
    setSelectedId(entry.id)
    persist(next, relationships, fieldLayout, signalSessions)
  }
  const remove = (id: string) => {
    const next = motifs.filter(motif => motif.id !== id)
    setMotifs(next)
    if (selectedId === id) setSelectedId(null)
    const nextField = removeFieldNode(fieldLayout, fieldNodeKey('motif', id))
    setFieldLayout(nextField)
    persist(next, relationships, nextField, signalSessions)
  }
  const addRelationship = (input: RelationshipInput) => {
    const next = [createRelationshipTrigger(input), ...relationships]
    setRelationships(next)
    persist(motifs, next, fieldLayout, signalSessions)
  }
  const revisit = (sourceId: string, input: RevisitInput) => {
    const entry = createRevisit(motifs, sourceId, input)
    const next = [entry, ...motifs]
    const nextField = attachFieldNode(fieldLayout, fieldNodeKey('motif', sourceId), fieldNodeKey('motif', entry.id))
    setMotifs(next)
    setFieldLayout(nextField)
    setSelectedId(entry.id)
    persist(next, relationships, nextField, signalSessions)
  }
  const revisitRelationship = (sourceId: string, input: RelationshipRevisitInput) => {
    const entry = createRelationshipRevisit(relationships, sourceId, input)
    const next = [entry, ...relationships]
    const nextField = attachFieldNode(fieldLayout, fieldNodeKey('relationship', sourceId), fieldNodeKey('relationship', entry.id))
    setRelationships(next)
    setFieldLayout(nextField)
    persist(motifs, next, nextField, signalSessions)
  }
  const removeRelationship = (id: string) => {
    const next = relationships.filter(entry => entry.id !== id)
    setRelationships(next)
    const nextField = removeFieldNode(fieldLayout, fieldNodeKey('relationship', id))
    setFieldLayout(nextField)
    persist(motifs, next, nextField, signalSessions)
  }
  const importSnapshot = (snapshot: LocalSnapshot) => {
    setMotifs(snapshot.motifs)
    setRelationships(snapshot.relationships)
    setFieldLayout(snapshot.field ?? emptyFieldLayout())
    setSignalSessions(snapshot.signals ?? [])
    setCaptures(snapshot.captures ?? [])
    setSymbolicSessions(snapshot.symbolicSessions ?? [])
    setSelectedId(null)
    void saveLocalSnapshot({ ...snapshot, field: snapshot.field ?? emptyFieldLayout(), signals: snapshot.signals ?? [], captures: snapshot.captures ?? [], symbolicSessions: snapshot.symbolicSessions ?? [] })
  }
  const clearAll = () => {
    setMotifs([])
    setRelationships([])
    setFieldLayout(emptyFieldLayout())
    setSignalSessions([])
    setCaptures([])
    setSymbolicSessions([])
    setSelectedId(null)
    window.localStorage.removeItem(appLockStorageKey)
    window.localStorage.removeItem('tacitweave.app-lock-lockout.v1')
    setLockRecord(null)
    setLocked(false)
    setRecoveryNeeded(false)
    clearActiveEncryption()
    void clearLocalSnapshot()
  }

  const applySnapshot = (snapshot: LocalSnapshot) => {
    setMotifs(snapshot.motifs)
    setRelationships(snapshot.relationships)
    setFieldLayout(snapshot.field ?? emptyFieldLayout())
    setSignalSessions(snapshot.signals ?? [])
    setCaptures(snapshot.captures ?? [])
    setSymbolicSessions(snapshot.symbolicSessions ?? [])
    setSelectedId(current => current && snapshot.motifs.some(motif => motif.id === current) ? current : null)
  }

  const currentSnapshot = (): LocalSnapshot => ({ motifs, relationships, field: fieldLayout, signals: signalSessions, captures, symbolicSessions })

  const enableAppLock = async (pin: string) => {
    const record = await createAppLockRecord(pin)
    await enableLocalEncryption(currentSnapshot(), pin, record)
    saveAppLockRecord(window.localStorage, record)
    setLockRecord(record)
    setLocked(true)
  }

  const disableAppLock = async (pin: string): Promise<boolean> => {
    if (!lockRecord || !await verifyAppLock(pin, lockRecord)) return false
    const restored = await disableLocalEncryption(pin, lockRecord, currentSnapshot())
    applySnapshot(restored)
    window.localStorage.removeItem(appLockStorageKey)
    window.localStorage.removeItem('tacitweave.app-lock-lockout.v1')
    setLockout({ failed: 0, blockedUntil: 0 })
    setLockRecord(null)
    setLocked(false)
    return true
  }

  const unlockApp = async (pin: string): Promise<boolean> => {
    if (lockoutRemainingMs(lockout) > 0) return false
    if (!lockRecord) {
      try {
        const recovered = await recoverEncryptedSnapshot(pin)
        saveAppLockRecord(window.localStorage, recovered.record)
        setLockRecord(recovered.record)
        applySnapshot(recovered.snapshot)
        setRecoveryNeeded(false)
        setLocked(false)
        const reset = { failed: 0, blockedUntil: 0 }
        saveLockout(window.localStorage, reset)
        setLockout(reset)
        return true
      } catch {
        const next = registerFailedAttempt(lockout)
        saveLockout(window.localStorage, next)
        setLockout(next)
        return false
      }
    }
    if (!await verifyAppLock(pin, lockRecord)) {
      const next = registerFailedAttempt(lockout)
      saveLockout(window.localStorage, next)
      setLockout(next)
      return false
    }
    try {
      let snapshot = await unlockLocalSnapshot(pin, lockRecord)
      if (!snapshot) {
        snapshot = await loadLocalSnapshot()
        await enableLocalEncryption(snapshot, pin, lockRecord)
      }
      const reset = { failed: 0, blockedUntil: 0 }
      saveLockout(window.localStorage, reset)
      setLockout(reset)
      applySnapshot(snapshot)
      setLocked(false)
      return true
    } catch {
      return false
    }
  }

  const updateAutoLock = (value: number) => {
    window.localStorage.setItem('tacitweave.autolock-ms', String(value))
    setAutoLockMs(value)
  }

  const lockNow = () => {
    clearActiveEncryption()
    setLocked(true)
  }

  useEffect(() => {
    if (lockRecord || typeof window === 'undefined') {
      setRecoveryNeeded(false)
      return
    }
    void hasEncryptedLocalState().then(present => setRecoveryNeeded(present))
  }, [lockRecord])

  useEffect(() => {
    if (!lockRecord || locked || typeof window === 'undefined') return
    const timeoutMs = Number.isFinite(autoLockMs) && autoLockMs >= 1_000 ? autoLockMs : 300_000
    let timer = window.setTimeout(() => { clearActiveEncryption(); setLocked(true) }, timeoutMs)
    const reset = () => { window.clearTimeout(timer); timer = window.setTimeout(() => { clearActiveEncryption(); setLocked(true) }, timeoutMs) }
    for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) window.addEventListener(event, reset, { passive: true })
    return () => { window.clearTimeout(timer); for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const) window.removeEventListener(event, reset) }
  }, [autoLockMs, lockRecord, locked])

  const resetAppLock = () => {
    if (!confirm(t('忘记 PIN 会删除本机数据并解除应用锁。继续？'))) return
    window.localStorage.removeItem(appLockStorageKey)
    setLockRecord(null)
    setLocked(false)
    clearAll()
  }

  const updateFieldLayout = (next: FieldLayout) => {
    setFieldLayout(next)
    void saveLocalSnapshot({ motifs, relationships, field: next, signals: signalSessions, captures, symbolicSessions })
  }

  const recordSignalSession = (session: SignalSession) => {
    const next = [session, ...signalSessions].slice(0, 100)
    setSignalSessions(next)
    void saveLocalSnapshot({ motifs, relationships, field: fieldLayout, signals: next, captures, symbolicSessions })
  }

  const retractCapture = (captureId: string) => {
    const next = removeCaptureProvenance(captures, captureId)
    setCaptures(next)
    void saveLocalSnapshot({ motifs, relationships, field: fieldLayout, signals: signalSessions, captures: next })
  }

  const retractSymbolicSession = (id: string) => {
    const next = removeSymbolicSession(symbolicSessions, id)
    setSymbolicSessions(next)
    void saveLocalSnapshot({ motifs, relationships, field: fieldLayout, signals: signalSessions, captures, symbolicSessions: next })
  }

  const retractSignalSession = (id: string) => {
    const next = removeSignalSession(signalSessions, id)
    setSignalSessions(next)
    void saveLocalSnapshot({ motifs, relationships, field: fieldLayout, signals: next, captures, symbolicSessions })
  }

  const loadDemo = () => {
    const demoMotifs = [
      createMotif({ name: lang === 'en' ? 'Demo · door in the chest' : '示例 · 胸口的旧门', capture: { region: 'chest', sensation: 'pressure', intensity: 4, breath: 'held', fragments: ['wet-corridor', 'dusk-stairs'] } }),
      createMotif({ name: lang === 'en' ? 'Demo · empty platform' : '示例 · 空站台', capture: { region: 'stomach', sensation: 'hollowness', intensity: 3, breath: 'shallow', fragments: ['empty-platform'] } }),
    ]
    const demoRelationship = createRelationshipTrigger({ role: lang === 'en' ? 'Someone busy' : '一个总在忙的人', situation: lang === 'en' ? 'No reply for days' : '很久没有回复', cue: lang === 'en' ? 'The screen goes dark' : '屏幕暗下去', region: 'chest', sensation: 'tightness', intensity: 3, breath: 'shallow', response: 'freeze' })
    const layout = { ...emptyFieldLayout(), positions: {
      [fieldNodeKey('motif', demoMotifs[0].id)]: { x: 0.34, y: 0.38 },
      [fieldNodeKey('motif', demoMotifs[1].id)]: { x: 0.68, y: 0.68 },
      [fieldNodeKey('relationship', demoRelationship.id)]: { x: 0.46, y: 0.7 },
    }, links: [] as FieldLayout['links'] }
    const linked = addFieldLink(addFieldLink(layout, fieldNodeKey('motif', demoMotifs[0].id), fieldNodeKey('motif', demoMotifs[1].id)), fieldNodeKey('motif', demoMotifs[1].id), fieldNodeKey('relationship', demoRelationship.id))
    setMotifs(demoMotifs)
    setRelationships([demoRelationship])
    setFieldLayout(linked)
    setSelectedId(demoMotifs[0].id)
    setFieldLens('relations')
    persist(demoMotifs, [demoRelationship], linked, signalSessions)
  }

  const navView = view === 'motif' || view === 'space' ? 'field' : view === 'research' ? 'settings' : view

  const topTabs = view === 'field'
    ? (['juxtaposition', 'body', 'imagery', 'relations'] as FieldLens[]).map(lens => ({ id: lens, label: t(lens === 'juxtaposition' ? '并置' : lens === 'body' ? '身体' : lens === 'imagery' ? '意象' : '关系'), active: fieldLens === lens, onClick: () => setFieldLens(lens) }))
    : view === 'new'
    ? [
        { id: 'somatic', label: t('从身体开始'), active: !textMode, onClick: () => setTextMode(false) },
        { id: 'text', label: t('用文字'), active: textMode, onClick: () => setTextMode(true) },
      ]
    : view === 'motif' && selected
      ? ([['overview', t('总览')], ['body', t('身体')], ['imagery', t('意象')], ['relationship', t('关系')]] as Array<[DetailTab, string]>).map(([id, label]) => ({ id, label, active: detailTab === id, onClick: () => setDetailTab(id) }))
      : []

  return <div className="desktop-shell">
    <div className="shell-body">
      <aside className="sidebar">
        <div className="sidebar-top" data-tauri-drag-region>
          {!isTauriRuntime() && <div className="traffic-lights" aria-hidden="true"><span /><span /><span /></div>}
          <div className="sidebar-brand">Tacitweave</div>
          <label className="search-box"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('搜索片段')} /></label>
          <button className="new-button" onClick={openNew}><span>＋</span> {t('新建内在片段')}</button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(item => <button key={item.id} className={navView === item.id ? 'active' : ''} onClick={() => { if (item.id === 'new') openNew(); else { setEncounter(null); setView(item.id) } }}>
            <span className="nav-icon">{item.icon}</span>{t(item.label)}
          </button>)}
        </nav>
        <div className="sidebar-recent">
          <p className="section-label">{t('最近片段')}</p>
          {filtered.length === 0
            ? <p className="empty-copy">{t('还没有片段。从身体开始，留下第一个名字。')}</p>
            : filtered.map(motif => <button key={motif.id} className={`recent-item ${selectedId === motif.id && view === 'motif' ? 'active' : ''}`} onClick={() => openMotif(motif.id)}>
              <span className="recent-title">{motif.name || t('未命名')}</span>
              <span className="recent-meta">{dateLabel(motif.createdAt, lang)} · {localizedLabel(regions, motif.capture.region, lang)}</span>
            </button>)}
        </div>
        <div className="sidebar-footer">
          <span className={`host-dot ${host ? 'native' : ''}`} />
          <div><strong>{hostLabel(host, db, lang)}</strong><small>{host ? t('文件与 SQLite 位于 app data，文件 API 仅限该目录') : t('数据只存于浏览器 localStorage')}</small></div>
        </div>
      </aside>

      <main className="workspace">
        <div className="workspace-topbar" data-tauri-drag-region>
          <div className="workspace-tabs" {...(topTabs.length ? { role: 'tablist' } : {})}>
            {topTabs.length
              ? topTabs.map(tab => <button key={tab.id} role="tab" aria-selected={tab.active} className={tab.active ? 'active' : ''} onClick={tab.onClick}>{tab.label}</button>)
              : <span className="top-label">{view === 'space' ? (encounter?.innerPlan?.format === 'space' || encounter?.innerPlan?.format === 'open' ? '空间' : '相遇') : view === 'research' ? t('研究工具') : t(navItems.find(item => item.id === navView)?.label ?? '')}</span>}
          </div>
          <div className="ui-controls">
            {lockRecord && <button className="ui-toggle" onClick={lockNow} aria-label={t('立即锁定')} title={t('立即锁定')}>🔒</button>}
            <button className="ui-toggle" onClick={toggleTheme} aria-label={theme === 'dark' ? t('切换到浅色') : t('切换到深色')} title={theme === 'dark' ? t('切换到浅色') : t('切换到深色')}>{theme === 'dark' ? '☀' : '☾'}</button>
            <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}>{lang === 'en' ? '中文' : 'EN'}</button>
          </div>
          <span className="workspace-path">{view === 'space' ? t('内在景观') : view === 'motif' ? (selected?.name || t('未命名')) : t('本地研究原型')}</span>
        </div>
        <div className="workspace-scroll">
          {view === 'space' && encounter
            ? <div className="scene-workspace">
              <div className="scene-toolbar"><button className="text-button" onClick={backFromSpace}>← {t('返回工作台')}</button>{encounter.motifId && encounter.agency?.some(event => event.action === 'change') && <button type="button" className="quiet small" onClick={saveSpaceRevision}>{t('保存为新的进入')}</button>}<span>{encounter.innerPlan?.format === 'space' || encounter.innerPlan?.format === 'open' ? `${t('内在景观')} · ${t('空间')}` : `${t('内在景观')} · ${t('相遇')}`}</span><span className="local-badge">{t('无声 · 本地')}</span></div>
              <SceneView encounter={encounter} replay={replay} onAgency={recordAgency} />
              <div className="scene-footer"><span>{t('不解释、不诊断；离开随时可用。')}</span><button className="quiet-button" onClick={() => setReplay(value => value + 1)}>{t('重新进入')}</button></div>
            </div>
            : <>
              {view === 'field' && <Suspense fallback={<div className="field-empty"><p>{t('正在加载场域…')}</p></div>}><FieldView motifs={visibleMotifs} relationships={visibleRelationships} selectedId={selectedId} lens={fieldLens} range={fieldRange} layout={fieldLayout} onChange={updateFieldLayout} onSelect={openMotif} onNew={openNew} onDemo={loadDemo} onRangeChange={setFieldRange} /></Suspense>}
              {(view === 'new' || view === 'motif') && <>
                {view === 'new' && <WorkspaceHeader eyebrow={t('内在工作台')} title={t('先感觉，不用急着命名。')} meta={t('从身体、意象与关系开始；不解释，也不替你下结论。')} action={<span className="status-pill">{t('本地研究原型')}</span>} />}
                {view === 'new' && (textMode
                  ? <div className="capture-wrap"><Suspense fallback={null}><InnerEntry onStart={start} /></Suspense></div>
                  : <div className="capture-wrap"><Suspense fallback={null}><SomaticEntry onStart={start} onRemember={remember} /></Suspense></div>)}
                {view === 'motif' && selected && <MotifDetail motif={selected} tab={detailTab} setTab={setDetailTab} onEnter={enterSelected} onStart={start} />}
                {view === 'motif' && !selected && <div className="empty-state"><h2>{t('这个片段不在了')}</h2><p>{t('它可能已被删除。可以从左侧新建一个片段。')}</p><button className="primary-button" onClick={openNew}>新建片段</button></div>}
              </>}
              {view === 'journal' && <>
                <WorkspaceHeader eyebrow={t('本机片段日记')} title={t('反复出现的东西，先放在一起。')} meta={t('不推断因果，只做并列、回看与导出。')} />
                <Suspense fallback={null}><MotifJournal entries={motifs} onRemove={remove} onClear={() => { setMotifs([]); setSelectedId(null); persist([], relationships) }} /></Suspense>
              </>}
              {view === 'continuity' && <>
                <Suspense fallback={null}><ContinuityView motifs={motifs} sessions={symbolicSessions} focusId={selectedId} onRevisit={revisit} onOpen={openMotif} onEnter={enterMotif} onNew={openNew} /></Suspense>
              </>}
              {view === 'relationship' && <>
                <WorkspaceHeader eyebrow={t('关系瞬间')} title={t('只画你自己的地图。')} meta={t('不推断对方，不做匹配，也不把关系变成评分。')} />
                <Suspense fallback={null}><RelationshipJournal entries={relationships} onAdd={addRelationship} onRevisit={revisitRelationship} onRemove={removeRelationship} onClear={() => { setRelationships([]); persist(motifs, []) }} /></Suspense>
              </>}
              {view === 'research' && <>
                <WorkspaceHeader eyebrow={t('研究工具')} title={t('可选信号')} meta={t('模拟数据和设备桥接都明确标注；没有真实神经数据。')} action={<button type="button" className="quiet-button" onClick={() => setView('settings')}>← {t('返回设置')}</button>} />
                <Suspense fallback={null}><SignalSimulator onSession={recordSignalSession} onRetract={retractSignalSession} /></Suspense>
                <Suspense fallback={null}><DeviceSignalPanel onSession={recordSignalSession} onRetract={retractSignalSession} /></Suspense>
              </>}
              {view === 'settings' && <>
                <WorkspaceHeader eyebrow={t('本机与设置')} title={t('数据留在本机。')} meta={host ? `${host.platform} · ${host.app_data_dir}` : t('浏览器预览：数据在 localStorage')} />
                <div className="paper-card host-card">
                  <p className="card-label">{t('宿主')}</p>
                  <p>{host ? `Tauri 2 · ${host.platform} · ${t('文件 API')} ${host.sandbox}` : t('Web 预览 · 没有 Tauri 宿主')}</p>
                  <p className="muted">{host ? `SQLite: ${host.database_path}${db ? ` · schema v${db.schema_version}` : ''}` : t('启动 Tauri 外壳后，文件与数据库句柄由 Rust 宿主管理。')}</p>
                </div>
                <div className="paper-card host-card">
                  <p className="card-label">{t('研究工具')}</p>
                  <p className="muted">{t('可选信号与设备桥接；研究导出在本机数据中。')}</p>
                  <div className="actions"><button type="button" className="quiet" onClick={() => setView('research')}>{t('打开研究工具')}</button></div>
                </div>
                <div className="paper-card host-card">
                  <p className="card-label">{t('源码')}</p>
                  <p className="muted">{t('运行版本的源代码。')}</p>
                  <p className="muted">{t('许可')}：{t('GNU Affero 通用公共许可证第 3 版或更高版本')}</p>
                  <div className="actions"><a className="quiet" href={sourceUrl} target="_blank" rel="noreferrer">{t('查看源码')}</a></div>
                </div>
                <Suspense fallback={null}><UpdatePanel currentVersion={host?.app_version ?? '0.1.3'} /></Suspense>
                <Suspense fallback={null}><AppLockSettings enabled={Boolean(lockRecord)} autoLockMs={autoLockMs} onAutoLockChange={updateAutoLock} onEnable={enableAppLock} onDisable={disableAppLock} onLock={lockNow} /></Suspense>
                <Suspense fallback={null}><LocalDataPanel snapshot={{ motifs, relationships, field: fieldLayout, signals: signalSessions, captures, symbolicSessions }} onImport={importSnapshot} onClear={clearAll} onRetractSignal={retractSignalSession} onRetractCapture={retractCapture} onRetractSymbolic={retractSymbolicSession} /></Suspense>
              </>}
            </>}
        </div>
        {view !== 'space' && view !== 'settings' && view !== 'research' && <Suspense fallback={null}><TimelineRail motifs={visibleMotifs} relationships={visibleRelationships} onSelect={openMotif} /></Suspense>}
      </main>

      {view === 'settings' || view === 'research'
        ? <aside className="context-panel">
          <div className="context-heading"><span>{t(view === 'research' ? '研究工具' : '本机设置')}</span><span className="local-badge">{t('本地')}</span></div>
          <p className="context-lead">{view === 'research' ? t('可选信号与设备桥接是研究工具，不会进入象征空间。') : t('数据、应用锁与研究工具都在这里；所有记录默认留在本机。')}</p>
          <div className="paper-card context-note"><p className="card-label">{t('下一步')}</p><p>{view === 'research' ? t('模拟信号或连接设备；数据仍只留在本机。') : t('需要可选信号时，打开研究工具。')}</p></div>
        </aside>
        : <ContextPanel motif={selected} encounter={encounter} onEnter={enterSelected} onBack={backFromSpace} onDetail={() => setView('motif')} />}
    </div>
    {(locked && lockRecord) || recoveryNeeded ? <Suspense fallback={<div className="lock-overlay" />}><LockScreen onUnlock={unlockApp} onForgot={resetAppLock} blockedUntil={lockout.blockedUntil} /></Suspense> : null}
  </div>

}
