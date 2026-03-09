use std::path::Path;

use crate::{db_history_get, db_history_get_filtered, HistoryEntry};
use rusqlite::Connection;
use tauri::Runtime;

use crate::tauri_app::support::{get_current_profile, get_profile_dir, HistoryPage};

#[tauri::command]
pub async fn db_gui_history_get<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    limit: u32,
) -> Result<Vec<HistoryEntry>, String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    if !path.exists() {
        return Ok(Vec::new());
    }
    let path_str = path.to_string_lossy().to_string();
    tokio::task::spawn_blocking(move || db_history_get(&path_str, limit))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn db_gui_history_get_filtered<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    query: Option<String>,
    status: Option<String>,
    days: Option<u32>,
    page: Option<u32>,
    page_size: Option<u32>,
) -> Result<HistoryPage<HistoryEntry>, String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    if !path.exists() {
        return Ok(HistoryPage {
            entries: Vec::new(),
            total: 0,
            page: 0,
            page_size: page_size.unwrap_or(50),
        });
    }
    let path_str = path.to_string_lossy().to_string();
    let pg = page.unwrap_or(0);
    let ps = page_size.unwrap_or(50);
    let since_ms = days.map(|d| chrono::Utc::now().timestamp_millis() - (d as i64 * 86_400_000));
    let q = query.clone();
    let s = status.clone();

    let (entries, total) = tokio::task::spawn_blocking(move || {
        db_history_get_filtered(&path_str, q.as_deref(), s.as_deref(), since_ms, pg, ps)
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(HistoryPage {
        entries,
        total,
        page: pg,
        page_size: ps,
    })
}

#[tauri::command]
pub async fn db_gui_history_clear<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    if !path.exists() {
        return Ok(());
    }
    tokio::task::spawn_blocking(move || {
        let conn = Connection::open(&path).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM history", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn history_merge<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    paths: Vec<String>,
) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let dest_path =
        get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));

    tokio::task::spawn_blocking(move || {
        let dest_conn = Connection::open(&dest_path).map_err(|e| e.to_string())?;
        dest_conn
            .execute(
                "CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)",
                [],
            )
            .map_err(|e| e.to_string())?;

        for src_path in &paths {
            if !Path::new(src_path).exists() {
                continue;
            }
            let src_conn = Connection::open(src_path).map_err(|e| e.to_string())?;
            let mut stmt = src_conn
                .prepare("SELECT domain, timestamp, status FROM history")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, i64>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })
                .map_err(|e| e.to_string())?;

            for row in rows {
                let (domain, timestamp, status) = row.map_err(|e| e.to_string())?;
                dest_conn
                    .execute(
                        "INSERT INTO history(domain, timestamp, status) VALUES(?, ?, ?)",
                        rusqlite::params![domain, timestamp, status],
                    )
                    .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
