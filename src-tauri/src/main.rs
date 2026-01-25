// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod parser;
mod availability;

use whois_rust::{WhoIs, WhoIsLookupOptions};
use std::fs;
use std::path::Path;
use serde::{Serialize, Deserialize};
use rusqlite::{params, Connection};
use chrono::Utc;
use tauri::{Manager, Emitter, State, Runtime};
use std::sync::Arc;
use tokio::sync::{Semaphore, Mutex as AsyncMutex};
use futures::future::join_all;
use walkdir::WalkDir;
use std::sync::Mutex;
use std::collections::HashMap;
use availability::{is_domain_available, get_domain_parameters, DomainStatus, WhoisParams};
use tauri_plugin_shell::ShellExt;
use std::io::Write;
use zip::write::SimpleFileOptions;

#[derive(Serialize, Clone)]
struct FileStat {
    size: u64,
    #[serde(rename = "mtimeMs")]
    mtime_ms: u64,
    #[serde(rename = "isDirectory")]
    is_directory: bool,
    #[serde(rename = "isFile")]
    is_file: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct HistoryEntry {
    domain: String,
    timestamp: i64,
    status: String,
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

struct AppData {
    stats_watchers: Mutex<HashMap<u32, StatsWatcher>>,
    next_watcher_id: Mutex<u32>,
    monitor: AsyncMutex<MonitorState>,
}

#[tauri::command]
async fn whois_lookup<R: Runtime>(app_handle: tauri::AppHandle<R>, domain: String) -> Result<String, String> {
    let whois = WhoIs::from_string(&format!(
        "{{\"server\": null, \"port\": 43, \"timeout\": 10000, \"follow\": 0, \"punycode\": false}}"
    )).map_err(|e| e.to_string())?;
    
    let result = whois.lookup(WhoIsLookupOptions::from_string(&domain).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    
    // Log to history
    if let Ok(mut path) = app_handle.path().app_data_dir() {
        path.push("profiles");
        path.push("default");
        let _ = fs::create_dir_all(&path);
        path.push("history-default.sqlite");
        
        let status = is_domain_available(&result);
        let status_str = serde_json::to_value(&status).unwrap().as_str().unwrap_or("unavailable").to_string();

        let _ = db_history_add(path.to_string_lossy().to_string(), domain, status_str).await;
    }
        
    Ok(result)
}

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
    let mtime = metadata.modified() 
        .map_err(|e| e.to_string())? 
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())? 
        .as_millis() as u64;

    Ok(FileStat {
        size: metadata.len(),
        mtime_ms: mtime,
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
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn shell_open_path<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<(), String> {
    app_handle.shell().open(path, None).map_err(|e| e.to_string())
}

#[tauri::command]
async fn i18n_load<R: Runtime>(app_handle: tauri::AppHandle<R>, lang: String) -> Result<String, String> {
    let filename = format!("{}.json", lang);
    
    // In production, locales are in the resource directory
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let mut path = resource_dir.clone();
        path.push("dist");
        path.push("app");
        path.push("locales");
        path.push(&filename);
        
        if path.exists() {
            return fs::read_to_string(path).map_err(|e| e.to_string());
        }
        
        // Try without dist/app if flattened in resource bundle
        let mut path = resource_dir.clone();
        path.push("locales");
        path.push(&filename);
        if path.exists() {
            return fs::read_to_string(path).map_err(|e| e.to_string());
        }
    }

    // Fallback for development (using current working directory)
    let mut path = std::env::current_dir().map_err(|e| e.to_string())?;
    path.push("dist");
    path.push("app");
    path.push("locales");
    path.push(&filename);
    
    if !path.exists() {
        path = std::env::current_dir().map_err(|e| e.to_string())?;
        path.push("app");
        path.push("locales");
        path.push(&filename);
    }

    if !path.exists() {
        return Ok("{}".to_string());
    }

    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn app_get_base_dir<R: Runtime>(_app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    let path = std::env::current_dir().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
async fn app_get_user_data_path<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    let path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path.to_string_lossy().to_string())
}

// Database commands
#[tauri::command]
async fn db_history_add(path: String, domain: String, status: String) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)",
        [],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO history(domain, timestamp, status) VALUES(?, ?, ?)",
        params![domain, Utc::now().timestamp_millis(), status],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn db_history_get(path: String, limit: u32) -> Result<Vec<HistoryEntry>, String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)",
        [],
    ).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT domain, timestamp, status FROM history ORDER BY timestamp DESC LIMIT ?")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([limit], |row| {
        Ok(HistoryEntry {
            domain: row.get(0)?,
            timestamp: row.get(1)?,
            status: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

#[tauri::command]
async fn db_history_clear(path: String) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn db_cache_get(path: String, key: String, ttl_ms: Option<u64>) -> Result<Option<String>, String> {
    if !Path::new(&path).exists() { return Ok(None); }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)",
        [],
    ).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT response, timestamp FROM cache WHERE key = ?")
        .map_err(|e| e.to_string())?;
    
    let mut rows = stmt.query([&key]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let response: String = row.get(0).map_err(|e| e.to_string())?;
        let timestamp: i64 = row.get(1).map_err(|e| e.to_string())?;
        
        if let Some(ttl) = ttl_ms {
            if (Utc::now().timestamp_millis() - timestamp) > ttl as i64 {
                let _ = conn.execute("DELETE FROM cache WHERE key = ?", [&key]);
                return Ok(None);
            }
        }
        return Ok(Some(response));
    }
    
    Ok(None)
}

