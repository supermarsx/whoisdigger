// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use whoisdigger::{
    perform_lookup, dns_lookup, rdap_lookup,
    db_history_add, db_history_get, db_cache_get, db_cache_set,
    availability::{is_domain_available, get_domain_parameters, DomainStatus, WhoisParams},
    HistoryEntry,
};

use tauri::{Emitter, State, Runtime, Manager};
use std::sync::Arc;
use tokio::sync::{Semaphore, Mutex as AsyncMutex};
use futures::future::join_all;
use walkdir::WalkDir;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri_plugin_shell::ShellExt;
use zip::write::SimpleFileOptions;
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Serialize, Deserialize};
use rusqlite::Connection;
use std::io::Write;

// ─── Structs ─────────────────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct FileStat {
    size: u64,
    #[serde(rename = "mtimeMs")]
    mtime_ms: u64,
    mtime: Option<String>,
    atime: Option<String>,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
    #[serde(rename = "isFile")]
    is_file: bool,
}

#[derive(Serialize, Clone)]
struct AppStats {
    mtime: Option<u64>,
    loaded: bool,
    size: u64,
    #[serde(rename = "configPath")]
    config_path: String,
    #[serde(rename = "configSize")]
    config_size: u64,
    #[serde(rename = "readWrite")]
    read_write: bool,
    #[serde(rename = "dataPath")]
    data_path: String,
}

struct StatsWatcher {
    config_path: String,
    data_path: String,
}

struct MonitorState {
    active: bool,
    cancel_token: Option<tokio::sync::oneshot::Sender<()>>,
}

struct BulkLookupState {
    paused: bool,
    stopped: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct ProfileEntry {
    id: String,
    name: String,
    file: String,
    mtime: Option<u64>,
}

struct AppData {
    stats_watchers: Mutex<HashMap<u32, StatsWatcher>>,
    next_watcher_id: Mutex<u32>,
    monitor: AsyncMutex<MonitorState>,
    bulk_state: Arc<AsyncMutex<BulkLookupState>>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn get_user_data_dir<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    let path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

fn get_profile_dir<R: Runtime>(app_handle: &tauri::AppHandle<R>, profile: &str) -> Result<PathBuf, String> {
    let mut path = get_user_data_dir(app_handle)?;
    path.push("profiles");
    path.push(profile);
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

fn epoch_ms_from_metadata(metadata: &fs::Metadata) -> Option<u64> {
    metadata.modified().ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
}

fn iso_from_system_time(st: std::time::SystemTime) -> String {
    let duration = st.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let dt = chrono::DateTime::from_timestamp(secs as i64, 0).unwrap_or_default();
    dt.to_rfc3339()
}

// ─── FS Commands ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn fs_read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
async fn fs_stat(path: String) -> Result<FileStat, String> {
    let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
    let mtime_ms = epoch_ms_from_metadata(&metadata).unwrap_or(0);
    let mtime_str = metadata.modified().ok().map(iso_from_system_time);
    let atime_str = metadata.accessed().ok().map(iso_from_system_time);

    Ok(FileStat {
        size: metadata.len(),
        mtime_ms,
        mtime: mtime_str,
        atime: atime_str,
        is_directory: metadata.is_dir(),
        is_file: metadata.is_file(),
    })
}

#[tauri::command]
async fn fs_readdir(path: String) -> Result<Vec<String>, String> {
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            if let Ok(name) = entry.file_name().into_string() {
                names.push(name);
            }
        }
    }
    Ok(names)
}

#[tauri::command]
async fn fs_unlink(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_access(path: String) -> Result<(), String> {
    fs::metadata(&path).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_mkdir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

// ─── Shell Commands ──────────────────────────────────────────────────────────

#[tauri::command]
#[allow(deprecated)] // TODO: migrate to tauri-plugin-opener
async fn shell_open_path<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<(), String> {
    app_handle.shell().open(path, None).map_err(|e| e.to_string())
}

// ─── I18n Commands ───────────────────────────────────────────────────────────

#[tauri::command]
async fn i18n_load<R: Runtime>(app_handle: tauri::AppHandle<R>, lang: String) -> Result<String, String> {
    let filename = format!("{}.json", lang);

    // Try resource dir first (production)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        for prefix in &["dist/app/locales", "locales"] {
            let path = resource_dir.join(prefix).join(&filename);
            if path.exists() {
                return fs::read_to_string(path).map_err(|e| e.to_string());
            }
        }
    }

    // Fallback for development
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    for prefix in &["dist/app/locales", "app/locales"] {
        let path = cwd.join(prefix).join(&filename);
        if path.exists() {
            return fs::read_to_string(path).map_err(|e| e.to_string());
        }
    }

    Ok("{}".to_string())
}

// ─── App Path Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn app_get_base_dir() -> Result<String, String> {
    let path = std::env::current_dir().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn app_get_user_data_path<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?;
    Ok(path.to_string_lossy().to_string())
}

// ─── WHOIS Lookup Commands ───────────────────────────────────────────────────

#[tauri::command]
async fn whois_lookup<R: Runtime>(app_handle: tauri::AppHandle<R>, domain: String) -> Result<String, String> {
    let result = perform_lookup(&domain, 10000).await?;

    // Log to history
    let mut path = get_profile_dir(&app_handle, "default")?;
    path.push("history-default.sqlite");

    let status = is_domain_available(&result);
    let status_str = serde_json::to_value(&status).unwrap().as_str().unwrap_or("unavailable").to_string();
    let _ = db_history_add(&path.to_string_lossy(), &domain, &status_str);

    Ok(result)
}

#[tauri::command]
async fn dns_lookup_cmd(domain: String) -> Result<bool, String> {
    dns_lookup(&domain).await
}

#[tauri::command]
async fn rdap_lookup_cmd(domain: String) -> Result<String, String> {
    rdap_lookup(&domain).await
}

// ─── Availability Commands ───────────────────────────────────────────────────

#[tauri::command]
async fn availability_check(text: String) -> String {
    let status = is_domain_available(&text);
    serde_json::to_value(&status).unwrap().as_str().unwrap_or("unavailable").to_string()
}

#[tauri::command]
async fn availability_params(domain: Option<String>, status: Option<DomainStatus>, text: String) -> WhoisParams {
    get_domain_parameters(domain, status, text)
}

// ─── History Commands ────────────────────────────────────────────────────────

