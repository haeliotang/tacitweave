// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
import { invoke } from '@tauri-apps/api/core'
import type { LocalSnapshot } from './local-dataset'

export interface HostInfo {
  platform: string
  app_version: string
  app_data_dir: string
  database_path: string
  sandbox: string
}

export interface DbStatus {
  path: string
  ready: boolean
  tables: number
  schema_version: number
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function getHostInfo(): Promise<HostInfo | null> {
  if (!isTauriRuntime()) return null
  try { return await invoke<HostInfo>('host_info') } catch { return null }
}

export async function getDbStatus(): Promise<DbStatus | null> {
  if (!isTauriRuntime()) return null
  try { return await invoke<DbStatus>('db_status') } catch { return null }
}

export async function readLocalText(name: string): Promise<string | null> {
  if (!isTauriRuntime()) return null
  try { return await invoke<string>('read_local_text', { name }) } catch { return null }
}

export async function writeLocalText(name: string, contents: string): Promise<boolean> {
  if (!isTauriRuntime()) return false
  try { await invoke('write_local_text', { name, contents }); return true } catch { return false }
}

export async function exportLocalStateFile(): Promise<string | null> {
  if (!isTauriRuntime()) return null
  try { return await invoke<string>('export_local_state') } catch { return null }
}

export async function importLocalStateFile(name: string): Promise<LocalSnapshot | null> {
  if (!isTauriRuntime()) return null
  try { return await invoke<LocalSnapshot>('import_local_state', { name }) } catch { return null }
}

export async function loadEncryptedState(): Promise<string | null> {
  if (!isTauriRuntime()) return null
  try { return await invoke<string | null>('load_encrypted_state') } catch { return null }
}

export async function saveEncryptedState(payload: string, purgePlaintext = false): Promise<boolean> {
  if (!isTauriRuntime()) return false
  try { await invoke('save_encrypted_state', { payload, purge: purgePlaintext }); return true } catch { return false }
}

export async function clearEncryptedState(): Promise<void> {
  if (!isTauriRuntime()) return
  try { await invoke('clear_encrypted_state') } catch { /* local web copy is still cleared by caller */ }
}

export async function clearLocalFiles(): Promise<void> {
  if (!isTauriRuntime()) return
  try { await invoke('clear_local_files') } catch { /* best effort; caller still clears the DB */ }
}

export async function clearLegacyAppData(): Promise<void> {
  if (!isTauriRuntime()) return
  try { await invoke('clear_legacy_app_data') } catch { /* old app data may not exist */ }
}
