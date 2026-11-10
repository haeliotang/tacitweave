// SPDX-FileCopyrightText: 2026 Inceptless <support@inceptless.com>
// SPDX-License-Identifier: AGPL-3.0-or-later
use rusqlite::Connection;
use serde::Serialize;
use serde_json::{Value, json};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Manager, State};

#[cfg(test)]
const LOCAL_STATE_SCHEMA: &str = "CREATE TABLE IF NOT EXISTS local_state (\n  key TEXT PRIMARY KEY,\n  value TEXT NOT NULL,\n  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n);";
const DATABASE_SCHEMA_VERSION: i64 = 2;

fn secure_vacuum(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch("PRAGMA secure_delete = ON; PRAGMA wal_checkpoint(TRUNCATE); VACUUM;")
        .map_err(|error| error.to_string())
}

fn read_snapshot(connection: &Connection) -> Result<Value, String> {
    let mut statement = connection
        .prepare(
            "SELECT key, value FROM local_state WHERE key IN ('motifs', 'relationships', 'field', 'signals', 'captures', 'symbolic_sessions')",
        )
        .map_err(|error| error.to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|error| error.to_string())?;
    let mut motifs = Value::Array(Vec::new());
    let mut relationships = Value::Array(Vec::new());
    let mut field = json!({ "version": "field-layout-v1", "positions": {}, "links": [] });
    let mut signals = Value::Array(Vec::new());
    let mut captures = Value::Array(Vec::new());
    let mut symbolic_sessions = Value::Array(Vec::new());
    for row in rows {
        let (key, value) = row.map_err(|error| error.to_string())?;
        let parsed: Value = serde_json::from_str(&value).map_err(|error| error.to_string())?;
        if key == "motifs" {
            motifs = parsed;
        } else if key == "relationships" {
            relationships = parsed;
        } else if key == "field" {
            field = parsed;
        } else if key == "signals" {
            signals = parsed;
        } else if key == "captures" {
            captures = parsed;
        } else if key == "symbolic_sessions" {
            symbolic_sessions = parsed;
        }
    }
    Ok(
        json!({ "motifs": motifs, "relationships": relationships, "field": field, "signals": signals, "captures": captures, "symbolicSessions": symbolic_sessions }),
    )
}

fn write_snapshot(connection: &Connection, snapshot: &Value) -> Result<(), String> {
    let motifs = snapshot
        .get("motifs")
        .and_then(Value::as_array)
        .ok_or("invalid_motifs")?;
    let relationships = snapshot
        .get("relationships")
        .and_then(Value::as_array)
        .ok_or("invalid_relationships")?;
    let field = snapshot
        .get("field")
        .cloned()
        .unwrap_or_else(|| json!({ "version": "field-layout-v1", "positions": {}, "links": [] }));
    let signals = snapshot
        .get("signals")
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new()));
    let captures = snapshot
        .get("captures")
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new()));
    let symbolic_sessions = snapshot
        .get("symbolicSessions")
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new()));
    if field.get("version").and_then(Value::as_str) != Some("field-layout-v1")
        || !field
            .get("positions")
            .map(Value::is_object)
            .unwrap_or(false)
        || !field.get("links").map(Value::is_array).unwrap_or(false)
    {
        return Err("invalid_field".into());
    }
    if !signals.is_array() {
        return Err("invalid_signals".into());
    }
    if !captures.is_array() {
        return Err("invalid_captures".into());
    }
    if !symbolic_sessions.is_array() {
        return Err("invalid_symbolic_sessions".into());
    }
    let statement = "INSERT INTO local_state (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP";
    connection
        .execute("DELETE FROM local_state WHERE key = 'encrypted'", [])
        .map_err(|error| error.to_string())?;
    for (key, value) in [
        ("motifs", Value::Array(motifs.clone())),
        ("relationships", Value::Array(relationships.clone())),
        ("field", field),
        ("signals", signals),
        ("captures", captures),
        ("symbolic_sessions", symbolic_sessions),
    ] {
        connection
            .execute(
                statement,
                [
                    key,
                    &serde_json::to_string(&value).map_err(|error| error.to_string())?,
                ],
            )
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

struct DbState {
    path: PathBuf,
    connection: Mutex<Connection>,
}

#[derive(Serialize)]
struct HostInfo {
    platform: String,
    app_version: String,
    app_data_dir: String,
    database_path: String,
    sandbox: String,
}

#[derive(Serialize)]
struct DbStatus {
    path: String,
    ready: bool,
    tables: i64,
    schema_version: i64,
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map_err(|error| error.to_string())
}

fn sandbox_file_name(name: &str) -> Result<&str, String> {
    if name.is_empty()
        || name.len() > 120
        || name.starts_with('.')
        || name.contains('/')
        || name.contains('\\')
        || name.contains("..")
    {
        return Err("invalid_local_file_name".into());
    }
    Ok(name)
}

#[tauri::command]
fn reject_symlink(path: &Path) -> Result<(), String> {
    if fs::symlink_metadata(path)
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false)
    {
        return Err("symlink_not_allowed".into());
    }
    Ok(())
}