#[tauri::command]
async fn db_cache_set(path: String, key: String, response: String, max_entries: Option<u32>) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)",
        [],
    ).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT OR REPLACE INTO cache(key, response, timestamp) VALUES(?, ?, ?)",
        params![key, response, Utc::now().timestamp_millis()],
    ).map_err(|e| e.to_string())?;
    
    if let Some(max) = max_entries {
        let count: u32 = conn.query_row("SELECT COUNT(*) FROM cache", [], |r| r.get(0)).map_err(|e| e.to_string())?;
        if count > max {
            let to_delete = count - max;
            conn.execute(
                "DELETE FROM cache WHERE key IN (SELECT key FROM cache ORDER BY timestamp ASC LIMIT ?)",
                [to_delete],
            ).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}

#[tauri::command]
async fn db_cache_clear(path: String) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM cache", []).map_err(|e| e.to_string())?;
    Ok(())
}

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
    domains: Vec<String>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    let total = domains.len() as u32;
    let semaphore = Arc::new(Semaphore::new(concurrency));
    let mut tasks = Vec::new();
    
    let sent_counter = Arc::new(tokio::sync::Mutex::new(0u32));

    for domain in domains {
        let sem = Arc::clone(&semaphore);
        let app = app_handle.clone();
        let sent = Arc::clone(&sent_counter);
        
        tasks.push(tokio::spawn(async move {
            let _permit = sem.acquire().await.unwrap();
            
            let whois = WhoIs::from_string(&format!(
                "{{\"server\": null, \"port\": 43, \"timeout\": {}, \"follow\": 0, \"punycode\": false}}",
                timeout_ms
            )).ok();
            
            let (data, err, status, params) = if let Some(w) = whois {
                match w.lookup(WhoIsLookupOptions::from_string(&domain).unwrap()) {
                    Ok(res) => {
                        let s = is_domain_available(&res);
                        let p = get_domain_parameters(Some(domain.clone()), Some(s.clone()), res.clone());
                        let s_str = serde_json::to_value(&s).unwrap().as_str().unwrap_or("unavailable").to_string();
                        (Some(res), None, s_str, Some(p))
                    },
                    Err(e) => (None, Some(e.to_string()), "error".to_string(), None),
                }
            } else {
                (None, Some("Failed to initialize WHOIS".to_string()), "error".to_string(), None)
            };

            let mut s = sent.lock().await;
            *s += 1;
            let _ = app.emit("bulk:status", BulkProgress { sent: *s, total });
            
            BulkResult {
                domain,
                data,
                error: err,
                status,
                params,
            }
        }));
    }

    let results = join_all(tasks).await;
    let final_results: Vec<BulkResult> = results.into_iter().map(|r| r.unwrap()).collect();
    
    Ok(final_results)
}