#[tauri::command]
async fn db_gui_history_get<R: Runtime>(app_handle: tauri::AppHandle<R>, limit: u32) -> Result<Vec<HistoryEntry>, String> {
    let mut path = get_profile_dir(&app_handle, "default")?;
    path.push("history-default.sqlite");
    if !path.exists() { return Ok(Vec::new()); }
    db_history_get(&path.to_string_lossy(), limit)
}

#[tauri::command]
async fn db_gui_history_clear<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let mut path = get_profile_dir(&app_handle, "default")?;
    path.push("history-default.sqlite");
    if !path.exists() { return Ok(()); }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn history_merge<R: Runtime>(app_handle: tauri::AppHandle<R>, paths: Vec<String>) -> Result<(), String> {
    let mut dest_path = get_profile_dir(&app_handle, "default")?;
    dest_path.push("history-default.sqlite");

    let dest_conn = Connection::open(&dest_path).map_err(|e| e.to_string())?;
    dest_conn.execute(
        "CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)",
        [],
    ).map_err(|e| e.to_string())?;

    for src_path in &paths {
        if !Path::new(src_path).exists() { continue; }
        let src_conn = Connection::open(src_path).map_err(|e| e.to_string())?;
        let mut stmt = src_conn.prepare("SELECT domain, timestamp, status FROM history")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?))
        }).map_err(|e| e.to_string())?;

        for row in rows {
            let (domain, timestamp, status) = row.map_err(|e| e.to_string())?;
            dest_conn.execute(
                "INSERT INTO history(domain, timestamp, status) VALUES(?, ?, ?)",
                rusqlite::params![domain, timestamp, status],
            ).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// ─── Cache Commands ──────────────────────────────────────────────────────────

#[tauri::command]
async fn db_gui_cache_get<R: Runtime>(app_handle: tauri::AppHandle<R>, key: String, ttl_ms: Option<u64>) -> Result<Option<String>, String> {
    let mut path = get_profile_dir(&app_handle, "default")?;
    path.push("request-cache.sqlite");
    db_cache_get(&path.to_string_lossy(), &key, ttl_ms)
}

#[tauri::command]
async fn db_gui_cache_set<R: Runtime>(app_handle: tauri::AppHandle<R>, key: String, response: String, max_entries: Option<u32>) -> Result<(), String> {
    let mut path = get_profile_dir(&app_handle, "default")?;
    path.push("request-cache.sqlite");
    db_cache_set(&path.to_string_lossy(), &key, &response, max_entries)
}

#[tauri::command]
async fn db_gui_cache_clear<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let mut path = get_profile_dir(&app_handle, "default")?;
    path.push("request-cache.sqlite");
    if !path.exists() { return Ok(()); }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cache", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn cache_merge<R: Runtime>(app_handle: tauri::AppHandle<R>, paths: Vec<String>) -> Result<(), String> {
    let mut dest_path = get_profile_dir(&app_handle, "default")?;
    dest_path.push("request-cache.sqlite");

    let dest_conn = Connection::open(&dest_path).map_err(|e| e.to_string())?;
    dest_conn.execute(
        "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)",
        [],
    ).map_err(|e| e.to_string())?;

    for src_path in &paths {
        if !Path::new(src_path).exists() { continue; }
        let src_conn = Connection::open(src_path).map_err(|e| e.to_string())?;
        let mut stmt = src_conn.prepare("SELECT key, response, timestamp FROM cache")
            .map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, i64>(2)?))
        }).map_err(|e| e.to_string())?;

        for row in rows {
            let (key, response, timestamp) = row.map_err(|e| e.to_string())?;
            dest_conn.execute(
                "INSERT OR REPLACE INTO cache(key, response, timestamp) VALUES(?, ?, ?)",
                rusqlite::params![key, response, timestamp],
            ).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

// ─── Bulk WHOIS Commands ─────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct BulkProgress {
    sent: u32,
    total: u32,
}

#[derive(Serialize, Deserialize, Clone)]
struct BulkResult {
    domain: String,
    data: Option<String>,
    error: Option<String>,
    status: String,
    params: Option<WhoisParams>,
}

#[tauri::command]
async fn bulk_whois_lookup<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: State<'_, AppData>,
    domains: Vec<String>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    {
        let mut state = data.bulk_state.lock().await;
        state.paused = false;
        state.stopped = false;
    }

    let total = domains.len() as u32;
    let semaphore = Arc::new(Semaphore::new(concurrency));
    let mut tasks = Vec::new();
    let sent_counter = Arc::new(tokio::sync::Mutex::new(0u32));

    for domain in domains {
        let sem = Arc::clone(&semaphore);
        let app = app_handle.clone();
        let sent = Arc::clone(&sent_counter);
        let bulk_state = Arc::clone(&data.bulk_state);

        tasks.push(tokio::spawn(async move {
            // Check stopped
            {
                let state = bulk_state.lock().await;
                if state.stopped {
                    return BulkResult { domain, data: None, error: Some("Stopped".into()), status: "error".into(), params: None };
                }
            }
            // Wait while paused
            loop {
                let state = bulk_state.lock().await;
                if state.stopped {
                    return BulkResult { domain, data: None, error: Some("Stopped".into()), status: "error".into(), params: None };
                }
                if !state.paused { break; }
                drop(state);
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            }

            let _permit = sem.acquire().await.unwrap();

            let (data_val, err, status, params) = match perform_lookup(&domain, timeout_ms).await {
                Ok(res) => {
                    let s = is_domain_available(&res);
                    let p = get_domain_parameters(Some(domain.clone()), Some(s.clone()), res.clone());
                    let s_str = serde_json::to_value(&s).unwrap().as_str().unwrap_or("unavailable").to_string();
                    (Some(res), None, s_str, Some(p))
                },
                Err(e) => (None, Some(e.to_string()), "error".to_string(), None),
            };

            let mut s = sent.lock().await;
            *s += 1;
            let _ = app.emit("bulk:status", BulkProgress { sent: *s, total });

            BulkResult { domain, data: data_val, error: err, status, params }
        }));
    }

    let results = join_all(tasks).await;
    Ok(results.into_iter().filter_map(|r| r.ok()).collect())
}

#[tauri::command]
async fn bulk_whois_pause(data: State<'_, AppData>) -> Result<(), String> {
    data.bulk_state.lock().await.paused = true;
    Ok(())
}

#[tauri::command]
async fn bulk_whois_continue(data: State<'_, AppData>) -> Result<(), String> {
    data.bulk_state.lock().await.paused = false;
    Ok(())
}

