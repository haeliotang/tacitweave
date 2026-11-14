// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { invoke } from '@tauri-apps/api/core'
import { isTauriRuntime } from './host'
import { clearEncryptedState, clearLegacyAppData, clearLocalFiles, loadEncryptedState, saveEncryptedState } from './host'
import { isMotifEntry, loadMotifs, motifStorageKey, saveMotifs } from './motif-journal'
import { isRelationshipTrigger, loadRelationshipTriggers, relationshipStorageKey, saveRelationshipTriggers } from './relationship'
import type { LocalSnapshot } from './local-dataset'
import { clearFieldLayout, emptyFieldLayout, fieldStorageKey, isFieldLayout, loadFieldLayout, saveFieldLayout } from './field'
import { clearSignalSessions, isSignalSession, loadSignalSessions, saveSignalSessions, signalSessionStorageKey } from './signal-session'
import { captureStorageKey, isCaptureLedger, loadCaptureProvenance, saveCaptureProvenance } from './capture-ledger'
import { isSymbolicSession, loadSymbolicSessions, saveSymbolicSessions, symbolicSessionStorageKey } from './symbolic-session'
import { experienceSpaceStorageKey, isExperienceSpaceCollection, loadExperienceSpaces, saveExperienceSpaces } from './experience-space'
import { removeLegacyLocalStorage } from './storage-migration'
import { createAppLockRecord, type AppLockRecord } from './app-lock'
import { decryptLocalSnapshot, deriveDataKey, encryptLocalSnapshot, isEncryptedLocalState, type EncryptedLocalState } from './encrypted-store'

const encryptedStorageKey = 'tacitweave.encrypted-state.v1'
let activeEncryption: { record: AppLockRecord; key: CryptoKey } | null = null

export function hasActiveEncryption() {
  return activeEncryption !== null
}

export function clearActiveEncryption() {
  activeEncryption = null
}

function webStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

function clearWebPlaintext(storage: Storage) {
  storage.removeItem(motifStorageKey)
  storage.removeItem(relationshipStorageKey)
  storage.removeItem(fieldStorageKey)
  storage.removeItem(signalSessionStorageKey)
  storage.removeItem(captureStorageKey)
  storage.removeItem(symbolicSessionStorageKey)
  storage.removeItem(experienceSpaceStorageKey)
  removeLegacyLocalStorage(storage)
}

export function readWebSnapshot(): LocalSnapshot {
  const storage = webStorage()
  if (!storage) return { motifs: [], relationships: [], field: emptyFieldLayout(), signals: [], captures: [] }
  return {
    motifs: loadMotifs(storage),
    relationships: loadRelationshipTriggers(storage),
    field: loadFieldLayout(storage),
    signals: loadSignalSessions(storage),
    captures: loadCaptureProvenance(storage),
    symbolicSessions: loadSymbolicSessions(storage),
    spaces: loadExperienceSpaces(storage),
  }
}

export function normalizeSnapshot(value: unknown): LocalSnapshot {
  if (!value || typeof value !== 'object') throw new Error('invalid_local_state')
  const snapshot = value as { motifs?: unknown; relationships?: unknown; field?: unknown; signals?: unknown; captures?: unknown; symbolicSessions?: unknown; spaces?: unknown }
  if (!Array.isArray(snapshot.motifs) || !Array.isArray(snapshot.relationships)) throw new Error('invalid_local_state')
  if (!snapshot.motifs.every(isMotifEntry) || !snapshot.relationships.every(isRelationshipTrigger)) throw new Error('invalid_local_state')
  if (snapshot.field !== undefined && !isFieldLayout(snapshot.field)) throw new Error('invalid_local_state')
  if (snapshot.signals !== undefined && (!Array.isArray(snapshot.signals) || !snapshot.signals.every(isSignalSession))) throw new Error('invalid_local_state')
  if (snapshot.captures !== undefined && !isCaptureLedger(snapshot.captures)) throw new Error('invalid_local_state')
  if (snapshot.symbolicSessions !== undefined && (!Array.isArray(snapshot.symbolicSessions) || !snapshot.symbolicSessions.every(isSymbolicSession))) throw new Error('invalid_local_state')
  if (snapshot.spaces !== undefined && (!Array.isArray(snapshot.spaces) || !isExperienceSpaceCollection(snapshot.spaces))) throw new Error('invalid_local_state')
  return {
    motifs: snapshot.motifs as LocalSnapshot['motifs'],
    relationships: snapshot.relationships as LocalSnapshot['relationships'],
    field: (snapshot.field as LocalSnapshot['field']) ?? emptyFieldLayout(),
    signals: (snapshot.signals as LocalSnapshot['signals']) ?? [],
    captures: (snapshot.captures as LocalSnapshot['captures']) ?? [],
    symbolicSessions: (snapshot.symbolicSessions as LocalSnapshot['symbolicSessions']) ?? [],
    spaces: (snapshot.spaces as LocalSnapshot['spaces']) ?? [],
  }
}

