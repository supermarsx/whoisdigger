use std::path::Path;

use crate::{db_cache_get, db_cache_set};
use rusqlite::Connection;
use tauri::Runtime;

use crate::tauri_app::support::{get_current_profile, get_profile_dir};

#[tauri::command]
pub async fn db_gui_cache_get<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    key: String,
    ttl_ms: Option<u64>,
) -> Result<Option<String>, String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");
    let path_str = path.to_string_lossy().to_string();
    tokio::task::spawn_blocking(move || db_cache_get(&path_str, &key, ttl_ms))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn db_gui_cache_set<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    key: String,
    response: String,
    max_entries: Option<u32>,
) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");
    let path_str = path.to_string_lossy().to_string();
    tokio::task::spawn_blocking(move || db_cache_set(&path_str, &key, &response, max_entries))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn db_gui_cache_clear<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");
    if !path.exists() {
        return Ok(());
    }
    tokio::task::spawn_blocking(move || {
        let conn = Connection::open(&path).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM cache", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn cache_merge<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    paths: Vec<String>,
) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let dest_path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");

    tokio::task::spawn_blocking(move || {
        let dest_conn = Connection::open(&dest_path).map_err(|e| e.to_string())?;
        dest_conn
            .execute(
                "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)",
                [],
            )
            .map_err(|e| e.to_string())?;

        for src_path in &paths {
            if !Path::new(src_path).exists() {
                continue;
            }
            let src_conn = Connection::open(src_path).map_err(|e| e.to_string())?;
            let mut stmt = src_conn
                .prepare("SELECT key, response, timestamp FROM cache")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?;

            for row in rows {
                let (key, response, timestamp) = row.map_err(|e| e.to_string())?;
                dest_conn
                    .execute(
                        "INSERT OR REPLACE INTO cache(key, response, timestamp) VALUES(?, ?, ?)",
                        rusqlite::params![key, response, timestamp],
                    )
                    .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