fn local_file_path_in(data: &Path, name: &str) -> Result<PathBuf, String> {
    let name = sandbox_file_name(name)?;
    let directory = data.join("local-files");
    reject_symlink(&directory)?;
    let path = directory.join(name);
    reject_symlink(&path)?;
    Ok(path)
}

#[tauri::command]
fn host_info(app: tauri::AppHandle, state: State<'_, DbState>) -> Result<HostInfo, String> {
    let data = app_data_dir(&app)?;
    Ok(HostInfo {
        platform: std::env::consts::OS.to_string(),
        app_version: app.package_info().version.to_string(),
        app_data_dir: data.to_string_lossy().into_owned(),
        database_path: state.path.to_string_lossy().into_owned(),
        sandbox: "app-data-api-only".into(),
    })
}

#[tauri::command]
fn read_local_text(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let path = local_file_path_in(&app_data_dir(&app)?, &name)?;
    reject_symlink(&path)?;
    let metadata = fs::symlink_metadata(&path).map_err(|error| error.to_string())?;
    if metadata.len() > 1_048_576 {
        return Err("local_file_too_large".into());
    }
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_local_text(app: tauri::AppHandle, name: String, contents: String) -> Result<(), String> {
    if contents.len() > 1_048_576 {
        return Err("local_file_too_large".into());
    }
    let data = app_data_dir(&app)?;
    let path = local_file_path_in(&data, &name)?;
    let directory = data.join("local-files");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    reject_symlink(&directory)?;
    reject_symlink(&path)?;
    fs::write(path, contents).map_err(|error| error.to_string())
}

#[tauri::command]
fn load_local_state(state: State<'_, DbState>) -> Result<Value, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    read_snapshot(&connection)
}

#[tauri::command]
fn save_local_state(state: State<'_, DbState>, snapshot: Value) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    write_snapshot(&connection, &snapshot)
}

#[tauri::command]
fn clear_local_state(state: State<'_, DbState>) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    connection
        .execute("DELETE FROM local_state", [])
        .map_err(|error| error.to_string())?;
    secure_vacuum(&connection)?;
    Ok(())
}

#[tauri::command]
fn clear_local_files(app: tauri::AppHandle) -> Result<(), String> {
    let directory = app_data_dir(&app)?.join("local-files");
    reject_symlink(&directory)?;
    if !directory.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_file()
        {
            fs::remove_file(entry.path()).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn clear_legacy_app_data(app: tauri::AppHandle) -> Result<(), String> {
    let data = app_data_dir(&app)?;
    for legacy in legacy_app_data_dirs(&data) {
        if legacy.is_dir() {
            reject_symlink(&legacy)?;
            fs::remove_dir_all(&legacy).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn export_local_state(app: tauri::AppHandle, state: State<'_, DbState>) -> Result<String, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let snapshot = read_snapshot(&connection)?;
    let directory = app_data_dir(&app)?.join("local-files");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let seconds = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    let name = format!("tacitweave-export-{seconds}.json");
    fs::write(
        directory.join(&name),
        serde_json::to_string_pretty(&snapshot).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    Ok(name)
}

#[tauri::command]
fn import_local_state(
    app: tauri::AppHandle,
    state: State<'_, DbState>,
    name: String,
) -> Result<Value, String> {
    let path = local_file_path_in(&app_data_dir(&app)?, &name)?;
    reject_symlink(&path)?;
    let text = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let snapshot: Value = serde_json::from_str(&text).map_err(|error| error.to_string())?;
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    write_snapshot(&connection, &snapshot)?;
    Ok(snapshot)
}

fn read_encrypted_state(connection: &Connection) -> Result<Option<String>, String> {
    let mut statement = connection
        .prepare("SELECT value FROM local_state WHERE key = 'encrypted'")
        .map_err(|error| error.to_string())?;
    let mut rows = statement.query([]).map_err(|error| error.to_string())?;
    let row = rows.next().map_err(|error| error.to_string())?;
    row.map(|row| row.get::<_, String>(0))
        .transpose()
        .map_err(|error| error.to_string())
}

fn write_encrypted_state(connection: &Connection, payload: &str) -> Result<(), String> {
    connection
        .execute(
            "INSERT INTO local_state (key, value) VALUES ('encrypted', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
            [payload],
        )
        .map_err(|error| error.to_string())?;
    connection
        .execute(
            "DELETE FROM local_state WHERE key IN ('motifs', 'relationships', 'field', 'signals', 'captures', 'symbolic_sessions')",
            [],
        )
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn remove_encrypted_state(connection: &Connection) -> Result<(), String> {
    connection
        .execute("DELETE FROM local_state WHERE key = 'encrypted'", [])
        .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_encrypted_state(state: State<'_, DbState>) -> Result<Option<String>, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    read_encrypted_state(&connection)
}

#[tauri::command]
fn save_encrypted_state(
    state: State<'_, DbState>,
    payload: String,
    purge: Option<bool>,
) -> Result<(), String> {
    if payload.len() > 20_000_000 {
        return Err("encrypted_state_too_large".into());
    }
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    write_encrypted_state(&connection, &payload)?;
    if purge.unwrap_or(false) {
        secure_vacuum(&connection)?;
    }
    Ok(())
}

#[tauri::command]
fn clear_encrypted_state(state: State<'_, DbState>) -> Result<(), String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    remove_encrypted_state(&connection)
}

#[tauri::command]
fn db_status(state: State<'_, DbState>) -> Result<DbStatus, String> {
    let connection = state.connection.lock().map_err(|error| error.to_string())?;
    let tables: i64 = connection
        .query_row(
            "SELECT count(*) FROM sqlite_master WHERE type = 'table'",
            [],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let schema_version: i64 = connection
        .query_row(
            "SELECT CAST(value AS INTEGER) FROM local_meta WHERE key = 'schema_version'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    Ok(DbStatus {
        path: state.path.to_string_lossy().into_owned(),
        ready: true,
        tables,
        schema_version,
    })
}

fn copy_legacy_file(source: &Path, destination: &Path) -> Result<(), std::io::Error> {
    if source.is_file() && !destination.exists() {
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::copy(source, destination)?;
    }
    Ok(())
}

const LEGACY_BUNDLE_IDS: &[&str] = &[
    "com.inceptless.familiweave",
    "com.iceptless.familiweave",
    "com.iceptless.tacitweave",
];
const LEGACY_DB_NAME: &str = "familiweave.db";

fn legacy_app_data_dirs(data: &Path) -> Vec<PathBuf> {
    let Some(parent) = data.parent() else {
        return Vec::new();
    };
    LEGACY_BUNDLE_IDS
        .iter()
        .map(|identifier| parent.join(identifier))
        .filter(|path| path != data)
        .collect()
}

fn migrate_legacy_app_data(data: &Path) -> Result<(), std::io::Error> {
    let legacy_dirs = legacy_app_data_dirs(data);
    if legacy_dirs.iter().all(|legacy| !legacy.is_dir()) {
        return Ok(());
    }
    fs::create_dir_all(data)?;
    for legacy in legacy_dirs {
        if !legacy.is_dir() {
            continue;
        }
        if !data.join("tacitweave.db").exists() {
            for candidate in [LEGACY_DB_NAME, "tacitweave.db"] {
                copy_legacy_file(&legacy.join(candidate), &data.join("tacitweave.db"))?;
                if data.join("tacitweave.db").exists() {
                    break;
                }
            }
            for suffix in ["-wal", "-shm"] {
                let source = legacy.join(format!("{LEGACY_DB_NAME}{suffix}"));
                let destination = data.join(format!("tacitweave.db{suffix}"));
                copy_legacy_file(&source, &destination)?;
            }
        }
        let legacy_files = legacy.join("local-files");
        if legacy_files.is_dir() {
            for entry in fs::read_dir(legacy_files)? {
                let entry = entry?;
                if entry.file_type()?.is_file() {
                    copy_legacy_file(
                        &entry.path(),
                        &data.join("local-files").join(entry.file_name()),
                    )?;
                }
            }
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data = app.path().app_data_dir()?;
            if let Err(error) = migrate_legacy_app_data(&data) {
                eprintln!("legacy app-data migration skipped: {error}");
            }
            fs::create_dir_all(&data)?;
            let database_path = data.join("tacitweave.db");
            let connection = Connection::open(&database_path)?;
            connection
                .execute_batch("PRAGMA secure_delete = ON;")
                .map_err(|error| error.to_string())?;
            connection.execute_batch(
                "CREATE TABLE IF NOT EXISTS local_meta (
           key TEXT PRIMARY KEY,
           value TEXT NOT NULL,
           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
         );
         CREATE TABLE IF NOT EXISTS local_state (
           key TEXT PRIMARY KEY,
           value TEXT NOT NULL,
           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
         );",
            )?;
            connection.execute(
                "INSERT INTO local_meta (key, value) VALUES ('schema_version', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                [DATABASE_SCHEMA_VERSION.to_string()],
            )?;
            app.manage(DbState {
                path: database_path,
                connection: Mutex::new(connection),
            });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            host_info,
            read_local_text,
            write_local_text,
            db_status,
            load_local_state,
            save_local_state,
            clear_local_state,
            clear_local_files,
            clear_legacy_app_data,
            load_encrypted_state,
            save_encrypted_state,
            clear_encrypted_state,
            export_local_state,
            import_local_state
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tacitweave");
}

#[cfg(test)]
mod tests {
    use super::{local_file_path_in, read_snapshot, sandbox_file_name, write_snapshot};
    use rusqlite::Connection;
    use serde_json::json;

    #[test]
    fn sandbox_accepts_plain_file_names() {
        assert!(sandbox_file_name("export.json").is_ok());
        assert!(sandbox_file_name("2026-11-01_motif.json").is_ok());
    }

    #[test]
    fn local_state_round_trips_through_sqlite() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(super::LOCAL_STATE_SCHEMA).unwrap();
        write_snapshot(
            &connection,
            &json!({ "motifs": [{"name":"a"}], "relationships": [], "field": { "version": "field-layout-v1", "positions": { "motif:a": { "x": 0.2, "y": 0.4 } }, "links": [] }, "captures": [{ "version": "capture-v1", "captureId": "capture-1", "rendererKind": "captured", "mimeType": "video/mp4", "durationSec": 75, "sha256": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "synthId": false, "createdAt": "2026-11-01T00:00:00.000Z" }] }),
        )
        .unwrap();
        let snapshot = read_snapshot(&connection).unwrap();
        assert_eq!(snapshot["motifs"][0]["name"], "a");
        assert_eq!(snapshot["relationships"].as_array().unwrap().len(), 0);
        assert_eq!(snapshot["field"]["positions"]["motif:a"]["x"], 0.2);
        assert_eq!(snapshot["signals"].as_array().unwrap().len(), 0);
        assert_eq!(snapshot["captures"][0]["captureId"], "capture-1");
    }

    #[test]
    fn local_state_rejects_malformed_snapshots() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(super::LOCAL_STATE_SCHEMA).unwrap();
        assert!(write_snapshot(&connection, &json!({ "motifs": [] })).is_err());
        assert!(
            write_snapshot(
                &connection,
                &json!({ "motifs": [], "relationships": [], "field": { "version": "nope" } })
            )
            .is_err()
        );
    }

    #[test]
    fn sandbox_rejects_paths_and_hidden_names() {
        for name in ["", "../x", "a/b", "a\\b", ".env", "..", "a..b"] {
            assert!(sandbox_file_name(name).is_err(), "accepted {name:?}");
        }
        assert!(sandbox_file_name(&"a".repeat(121)).is_err());
    }

    #[test]
    fn secure_vacuum_enables_secure_delete() {
        let connection = Connection::open_in_memory().unwrap();
        super::secure_vacuum(&connection).unwrap();
        let mode: i64 = connection
            .query_row("PRAGMA secure_delete", [], |row| row.get(0))
            .unwrap();
        assert_eq!(mode, 1);
    }

    #[cfg(unix)]
    #[test]
    fn local_file_path_rejects_symlinks() {
        use std::os::unix::fs::symlink;
        let root = std::env::temp_dir().join(format!(
            "tacitweave-symlink-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir_all(root.join("local-files")).unwrap();
        let target = root.join("outside.txt");
        std::fs::write(&target, b"outside").unwrap();
        let link = root.join("local-files/link.txt");
        symlink(&target, &link).unwrap();
        assert!(local_file_path_in(&root, "link.txt").is_err());
        let _ = std::fs::remove_dir_all(root);
    }
    #[test]
    fn encrypted_state_replaces_plaintext_keys_and_round_trips() {
        let connection = Connection::open_in_memory().unwrap();
        connection.execute_batch(super::LOCAL_STATE_SCHEMA).unwrap();
        super::write_snapshot(
            &connection,
            &json!({ "motifs": [{"name":"a"}], "relationships": [] }),
        )
        .unwrap();
        super::write_encrypted_state(&connection, "ciphertext").unwrap();
        assert_eq!(
            super::read_encrypted_state(&connection).unwrap(),
            Some("ciphertext".into())
        );
        let plaintext: i64 = connection.query_row("SELECT count(*) FROM local_state WHERE key IN ('motifs','relationships','field','signals','captures','symbolic_sessions')", [], |row| row.get(0)).unwrap();
        assert_eq!(plaintext, 0);
        super::remove_encrypted_state(&connection).unwrap();
        assert_eq!(super::read_encrypted_state(&connection).unwrap(), None);
    }

    #[test]
    fn migrates_legacy_familiweave_app_data_into_tacitweave() {
        let root = std::env::temp_dir().join(format!(
            "tacitweave-migration-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let current = root.join("com.inceptless.tacitweave");
        let legacy = root.join("com.inceptless.familiweave");
        std::fs::create_dir_all(legacy.join("local-files")).unwrap();
        std::fs::write(legacy.join("familiweave.db"), b"legacy-db").unwrap();
        std::fs::write(legacy.join("local-files/note.json"), b"{\"ok\":true}").unwrap();

        super::migrate_legacy_app_data(&current).unwrap();

        assert_eq!(
            std::fs::read(current.join("tacitweave.db")).unwrap(),
            b"legacy-db"
        );
        assert_eq!(
            std::fs::read(current.join("local-files/note.json")).unwrap(),
            b"{\"ok\":true}"
        );
        let _ = std::fs::remove_dir_all(root);
    }
}