export type EncryptedReconciliation = { raw: string | null; action: 'none' | 'mirror-host' | 'migrate-web' }

/** SQLite wins on desktop; migrate a web-only legacy payload once. */
export function reconcileEncryptedPayload(host: string | null, web: string | null): EncryptedReconciliation {
  if (host) return { raw: host, action: 'mirror-host' }
  if (web) return { raw: web, action: 'migrate-web' }
  return { raw: null, action: 'none' }
}

async function readEncryptedPayload(): Promise<EncryptedLocalState | null> {
  const storage = webStorage()
  let raw: string | null = null
  if (isTauriRuntime()) {
    // SQLite is canonical. Migrate a legacy web-only encrypted payload once,
    // or heal the web mirror from SQLite.
    const host = await loadEncryptedState()
    const web = storage?.getItem(encryptedStorageKey) ?? null
    const reconciled = reconcileEncryptedPayload(host, web)
    raw = reconciled.raw
    if (reconciled.action === 'mirror-host' && raw) storage?.setItem(encryptedStorageKey, raw)
    if (reconciled.action === 'migrate-web' && raw) await saveEncryptedState(raw)
  } else {
    raw = storage?.getItem(encryptedStorageKey) ?? null
  }
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isEncryptedLocalState(parsed) ? parsed : null
  } catch {
    return null
  }
}

async function writeEncryptedPayload(payload: EncryptedLocalState, purgePlaintext = false) {
  const storage = webStorage()
  if (storage) {
    clearWebPlaintext(storage)
    storage.setItem(encryptedStorageKey, JSON.stringify(payload))
  }
  if (isTauriRuntime()) await saveEncryptedState(JSON.stringify(payload), purgePlaintext)
}

async function removeEncryptedPayload() {
  const storage = webStorage()
  storage?.removeItem(encryptedStorageKey)
  if (isTauriRuntime()) await clearEncryptedState()
}

export async function hasEncryptedLocalState(): Promise<boolean> {
  return Boolean(await readEncryptedPayload())
}

export function snapshotHasData(snapshot: LocalSnapshot) {
  return Boolean(snapshot.motifs.length || snapshot.relationships.length || snapshot.signals?.length || snapshot.captures?.length || snapshot.symbolicSessions?.length || snapshot.spaces?.length
    || Object.keys(snapshot.field?.positions ?? {}).length || snapshot.field?.links.length)
}

function mirrorWebSnapshot(storage: Storage, snapshot: LocalSnapshot) {
  saveMotifs(storage, snapshot.motifs)
  saveRelationshipTriggers(storage, snapshot.relationships)
  saveFieldLayout(storage, snapshot.field ?? emptyFieldLayout())
  saveSignalSessions(storage, snapshot.signals ?? [])
  saveCaptureProvenance(storage, snapshot.captures ?? [])
  saveSymbolicSessions(storage, snapshot.symbolicSessions ?? [])
  saveExperienceSpaces(storage, snapshot.spaces ?? [])
}

export type SnapshotReconciliation = { snapshot: LocalSnapshot; source: 'host' | 'fallback'; action: 'none' | 'migrate' | 'mirror' }

/** SQLite is canonical on desktop; migrate an empty host, or heal a stale web mirror. */
export function reconcileSnapshots(host: LocalSnapshot, fallback: LocalSnapshot): SnapshotReconciliation {
  if (!snapshotHasData(host) && snapshotHasData(fallback)) return { snapshot: fallback, source: 'fallback', action: 'migrate' }
  if (snapshotHasData(host)) return { snapshot: host, source: 'host', action: 'mirror' }
  return { snapshot: host, source: 'host', action: 'none' }
}