#[derive(Deserialize)]
struct ExportOptions {
    filetype: String,
    #[serde(rename = "whoisreply")]
    whois_reply: String,
}

#[tauri::command]
async fn bulk_whois_export(
    results: Vec<BulkResult>,
    options: ExportOptions,
    path: String,
) -> Result<(), String> {
    if options.filetype == "txt" || options.whois_reply.contains("yes") {
        // ZIP export
        let file = fs::File::create(&path).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipWriter::new(file);
        let zip_options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

        if options.filetype == "csv" {
            zip.start_file("results.csv", zip_options).map_err(|e| e.to_string())?;
            let mut content = String::from("\"Domain\",\"Status\",\"Registrar\",\"Company\"\n");
            for r in &results {
                let registrar = r.params.as_ref().and_then(|p| p.registrar.as_ref()).map(|s| s.as_str()).unwrap_or("");
                let company = r.params.as_ref().and_then(|p| p.company.as_ref()).map(|s| s.as_str()).unwrap_or("");
                content.push_str(&format!("\"{}\",\"{}\",\"{}\",\"{}\"\n", r.domain, r.status, registrar, company));
            }
            zip.write_all(content.as_bytes()).map_err(|e| e.to_string())?;
        }

        for r in &results {
            if let Some(data) = &r.data {
                zip.start_file(format!("{}.txt", r.domain), zip_options).map_err(|e| e.to_string())?;
                zip.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
            }
        }
        zip.finish().map_err(|e| e.to_string())?;
    } else {
        // Plain CSV export
        let mut content = String::from("\"Domain\",\"Status\",\"Registrar\",\"Company\"\n");
        for r in &results {
            let registrar = r.params.as_ref().and_then(|p| p.registrar.as_ref()).map(|s| s.as_str()).unwrap_or("");
            let company = r.params.as_ref().and_then(|p| p.company.as_ref()).map(|s| s.as_str()).unwrap_or("");
            content.push_str(&format!("\"{}\",\"{}\",\"{}\",\"{}\"\n", r.domain, r.status, registrar, company));
        }
        fs::write(path, content).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn settings_load<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String) -> Result<String, String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push(filename);
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn settings_save<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String, content: String) -> Result<(), String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    path.push(filename);
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn config_delete<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String) -> Result<(), String> {
    let mut path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    path.push(filename);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Stats commands
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
        if let Ok(modified) = metadata.modified() {
            if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
                mtime = Some(duration.as_millis() as u64);
            }
        }
        if let Ok(f) = fs::OpenOptions::new().read(true).write(true).open(config_p) {
            read_write = true;
            drop(f);
        }
    }

    let size = if data_p.exists() { get_dir_size(data_p) } else { 0 };

    AppStats {
        mtime,
        loaded,
        size,
        config_path,
        config_size,
        read_write,
        data_path,
    }
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
        
        watchers.insert(id, StatsWatcher {
            config_path: config_path.clone(),
            data_path: data_path.clone(),
        });
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
async fn stats_stop(
    data: State<'_, AppData>,
    id: u32,
) -> Result<(), String> {
    let mut watchers = data.stats_watchers.lock().unwrap();
    watchers.remove(&id);
    Ok(())
}

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
                _ = &mut rx => {
                    break;
                }
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
async fn availability_check(text: String) -> String {
    let status = is_domain_available(&text);
    serde_json::to_value(&status).unwrap().as_str().unwrap_or("unavailable").to_string()
}

#[tauri::command]
async fn availability_params(domain: Option<String>, status: Option<DomainStatus>, text: String) -> WhoisParams {
    get_domain_parameters(domain, status, text)
}