#[tauri::command]
async fn bulk_whois_stop(data: State<'_, AppData>) -> Result<(), String> {
    let mut state = data.bulk_state.lock().await;
    state.stopped = true;
    state.paused = false;
    Ok(())
}

// ─── Export Commands ─────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[allow(dead_code)]
struct ExportOpts {
    filetype: String,
    #[serde(rename = "whoisreply", default)]
    whois_reply: String,
    #[serde(default)]
    domains: String,
    #[serde(default)]
    errors: String,
    #[serde(default)]
    information: String,
}

#[tauri::command]
async fn bulk_whois_export(
    results: Vec<BulkResult>,
    options: ExportOpts,
    path: String,
) -> Result<(), String> {
    let include_whois = options.filetype == "txt" || options.whois_reply.contains("yes");

    if include_whois {
        let file = fs::File::create(&path).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipWriter::new(file);
        let zip_opts = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

        if options.filetype == "csv" {
            zip.start_file("results.csv", zip_opts).map_err(|e| e.to_string())?;
            zip.write_all(build_csv(&results).as_bytes()).map_err(|e| e.to_string())?;
        }

        for r in &results {
            if let Some(data) = &r.data {
                zip.start_file(format!("{}.txt", r.domain), zip_opts).map_err(|e| e.to_string())?;
                zip.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
            }
        }
        zip.finish().map_err(|e| e.to_string())?;
    } else {
        fs::write(path, build_csv(&results)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn build_csv(results: &[BulkResult]) -> String {
    let mut csv = String::from("\"Domain\",\"Status\",\"Registrar\",\"Company\",\"Creation Date\",\"Expiry Date\"\n");
    for r in results {
        let reg = r.params.as_ref().and_then(|p| p.registrar.as_deref()).unwrap_or("");
        let co = r.params.as_ref().and_then(|p| p.company.as_deref()).unwrap_or("");
        let cr = r.params.as_ref().and_then(|p| p.creation_date.as_deref()).unwrap_or("");
        let ex = r.params.as_ref().and_then(|p| p.expiry_date.as_deref()).unwrap_or("");
        csv.push_str(&format!("\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n", r.domain, r.status, reg, co, cr, ex));
    }
    csv
}

// ─── Settings Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn settings_load<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?.join(&filename);
    if !path.exists() { return Ok("{}".to_string()); }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn settings_save<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String, content: String) -> Result<(), String> {
    let path = get_user_data_dir(&app_handle)?.join(&filename);
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn config_delete<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String) -> Result<(), String> {
    let path = get_user_data_dir(&app_handle)?.join(&filename);
    if path.exists() { fs::remove_file(path).map_err(|e| e.to_string())?; }
    Ok(())
}

// ─── Profiles Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn profiles_list<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<Vec<ProfileEntry>, String> {
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    if !profiles_dir.exists() {
        let _ = fs::create_dir_all(profiles_dir.join("default"));
    }

    let entries = fs::read_dir(&profiles_dir).map_err(|e| e.to_string())?;
    let mut profiles = Vec::new();

    for entry in entries.flatten() {
        if entry.path().is_dir() {
            let name = entry.file_name().into_string().unwrap_or_default();
            let mtime = entry.path().join("settings.json").metadata().ok()
                .and_then(|m| epoch_ms_from_metadata(&m));
            profiles.push(ProfileEntry { id: name.clone(), name, file: entry.path().to_string_lossy().to_string(), mtime });
        }
    }

    if profiles.is_empty() {
        let default_dir = profiles_dir.join("default");
        let _ = fs::create_dir_all(&default_dir);
        profiles.push(ProfileEntry { id: "default".into(), name: "default".into(), file: default_dir.to_string_lossy().into(), mtime: None });
    }

    Ok(profiles)
}

#[tauri::command]
async fn profiles_create<R: Runtime>(app_handle: tauri::AppHandle<R>, name: String, copy_current: Option<bool>) -> Result<ProfileEntry, String> {
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let new_dir = profiles_dir.join(&name);
    fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?;

    if copy_current.unwrap_or(false) {
        let current = profiles_dir.join("default");
        if current.exists() {
            for entry in fs::read_dir(&current).map_err(|e| e.to_string())?.flatten() {
                let _ = fs::copy(entry.path(), new_dir.join(entry.file_name()));
            }
        }
    }

    Ok(ProfileEntry { id: name.clone(), name, file: new_dir.to_string_lossy().into(), mtime: None })
}

#[tauri::command]
async fn profiles_rename<R: Runtime>(app_handle: tauri::AppHandle<R>, id: String, new_name: String) -> Result<(), String> {
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let old = profiles_dir.join(&id);
    let new_path = profiles_dir.join(&new_name);
    if old.exists() { fs::rename(old, new_path).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
async fn profiles_delete<R: Runtime>(app_handle: tauri::AppHandle<R>, id: String) -> Result<(), String> {
    if id == "default" { return Err("Cannot delete the default profile".into()); }
    let dir = get_user_data_dir(&app_handle)?.join("profiles").join(&id);
    if dir.exists() { fs::remove_dir_all(dir).map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
async fn profiles_set_current<R: Runtime>(app_handle: tauri::AppHandle<R>, id: String) -> Result<(), String> {
    let path = get_user_data_dir(&app_handle)?.join("current-profile");
    fs::write(path, &id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn profiles_export<R: Runtime>(app_handle: tauri::AppHandle<R>, id: Option<String>) -> Result<String, String> {
    let profile_id = id.unwrap_or_else(|| "default".into());
    let profile_dir = get_profile_dir(&app_handle, &profile_id)?;

    let zip_path = get_user_data_dir(&app_handle)?.join(format!("profile-export-{}.zip", profile_id));
    let file = fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let zip_opts = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in WalkDir::new(&profile_dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let rel = entry.path().strip_prefix(&profile_dir).map_err(|e| e.to_string())?;
            zip.start_file(rel.to_string_lossy(), zip_opts).map_err(|e| e.to_string())?;
            zip.write_all(&fs::read(entry.path()).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn config_export<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?.join("settings.json");
    if path.exists() { fs::read_to_string(path).map_err(|e| e.to_string()) } else { Ok("{}".into()) }
}

#[tauri::command]
async fn config_import<R: Runtime>(app_handle: tauri::AppHandle<R>, content: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&content).map_err(|e| format!("Invalid JSON: {}", e))?;
    let path = get_user_data_dir(&app_handle)?.join("settings.json");
    fs::write(path, content).map_err(|e| e.to_string())
}

// ─── Text Operations (Tools) Commands ────────────────────────────────────────

#[derive(Deserialize)]
struct ProcessOptions {
    prefix: Option<String>,
    suffix: Option<String>,
    #[serde(rename = "trimSpaces")]
    trim_spaces: Option<bool>,
    #[serde(rename = "deleteBlankLines")]
    delete_blank_lines: Option<bool>,
    dedupe: Option<bool>,
    sort: Option<String>,
}

#[tauri::command]
async fn to_process(content: String, options: ProcessOptions) -> Result<String, String> {
    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();

    if let Some(ref prefix) = options.prefix {
        lines = lines.into_iter().map(|l| format!("{}{}", prefix, l)).collect();
    }
    if let Some(ref suffix) = options.suffix {
        lines = lines.into_iter().map(|l| format!("{}{}", l, suffix)).collect();
    }
    if options.trim_spaces.unwrap_or(false) {
        lines = lines.into_iter().map(|l| l.trim().to_string()).collect();
    }
    if options.delete_blank_lines.unwrap_or(false) {
        lines.retain(|l| !l.trim().is_empty());
    }
    if options.dedupe.unwrap_or(false) {
        let mut seen = std::collections::HashSet::new();
        lines.retain(|l| seen.insert(l.clone()));
    }

    match options.sort.as_deref() {
        Some("asc") => lines.sort(),
        Some("desc") => lines.sort_by(|a, b| b.cmp(a)),
        Some("random") => {
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            lines.sort_by(|a, b| {
                let mut ha = DefaultHasher::new();
                a.hash(&mut ha);
                let mut hb = DefaultHasher::new();
                b.hash(&mut hb);
                ha.finish().cmp(&hb.finish())
            });
        }
        _ => {}
    }

    Ok(lines.join("\n"))
}

// ─── CSV Parse Command ──────────────────────────────────────────────────────

#[tauri::command]
async fn csv_parse(content: String) -> Result<serde_json::Value, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(content.as_bytes());

    let headers: Vec<String> = reader.headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(|h| h.to_string())
        .collect();

    let mut records = Vec::new();
    for result in reader.records() {
        let record = result.map_err(|e| e.to_string())?;
        let mut map = serde_json::Map::new();
        for (i, field) in record.iter().enumerate() {
            let key = headers.get(i).cloned().unwrap_or_else(|| format!("col{}", i));
            map.insert(key, serde_json::Value::String(field.to_string()));
        }
        records.push(serde_json::Value::Object(map));
    }

    Ok(serde_json::Value::Array(records))
}

// ─── BWA Analyser Commands ──────────────────────────────────────────────────

#[tauri::command]
async fn bwa_analyser_start(data: serde_json::Value) -> Result<serde_json::Value, String> {
    let results = data.as_object().ok_or("Invalid data")?;

    let domains = results.get("domain")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect::<Vec<_>>())
        .unwrap_or_default();

    let statuses = results.get("status")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect::<Vec<_>>())
        .unwrap_or_default();

    let total = domains.len();
    let available = statuses.iter().filter(|s| s.as_str() == "available").count();
    let unavailable = statuses.iter().filter(|s| s.as_str() == "unavailable").count();
    let errors = statuses.iter().filter(|s| s.starts_with("error")).count();

    Ok(serde_json::json!({
        "total": total,
        "available": available,
        "unavailable": unavailable,
        "errors": errors,
        "availablePercent": if total > 0 { (available as f64 / total as f64) * 100.0 } else { 0.0 },
        "domains": domains,
        "statuses": statuses,
    }))
}

// ─── Stats Commands ──────────────────────────────────────────────────────────

fn get_dir_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.metadata().ok())
        .filter(|metadata| metadata.is_file())
        .map(|metadata| metadata.len())
        .sum()
}

async fn compute_stats_internal(config_path: String, data_path: String) -> AppStats {
    let config_p = Path::new(&config_path);
    let data_p = Path::new(&data_path);

    let mut mtime = None;
    let mut loaded = false;
    let mut config_size = 0;
    let mut read_write = false;

    if let Ok(metadata) = fs::metadata(config_p) {
        loaded = true;
        config_size = metadata.len();
        mtime = epoch_ms_from_metadata(&metadata);
        if fs::OpenOptions::new().read(true).write(true).open(config_p).is_ok() {
            read_write = true;
        }
    }

    let size = if data_p.exists() { get_dir_size(data_p) } else { 0 };

    AppStats { mtime, loaded, size, config_path, config_size, read_write, data_path }
}

#[tauri::command]
async fn stats_get(config_path: String, data_path: String) -> Result<AppStats, String> {
    Ok(compute_stats_internal(config_path, data_path).await)
}

#[tauri::command]
async fn stats_start<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: State<'_, AppData>,
    config_path: String,
    data_path: String,
) -> Result<u32, String> {
    let id = {
        let mut watchers = data.stats_watchers.lock().unwrap();
        let mut next_id = data.next_watcher_id.lock().unwrap();
        let id = *next_id;
        *next_id += 1;
        watchers.insert(id, StatsWatcher { config_path: config_path.clone(), data_path: data_path.clone() });
        id
    };

    let stats = compute_stats_internal(config_path, data_path).await;
    let _ = app_handle.emit("stats:update", stats);
    Ok(id)
}

#[tauri::command]
async fn stats_refresh<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: State<'_, AppData>,
    id: u32,
) -> Result<(), String> {
    let watcher = {
        let watchers = data.stats_watchers.lock().unwrap();
        watchers.get(&id).map(|w| (w.config_path.clone(), w.data_path.clone()))
    };

    if let Some((config_path, data_path)) = watcher {
        let stats = compute_stats_internal(config_path, data_path).await;
        let _ = app_handle.emit("stats:update", stats);
    }
    Ok(())
}

#[tauri::command]
async fn stats_stop(data: State<'_, AppData>, id: u32) -> Result<(), String> {
    data.stats_watchers.lock().unwrap().remove(&id);
    Ok(())
}

// ─── Monitor Commands ────────────────────────────────────────────────────────

#[tauri::command]
async fn monitor_start<R: Runtime>(app_handle: tauri::AppHandle<R>, data: State<'_, AppData>) -> Result<(), String> {
    let mut monitor = data.monitor.lock().await;
    if monitor.active { return Ok(()); }

    let (tx, mut rx) = tokio::sync::oneshot::channel();
    monitor.active = true;
    monitor.cancel_token = Some(tx);

    let app = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::select! {
                _ = &mut rx => break,
                _ = tokio::time::sleep(tokio::time::Duration::from_secs(60)) => {
                    let _ = app.emit("monitor:heartbeat", ());
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn monitor_stop(data: State<'_, AppData>) -> Result<(), String> {
    let mut monitor = data.monitor.lock().await;
    if let Some(tx) = monitor.cancel_token.take() {
        let _ = tx.send(());
    }
    monitor.active = false;
    Ok(())
}

#[tauri::command]
async fn monitor_lookup<R: Runtime>(app_handle: tauri::AppHandle<R>, domain: String) -> Result<(), String> {
    let result = perform_lookup(&domain, 10000).await;
    let status = match result {
        Ok(ref res) => serde_json::to_value(is_domain_available(res)).unwrap().as_str().unwrap_or("unavailable").to_string(),
        Err(_) => "error".to_string(),
    };
    let _ = app_handle.emit("monitor:update", serde_json::json!({ "domain": domain, "status": status }));
    Ok(())
}

// ─── Path Commands ───────────────────────────────────────────────────────────

#[tauri::command]
async fn path_join(parts: Vec<String>) -> String {
    let mut result = PathBuf::new();
    for p in parts { result.push(p); }
    result.to_string_lossy().to_string()
}

#[tauri::command]
async fn path_basename(path: String) -> String {
    Path::new(&path).file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default()
}

// ─── Main ────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .manage(AppData {
            stats_watchers: Mutex::new(HashMap::new()),
            next_watcher_id: Mutex::new(1),
            monitor: AsyncMutex::new(MonitorState { active: false, cancel_token: None }),
            bulk_state: Arc::new(AsyncMutex::new(BulkLookupState { paused: false, stopped: false })),
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // WHOIS lookups
            whois_lookup,
            dns_lookup_cmd,
            rdap_lookup_cmd,
            availability_check,
            availability_params,
            // FS operations
            fs_read_file,
            fs_exists,
            fs_stat,
            fs_readdir,
            fs_unlink,
            fs_access,
            fs_write_file,
            fs_mkdir,
            // Shell
            shell_open_path,
            // I18n
            i18n_load,
            // App paths
            app_get_base_dir,
            app_get_user_data_path,
            // History
            db_gui_history_get,
            db_gui_history_clear,
            history_merge,
            // Cache
            db_gui_cache_get,
            db_gui_cache_set,
            db_gui_cache_clear,
            cache_merge,
            // Bulk WHOIS
            bulk_whois_lookup,
            bulk_whois_pause,
            bulk_whois_continue,
            bulk_whois_stop,
            bulk_whois_export,
            // Settings
            settings_load,
            settings_save,
            config_delete,
            config_export,
            config_import,
            // Profiles
            profiles_list,
            profiles_create,
            profiles_rename,
            profiles_delete,
            profiles_set_current,
            profiles_export,
            // Stats
            stats_get,
            stats_start,
            stats_refresh,
            stats_stop,
            // Monitor
            monitor_start,
            monitor_stop,
            monitor_lookup,
            // Text operations
            to_process,
            // CSV
            csv_parse,
            // BWA
            bwa_analyser_start,
            // Path
            path_join,
            path_basename
        ])
        .setup(|app| {
            // Ensure default profile directory exists
            if let Ok(data_dir) = app.path().app_data_dir() {
                let _ = fs::create_dir_all(data_dir.join("profiles").join("default"));
            }

            // Show main window after setup
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    // ── Stats helpers ────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_compute_stats_internal() {
        let stats = compute_stats_internal("non_existent.json".into(), ".".into()).await;
        assert!(!stats.loaded);
        assert!(stats.size > 0);
    }

    #[tokio::test]
    async fn test_compute_stats_with_real_config() {
        let dir = std::env::temp_dir().join("wd_test_stats");
        let _ = fs::create_dir_all(&dir);
        let cfg_path = dir.join("test_config.json");
        fs::write(&cfg_path, r#"{"test": true}"#).unwrap();

        let stats = compute_stats_internal(
            cfg_path.to_string_lossy().to_string(),
            dir.to_string_lossy().to_string(),
        ).await;

        assert!(stats.loaded);
        assert!(stats.config_size > 0);
        assert!(stats.read_write);
        assert!(stats.mtime.is_some());
        assert!(stats.size > 0);

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_compute_stats_unreadable_data_path() {
        let stats = compute_stats_internal(
            "non_existent.json".into(),
            "/non/existent/data/dir".into(),
        ).await;
        assert!(!stats.loaded);
        assert_eq!(stats.size, 0);
    }

    // ── Path helpers ─────────────────────────────────────────────────────

    #[test]
    fn test_path_basename_works() {
        let p = Path::new("/foo/bar/baz.txt");
        assert_eq!(p.file_name().unwrap().to_str().unwrap(), "baz.txt");
    }

    #[test]
    fn test_path_basename_no_extension() {
        let p = Path::new("/foo/bar/readme");
        assert_eq!(p.file_name().unwrap().to_str().unwrap(), "readme");
    }

    #[test]
    fn test_path_basename_root() {
        let p = Path::new("/");
        assert!(p.file_name().is_none());
    }

    #[test]
    fn test_path_basename_dotfile() {
        let p = Path::new("/home/.config");
        assert_eq!(p.file_name().unwrap().to_str().unwrap(), ".config");
    }

    // ── CSV builder ──────────────────────────────────────────────────────

    #[test]
    fn test_build_csv_empty() {
        let csv = build_csv(&[]);
        assert!(csv.starts_with("\"Domain\""));
        assert_eq!(csv.lines().count(), 1);
    }

    #[test]
    fn test_build_csv_single_result() {
        let results = vec![BulkResult {
            domain: "example.com".into(),
            data: Some("raw whois".into()),
            error: None,
            status: "unavailable".into(),
            params: Some(WhoisParams {
                domain: Some("example.com".into()),
                status: None,
                registrar: Some("GoDaddy".into()),
                company: Some("ACME Corp".into()),
                creation_date: Some("2020-01-01".into()),
                update_date: None,
                expiry_date: Some("2030-01-01".into()),
                whoisreply: None,
            }),
        }];
        let csv = build_csv(&results);
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].contains("Domain"));
        assert!(lines[1].contains("example.com"));
        assert!(lines[1].contains("GoDaddy"));
        assert!(lines[1].contains("ACME Corp"));
        assert!(lines[1].contains("2020-01-01"));
        assert!(lines[1].contains("2030-01-01"));
    }

    #[test]
    fn test_build_csv_multiple_results() {
        let results = vec![
            BulkResult {
                domain: "a.com".into(),
                data: None,
                error: Some("timeout".into()),
                status: "error".into(),
                params: None,
            },
            BulkResult {
                domain: "b.com".into(),
                data: Some("data".into()),
                error: None,
                status: "available".into(),
                params: None,
            },
        ];
        let csv = build_csv(&results);
        assert_eq!(csv.lines().count(), 3); // header + 2 rows
        assert!(csv.contains("a.com"));
        assert!(csv.contains("b.com"));
    }

    #[test]
    fn test_build_csv_no_params() {
        let results = vec![BulkResult {
            domain: "x.com".into(),
            data: None,
            error: None,
            status: "available".into(),
            params: None,
        }];
        let csv = build_csv(&results);
        // Should still produce valid CSV with empty fields
        assert!(csv.contains("x.com"));
        assert!(csv.contains("available"));
    }

    #[test]
    fn test_build_csv_special_characters_in_domain() {
        let results = vec![BulkResult {
            domain: "éxàmple.com".into(),
            data: None,
            error: None,
            status: "unavailable".into(),
            params: None,
        }];
        let csv = build_csv(&results);
        assert!(csv.contains("éxàmple.com"));
    }

    // ── FS commands (unit-testable without Tauri) ────────────────────────

    #[tokio::test]
    async fn test_fs_read_file_success() {
        let dir = std::env::temp_dir().join("wd_test_fs_read");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "hello world").unwrap();

        let result = fs_read_file(file.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "hello world");

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_read_file_not_found() {
        let result = fs_read_file("/non/existent/file.txt".into()).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fs_exists() {
        let dir = std::env::temp_dir().join("wd_test_fs_exists");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "data").unwrap();

        assert!(fs_exists(file.to_string_lossy().to_string()).await);
        assert!(!fs_exists("/non/existent/file.txt".into()).await);

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_stat() {
        let dir = std::env::temp_dir().join("wd_test_fs_stat");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "12345").unwrap();

        let result = fs_stat(file.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        let stat = result.unwrap();
        assert_eq!(stat.size, 5);
        assert!(stat.is_file);
        assert!(!stat.is_directory);
        assert!(stat.mtime_ms > 0);

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_stat_directory() {
        let dir = std::env::temp_dir().join("wd_test_fs_stat_dir");
        let _ = fs::create_dir_all(&dir);

        let result = fs_stat(dir.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        let stat = result.unwrap();
        assert!(stat.is_directory);
        assert!(!stat.is_file);

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_readdir() {
        let dir = std::env::temp_dir().join("wd_test_fs_readdir");
        let _ = fs::create_dir_all(&dir);
        fs::write(dir.join("a.txt"), "").unwrap();
        fs::write(dir.join("b.txt"), "").unwrap();

        let result = fs_readdir(dir.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        let names = result.unwrap();
        assert!(names.contains(&"a.txt".to_string()));
        assert!(names.contains(&"b.txt".to_string()));

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_write_and_unlink() {
        let dir = std::env::temp_dir().join("wd_test_fs_write");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("output.txt");

        let write_result = fs_write_file(
            file.to_string_lossy().to_string(),
            "test content".into(),
        ).await;
        assert!(write_result.is_ok());
        assert_eq!(fs::read_to_string(&file).unwrap(), "test content");

        let unlink_result = fs_unlink(file.to_string_lossy().to_string()).await;
        assert!(unlink_result.is_ok());
        assert!(!file.exists());

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_write_creates_parent_dirs() {
        let dir = std::env::temp_dir().join("wd_test_fs_mkdir_write");
        let _ = fs::remove_dir_all(&dir);
        let file = dir.join("sub").join("deep").join("file.txt");

        let result = fs_write_file(
            file.to_string_lossy().to_string(),
            "nested".into(),
        ).await;
        assert!(result.is_ok());
        assert_eq!(fs::read_to_string(&file).unwrap(), "nested");

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_access_exists() {
        let dir = std::env::temp_dir().join("wd_test_fs_access");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "data").unwrap();

        assert!(fs_access(file.to_string_lossy().to_string()).await.is_ok());
        assert!(fs_access("/non/existent".into()).await.is_err());

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_mkdir() {
        let dir = std::env::temp_dir().join("wd_test_fs_mkdir").join("a").join("b");
        let _ = fs::remove_dir_all(std::env::temp_dir().join("wd_test_fs_mkdir"));

        let result = fs_mkdir(dir.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(dir.exists());

        let _ = fs::remove_dir_all(std::env::temp_dir().join("wd_test_fs_mkdir"));
    }

    // ── Text processing (to_process) ─────────────────────────────────────

    #[tokio::test]
    async fn test_to_process_no_options() {
        let result = to_process(
            "hello\nworld".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: None,
                sort: None,
            },
        ).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "hello\nworld");
    }

    #[tokio::test]
    async fn test_to_process_prefix() {
        let result = to_process(
            "a\nb".into(),
            ProcessOptions {
                prefix: Some("www.".into()),
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: None,
                sort: None,
            },
        ).await;
        assert_eq!(result.unwrap(), "www.a\nwww.b");
    }

    #[tokio::test]
    async fn test_to_process_suffix() {
        let result = to_process(
            "a\nb".into(),
            ProcessOptions {
                prefix: None,
                suffix: Some(".com".into()),
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: None,
                sort: None,
            },
        ).await;
        assert_eq!(result.unwrap(), "a.com\nb.com");
    }

    #[tokio::test]
    async fn test_to_process_trim_spaces() {
        let result = to_process(
            "  hello  \n  world  ".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: Some(true),
                delete_blank_lines: None,
                dedupe: None,
                sort: None,
            },
        ).await;
        assert_eq!(result.unwrap(), "hello\nworld");
    }

    #[tokio::test]
    async fn test_to_process_delete_blank_lines() {
        let result = to_process(
            "a\n\n  \nb".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: Some(true),
                dedupe: None,
                sort: None,
            },
        ).await;
        assert_eq!(result.unwrap(), "a\nb");
    }

    #[tokio::test]
    async fn test_to_process_dedupe() {
        let result = to_process(
            "a\nb\na\nc\nb".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: Some(true),
                sort: None,
            },
        ).await;
        assert_eq!(result.unwrap(), "a\nb\nc");
    }

    #[tokio::test]
    async fn test_to_process_sort_asc() {
        let result = to_process(
            "cherry\napple\nbanana".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: None,
                sort: Some("asc".into()),
            },
        ).await;
        assert_eq!(result.unwrap(), "apple\nbanana\ncherry");
    }

    #[tokio::test]
    async fn test_to_process_sort_desc() {
        let result = to_process(
            "cherry\napple\nbanana".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: None,
                sort: Some("desc".into()),
            },
        ).await;
        assert_eq!(result.unwrap(), "cherry\nbanana\napple");
    }

    #[tokio::test]
    async fn test_to_process_sort_random() {
        let result = to_process(
            "a\nb\nc\nd\ne".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: None,
                sort: Some("random".into()),
            },
        ).await;
        let output = result.unwrap();
        let mut sorted: Vec<&str> = output.lines().collect();
        sorted.sort();
        assert_eq!(sorted, vec!["a", "b", "c", "d", "e"]);
    }

    #[tokio::test]
    async fn test_to_process_combined() {
        let result = to_process(
            "  b  \n  a  \n  b  \n\n  c  ".into(),
            ProcessOptions {
                prefix: None,
                suffix: None,
                trim_spaces: Some(true),
                delete_blank_lines: Some(true),
                dedupe: Some(true),
                sort: Some("asc".into()),
            },
        ).await;
        assert_eq!(result.unwrap(), "a\nb\nc");
    }

    #[tokio::test]
    async fn test_to_process_empty_input() {
        let result = to_process(
            "".into(),
            ProcessOptions {
                prefix: Some("x".into()),
                suffix: None,
                trim_spaces: None,
                delete_blank_lines: None,
                dedupe: None,
                sort: None,
            },
        ).await;
        // Empty string produces no lines in Rust (.lines() on "" → empty iter)
        assert_eq!(result.unwrap(), "");
    }

    // ── CSV parse ────────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_csv_parse_basic() {
        let result = csv_parse("name,age\nAlice,30\nBob,25".into()).await;
        assert!(result.is_ok());
        let arr = result.unwrap();
        let records = arr.as_array().unwrap();
        assert_eq!(records.len(), 2);
        assert_eq!(records[0]["name"], "Alice");
        assert_eq!(records[0]["age"], "30");
        assert_eq!(records[1]["name"], "Bob");
    }

    #[tokio::test]
    async fn test_csv_parse_empty() {
        let result = csv_parse("name,age\n".into()).await;
        assert!(result.is_ok());
        let arr = result.unwrap();
        assert_eq!(arr.as_array().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn test_csv_parse_single_column() {
        let result = csv_parse("domain\nexample.com\ntest.net".into()).await;
        assert!(result.is_ok());
        let arr = result.unwrap();
        assert_eq!(arr.as_array().unwrap().len(), 2);
        assert_eq!(arr[0]["domain"], "example.com");
    }

    #[tokio::test]
    async fn test_csv_parse_quoted_fields() {
        let result = csv_parse(r#"name,desc
"Alice","Has a, comma"
"Bob","Has ""quotes"""
"#.into()).await;
        assert!(result.is_ok());
        let arr = result.unwrap();
        let records = arr.as_array().unwrap();
        assert_eq!(records[0]["desc"], "Has a, comma");
        assert_eq!(records[1]["desc"], r#"Has "quotes""#);
    }

    // ── BWA analyser ─────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_bwa_analyser_basic() {
        let data = serde_json::json!({
            "domain": ["a.com", "b.com", "c.com", "d.com"],
            "status": ["available", "unavailable", "available", "error:timeout"]
        });
        let result = bwa_analyser_start(data).await;
        assert!(result.is_ok());
        let res = result.unwrap();
        assert_eq!(res["total"], 4);
        assert_eq!(res["available"], 2);
        assert_eq!(res["unavailable"], 1);
        assert_eq!(res["errors"], 1);
        assert!((res["availablePercent"].as_f64().unwrap() - 50.0).abs() < 0.1);
    }

    #[tokio::test]
    async fn test_bwa_analyser_empty() {
        let data = serde_json::json!({
            "domain": [],
            "status": []
        });
        let result = bwa_analyser_start(data).await;
        assert!(result.is_ok());
        let res = result.unwrap();
        assert_eq!(res["total"], 0);
        assert_eq!(res["available"], 0);
        assert_eq!(res["availablePercent"], 0.0);
    }

    #[tokio::test]
    async fn test_bwa_analyser_all_available() {
        let data = serde_json::json!({
            "domain": ["a.com", "b.com"],
            "status": ["available", "available"]
        });
        let result = bwa_analyser_start(data).await.unwrap();
        assert_eq!(result["total"], 2);
        assert_eq!(result["available"], 2);
        assert!((result["availablePercent"].as_f64().unwrap() - 100.0).abs() < 0.1);
    }

    #[tokio::test]
    async fn test_bwa_analyser_invalid_data() {
        let data = serde_json::json!("not an object");
        let result = bwa_analyser_start(data).await;
        assert!(result.is_err());
    }

    // ── Availability check ───────────────────────────────────────────────

    #[tokio::test]
    async fn test_availability_check_available() {
        let result = availability_check("No match for domain example.com".into()).await;
        assert_eq!(result, "available");
    }

    #[tokio::test]
    async fn test_availability_check_unavailable() {
        let result = availability_check("Domain Status:ok\nExpiry Date: 2030-01-01".into()).await;
        assert_eq!(result, "unavailable");
    }

    #[tokio::test]
    async fn test_availability_check_empty() {
        let result = availability_check("".into()).await;
        // Empty defaults to unavailable in Rust backend
        assert_eq!(result, "unavailable");
    }

    #[tokio::test]
    async fn test_availability_check_rate_limiting() {
        let result = availability_check("Uniregistry Query limit exceeded".into()).await;
        assert_eq!(result, "error:ratelimiting");
    }

    // ── Availability params ──────────────────────────────────────────────

    #[tokio::test]
    async fn test_availability_params_extracts_registrar() {
        let text = "Registrar: GoDaddy LLC\nCreation Date: 2020-01-01";
        let params = availability_params(
            Some("example.com".into()),
            Some(DomainStatus::Unavailable),
            text.into(),
        ).await;
        assert_eq!(params.domain, Some("example.com".into()));
        assert_eq!(params.registrar, Some("GoDaddy LLC".into()));
        assert_eq!(params.creation_date, Some("2020-01-01".into()));
    }

    #[tokio::test]
    async fn test_availability_params_empty_text() {
        let params = availability_params(None, None, "".into()).await;
        assert!(params.registrar.is_none());
        assert!(params.company.is_none());
        assert!(params.creation_date.is_none());
    }

    // ── Epoch helper ─────────────────────────────────────────────────────

    #[test]
    fn test_epoch_ms_from_metadata() {
        let dir = std::env::temp_dir().join("wd_test_epoch");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "data").unwrap();
        let metadata = fs::metadata(&file).unwrap();

        let ms = epoch_ms_from_metadata(&metadata);
        assert!(ms.is_some());
        assert!(ms.unwrap() > 0);

        let _ = fs::remove_dir_all(&dir);
    }

    // ── ISO from system time ─────────────────────────────────────────────

    #[test]
    fn test_iso_from_system_time() {
        let time = std::time::SystemTime::now();
        let iso = iso_from_system_time(time);
        // Should be an RFC3339-like string
        assert!(iso.contains('T'));
        assert!(iso.len() > 10);
    }

    #[test]
    fn test_iso_from_unix_epoch() {
        let epoch = std::time::UNIX_EPOCH;
        let iso = iso_from_system_time(epoch);
        assert!(iso.starts_with("1970-01-01"));
    }

    // ── Bulk export ──────────────────────────────────────────────────────

    #[tokio::test]
    async fn test_bulk_export_csv() {
        let dir = std::env::temp_dir().join("wd_test_export_csv");
        let _ = fs::create_dir_all(&dir);
        let out_path = dir.join("output.csv");

        let results = vec![BulkResult {
            domain: "test.com".into(),
            data: None,
            error: None,
            status: "available".into(),
            params: None,
        }];

        let opts = ExportOpts {
            filetype: "csv".into(),
            whois_reply: "no".into(),
            domains: "".into(),
            errors: "".into(),
            information: "".into(),
        };

        let result = bulk_whois_export(results, opts, out_path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(out_path.exists());

        let content = fs::read_to_string(&out_path).unwrap();
        assert!(content.contains("test.com"));
        assert!(content.contains("Domain"));

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_bulk_export_zip_with_whois_reply() {
        let dir = std::env::temp_dir().join("wd_test_export_zip");
        let _ = fs::create_dir_all(&dir);
        let out_path = dir.join("output.zip");

        let results = vec![BulkResult {
            domain: "example.com".into(),
            data: Some("WHOIS reply data for example.com".into()),
            error: None,
            status: "unavailable".into(),
            params: None,
        }];

        let opts = ExportOpts {
            filetype: "txt".into(),
            whois_reply: "yes".into(),
            domains: "".into(),
            errors: "".into(),
            information: "".into(),
        };

        let result = bulk_whois_export(results, opts, out_path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());
        assert!(out_path.exists());

        // Verify it's a valid ZIP
        let file = fs::File::open(&out_path).unwrap();
        let archive = zip::ZipArchive::new(file).unwrap();
        assert!(archive.len() > 0);

        let _ = fs::remove_dir_all(&dir);
    }

    // ── Settings load/save (unit test without Tauri) ─────────────────────

    #[tokio::test]
    async fn test_settings_roundtrip() {
        let dir = std::env::temp_dir().join("wd_test_settings_rt");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test-settings.json");

        let settings_data = r#"{"theme":{"darkMode":true}}"#;
        fs::write(&file, settings_data).unwrap();

        let content = fs::read_to_string(&file).unwrap();
        assert_eq!(content, settings_data);

        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["theme"]["darkMode"], true);

        let _ = fs::remove_dir_all(&dir);
    }

    // ── FileStat serialization ───────────────────────────────────────────

    #[test]
    fn test_file_stat_serialization() {
        let stat = FileStat {
            size: 1024,
            mtime_ms: 1234567890,
            mtime: Some("2025-01-01T00:00:00Z".into()),
            atime: Some("2025-01-01T00:00:00Z".into()),
            is_directory: false,
            is_file: true,
        };
        let json = serde_json::to_string(&stat).unwrap();
        assert!(json.contains("\"mtimeMs\":1234567890"));
        assert!(json.contains("\"isFile\":true"));
        assert!(json.contains("\"isDirectory\":false"));
    }

    // ── AppStats serialization ───────────────────────────────────────────

    #[test]
    fn test_app_stats_serialization() {
        let stats = AppStats {
            mtime: Some(100),
            loaded: true,
            size: 2048,
            config_path: "/path/config.json".into(),
            config_size: 512,
            read_write: true,
            data_path: "/path/data".into(),
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"configPath\""));
        assert!(json.contains("\"configSize\""));
        assert!(json.contains("\"readWrite\""));
        assert!(json.contains("\"dataPath\""));
    }

    // ── ProfileEntry serialization ───────────────────────────────────────

    #[test]
    fn test_profile_entry_serialization() {
        let entry = ProfileEntry {
            id: "default".into(),
            name: "Default".into(),
            file: "/profiles/default".into(),
            mtime: Some(999),
        };
        let json = serde_json::to_string(&entry).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["id"], "default");
        assert_eq!(parsed["name"], "Default");
        assert_eq!(parsed["mtime"], 999);
    }

    #[test]
    fn test_profile_entry_deserialization() {
        let json = r#"{"id":"test","name":"Test","file":"/test","mtime":null}"#;
        let entry: ProfileEntry = serde_json::from_str(json).unwrap();
        assert_eq!(entry.id, "test");
        assert!(entry.mtime.is_none());
    }

    // ── BulkResult serialization ─────────────────────────────────────────

    #[test]
    fn test_bulk_result_serialization() {
        let result = BulkResult {
            domain: "test.com".into(),
            data: Some("whois data".into()),
            error: None,
            status: "available".into(),
            params: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"domain\":\"test.com\""));
        assert!(json.contains("\"status\":\"available\""));
    }

    // ── get_dir_size ─────────────────────────────────────────────────────

    #[test]
    fn test_get_dir_size() {
        let dir = std::env::temp_dir().join("wd_test_dir_size");
        let _ = fs::create_dir_all(&dir);
        fs::write(dir.join("a.txt"), "12345").unwrap(); // 5 bytes
        fs::write(dir.join("b.txt"), "1234567890").unwrap(); // 10 bytes

        let size = get_dir_size(&dir);
        assert!(size >= 15); // At least our files

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_get_dir_size_empty() {
        let dir = std::env::temp_dir().join("wd_test_dir_size_empty");
        let _ = fs::create_dir_all(&dir);

        let size = get_dir_size(&dir);
        assert_eq!(size, 0);

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_get_dir_size_non_existent() {
        let size = get_dir_size(Path::new("/non/existent/dir"));
        assert_eq!(size, 0);
    }
}