export async function loadLocalSnapshot(): Promise<LocalSnapshot> {
  const fallback = readWebSnapshot()
  if (!isTauriRuntime()) return fallback
  try {
    const host = normalizeSnapshot(await invoke('load_local_state'))
    const storage = webStorage()
    const reconciled = reconcileSnapshots(host, fallback)
    if (reconciled.action === 'migrate') {
      // Never overwrite a locked/encrypted snapshot with an empty or stale web copy.
      if (await hasEncryptedLocalState()) return host
      // One-time migration from the browser fallback into the desktop store.
      await saveLocalSnapshot(reconciled.snapshot)
    } else if (storage && reconciled.action === 'mirror') {
      // SQLite is canonical on desktop; heal any stale or partial web mirror.
      storage.removeItem(encryptedStorageKey)
      mirrorWebSnapshot(storage, reconciled.snapshot)
    }
    return reconciled.snapshot
  } catch {
    return fallback
  }
}

export async function saveLocalSnapshot(input: LocalSnapshot): Promise<void> {
  const storage = webStorage()
  // Older callers may not know about spaces yet; never omit them from an encrypted write.
  const snapshot: LocalSnapshot = { ...input, spaces: input.spaces ?? (storage ? loadExperienceSpaces(storage) : []) }
  if (activeEncryption) {
    const payload = await encryptLocalSnapshot(snapshot, activeEncryption.record, activeEncryption.key)
    await writeEncryptedPayload(payload)
    return
  }
  // A missing lock record must not cause plaintext writes over encrypted data.
  if (await hasEncryptedLocalState()) return
  storage?.removeItem(encryptedStorageKey)
  if (storage) {
    saveMotifs(storage, snapshot.motifs)
    saveRelationshipTriggers(storage, snapshot.relationships)
    saveFieldLayout(storage, snapshot.field ?? emptyFieldLayout())
    saveSignalSessions(storage, snapshot.signals ?? [])
    saveCaptureProvenance(storage, snapshot.captures ?? [])
    saveSymbolicSessions(storage, snapshot.symbolicSessions ?? [])
    saveExperienceSpaces(storage, snapshot.spaces ?? loadExperienceSpaces(storage))
  }
  if (!isTauriRuntime()) return
  try { await invoke('save_local_state', { snapshot: { ...snapshot, spaces: snapshot.spaces ?? (storage ? loadExperienceSpaces(storage) : []) } }) } catch { /* keep the local web copy */ }
}

export async function unlockLocalSnapshot(pin: string, record: AppLockRecord): Promise<LocalSnapshot | null> {
  const payload = await readEncryptedPayload()
  if (!payload) return null
  const { snapshot, key } = await decryptLocalSnapshot(payload, pin)
  const valid = normalizeSnapshot(snapshot)
  activeEncryption = { record, key }
  return valid
}

/** Recover an encrypted payload when the old WebView lock record was not migrated. */
export async function recoverEncryptedSnapshot(pin: string): Promise<{ snapshot: LocalSnapshot; record: AppLockRecord }> {
  const payload = await readEncryptedPayload()
  if (!payload) throw new Error('no_encrypted_state')
  const { snapshot } = await decryptLocalSnapshot(payload, pin)
  const normalized = normalizeSnapshot(snapshot)
  const record = await createAppLockRecord(pin)
  await enableLocalEncryption(normalized, pin, record)
  return { snapshot: normalized, record }
}

export async function enableLocalEncryption(snapshot: LocalSnapshot, pin: string, record: AppLockRecord): Promise<void> {
  const key = await deriveDataKey(pin, record.salt, record.iterations)
  const payload = await encryptLocalSnapshot(snapshot, record, key)
  activeEncryption = { record, key }
  await writeEncryptedPayload(payload, true)
}

export async function disableLocalEncryption(pin: string, record: AppLockRecord, fallback: LocalSnapshot): Promise<LocalSnapshot> {
  const payload = await readEncryptedPayload()
  let snapshot = fallback
  if (payload) {
    const { snapshot: decrypted } = await decryptLocalSnapshot(payload, pin)
    snapshot = normalizeSnapshot(decrypted)
  }
  activeEncryption = null
  await removeEncryptedPayload()
  await saveLocalSnapshot(snapshot)
  return snapshot
}

export async function clearLocalSnapshot(): Promise<void> {
  const storage = webStorage()
  if (storage) {
    clearWebPlaintext(storage)
    storage.removeItem(encryptedStorageKey)
  }
  activeEncryption = null
  if (!isTauriRuntime()) return
  try { await invoke('clear_local_state') } catch { /* local web copy already cleared */ }
  await clearLocalFiles()
  await clearLegacyAppData()
}