fn main() {
    tauri::Builder::default()
        .manage(AppData {
            stats_watchers: Mutex::new(HashMap::new()),
            next_watcher_id: Mutex::new(1),
            monitor: AsyncMutex::new(MonitorState { active: false, cancel_token: None }),
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            whois_lookup,
            fs_read_file,
            fs_exists,
            fs_stat,
            fs_readdir,
            fs_unlink,
            fs_access,
            fs_write_file,
            shell_open_path,
            i18n_load,
            app_get_base_dir,
            app_get_user_data_path,
            db_history_add,
            db_history_get,
            db_history_clear,
            db_cache_get,
            db_cache_set,
            db_cache_clear,
            bulk_whois_lookup,
            bulk_whois_export,
            settings_load,
            settings_save,
            config_delete,
            stats_get,
            stats_start,
            stats_refresh,
            stats_stop,
            monitor_start,
            monitor_stop,
            availability_check,
            availability_params
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_compute_stats_internal() {
        let stats = compute_stats_internal("non_existent.json".to_string(), ".".to_string()).await;
        assert_eq!(stats.loaded, false);
        assert!(stats.size > 0);
    }

    #[tokio::test]
    async fn test_db_history() {
        let db_path = "test_history.sqlite";
        let _ = fs::remove_file(db_path);
        
        let res = db_history_add(db_path.to_string(), "example.com".to_string(), "available".to_string()).await;
        assert!(res.is_ok());
        
        let history = db_history_get(db_path.to_string(), 10).await.unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].domain, "example.com");
        
        let _ = fs::remove_file(db_path);
    }

    #[tokio::test]
    async fn test_db_cache() {
        let db_path = "test_cache.sqlite";
        let _ = fs::remove_file(db_path);
        
        let res = db_cache_set(db_path.to_string(), "key1".to_string(), "resp1".to_string(), Some(10)).await;
        assert!(res.is_ok());
        
        let val = db_cache_get(db_path.to_string(), "key1".to_string(), None).await.unwrap();
        assert_eq!(val, Some("resp1".to_string()));
        
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        let val_expired = db_cache_get(db_path.to_string(), "key1".to_string(), Some(1)).await.unwrap();
        assert_eq!(val_expired, None);
        
        let _ = fs::remove_file(db_path);
    }

    #[tokio::test]
    async fn test_availability_commands() {
        let res = availability_check("No match for domain example.com".to_string()).await;
        assert_eq!(res, "available");
        
        let params = availability_params(Some("test.com".to_string()), None, "Domain Name: test.com\nRegistrar: ABC".to_string()).await;
        assert_eq!(params.domain.unwrap(), "test.com");
        assert_eq!(params.registrar.unwrap(), "ABC");
    }

    #[tokio::test]
    async fn test_bulk_lookup_logic() {
        let app = tauri::test::mock_app();
        let domains = vec!["google.com".to_string(), "available-test-123.com".to_string()];
        
        let results = bulk_whois_lookup(app.app_handle().clone(), domains, 2, 5000).await.unwrap();
        assert_eq!(results.len(), 2);
        assert!(!results[0].status.is_empty());
        assert!(!results[1].status.is_empty());
    }

    #[tokio::test]
    async fn test_bulk_lookup_edge_cases() {
        let app = tauri::test::mock_app();
        
        // Empty domains
        let results_empty = bulk_whois_lookup(app.app_handle().clone(), vec![], 4, 5000).await.unwrap();
        assert_eq!(results_empty.len(), 0);

        // Single domain with invalid characters
        let domains_invalid = vec!["!!invalid!!".to_string()];
        let results_invalid = bulk_whois_lookup(app.app_handle().clone(), domains_invalid, 4, 5000).await.unwrap();
        assert_eq!(results_invalid.len(), 1);
        assert_eq!(results_invalid[0].status, "error");
    }

    #[tokio::test]
    async fn test_db_edge_cases() {
        let db_path = "test_edge.sqlite";
        let _ = fs::remove_file(db_path);

        // Very long domain
        let long_domain = "a".repeat(1000) + ".com";
        let res = db_history_add(db_path.to_string(), long_domain.clone(), "available".to_string()).await;
        assert!(res.is_ok());

        // Special characters
        let special = "'; DROP TABLE history; --".to_string();
        let res_special = db_history_add(db_path.to_string(), special.clone(), "error".to_string()).await;
        assert!(res_special.is_ok());

        let history = db_history_get(db_path.to_string(), 10).await.unwrap();
        assert_eq!(history.len(), 2);
        assert_eq!(history[0].domain, special); // Most recent first
        assert_eq!(history[1].domain, long_domain);

        let _ = fs::remove_file(db_path);
    }
}
