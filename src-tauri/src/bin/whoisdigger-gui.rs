// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use whoisdigger::{
    perform_lookup, perform_lookup_with_settings, dns_lookup, rdap_lookup,
    db_history_add, db_history_get, db_history_get_filtered, db_cache_get, db_cache_set,
    availability::{
        is_domain_available, is_domain_available_with_settings,
        get_domain_parameters,
        DomainStatus, WhoisParams, AvailabilitySettings,
    },
    export::{BulkResult, ExportOpts, export_results},
    ai::{self as wd_ai_mod, OpenAiSettings},
    wordlist::{self as wd_wordlist_mod},
    proxy::{ProxySettings, ProxyRotation},
    lookup::LookupSettings,
    HistoryEntry,
};
use wd_parser::parse_raw_data;

use tauri::{Emitter, State, Runtime, Manager};
use std::sync::Arc;
use tokio::sync::{Semaphore, Mutex as AsyncMutex};
use futures::future::join_all;
use walkdir::WalkDir;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri_plugin_shell::ShellExt;
use zip::write::SimpleFileOptions;
use std::path::{Path, PathBuf};
use serde::{Serialize, Deserialize};
use rusqlite::Connection;
use std::io::Write;
use rayon::prelude::*;

// ─── Utility Functions ────────────────────────────────────────────────────────

/// Convert bytes to a human-readable file size string.
/// When `si` is true, uses metric units (kB = 1000); otherwise IEC (KiB = 1024).
fn byte_to_human_file_size(bytes: u64, si: bool) -> String {
    let thresh: f64 = if si { 1000.0 } else { 1024.0 };
    let b = bytes as f64;
    if b.abs() < thresh {
        return format!("{} B", bytes);
    }
    let units: &[&str] = if si {
        &["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    } else {
        &["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
    };
    let mut val = b;
    let mut u = 0usize;
    loop {
        val /= thresh;
        if val.abs() < thresh || u >= units.len() - 1 {
            break;
        }
        u += 1;
    }
    format!("{:.1} {}", val, units[u])
}

/// Convert milliseconds to a human-readable duration string (e.g. "2 h 5 m 30 s").
fn ms_to_human_time(duration_ms: u64) -> String {
    if duration_ms == 0 {
        return "-".to_string();
    }
    let ms = duration_ms % 1000;
    let total_s = duration_ms / 1000;
    let s = total_s % 60;
    let total_m = total_s / 60;
    let m = total_m % 60;
    let total_h = total_m / 60;
    let h = total_h % 24;
    let total_d = total_h / 24;
    let d = total_d % 7;
    let total_w = total_d / 7;
    let w = total_w % 4;
    let total_mo = total_w / 4;
    let mo = total_mo % 12;
    let y = total_mo / 12;

    let mut parts: Vec<String> = Vec::new();
    if y > 0  { parts.push(format!("{} Y", y)); }
    if mo > 0 { parts.push(format!("{} M", mo)); }
    if w > 0  { parts.push(format!("{} w", w)); }
    if d > 0  { parts.push(format!("{} d", d)); }
    if h > 0  { parts.push(format!("{} h", h)); }
    if m > 0  { parts.push(format!("{} m", m)); }
    if s > 0  { parts.push(format!("{} s", s)); }
    if ms > 0 { parts.push(format!("{} ms", ms)); }

    if parts.is_empty() { "-".to_string() } else { parts.join(" ") }
}

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

/// Enriched file information returned by the `file_info` command.
/// Combines stat metadata with line count, preview, human-readable size,
/// and bulk lookup time estimates.
#[derive(Serialize, Clone)]
struct FileInfo {
    filename: String,
    size: u64,
    #[serde(rename = "humanSize")]
    human_size: String,
    #[serde(rename = "mtimeMs")]
    mtime_ms: u64,
    #[serde(rename = "mtimeFormatted")]
    mtime_formatted: Option<String>,
    #[serde(rename = "atimeFormatted")]
    atime_formatted: Option<String>,
    #[serde(rename = "lineCount")]
    line_count: usize,
    #[serde(rename = "filePreview")]
    file_preview: String,
    #[serde(rename = "minEstimate")]
    min_estimate: String,
    #[serde(rename = "maxEstimate")]
    max_estimate: Option<String>,
}

/// Time estimate result returned by `bulk_estimate_time` command.
#[derive(Serialize, Clone)]
struct TimeEstimate {
    min: String,
    max: Option<String>,
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
    /// Pre-formatted human-readable config file size (SI units).
    #[serde(rename = "configSizeHuman")]
    config_size_human: String,
    /// Pre-formatted human-readable data directory size (SI units).
    #[serde(rename = "dataSizeHuman")]
    data_size_human: String,
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
    proxy_settings: AsyncMutex<ProxySettings>,
    proxy_rotation: ProxyRotation,
    lookup_settings: AsyncMutex<LookupSettings>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Validate that a resolved path stays within the given base directory.
/// Prevents path traversal attacks on filesystem commands.
/// Works reliably for both existing and non-existent destination paths
/// by manually resolving `..` components instead of relying on
/// `canonicalize()` (which requires the path to exist).
fn safe_path(base: &Path, sub: &str) -> Result<PathBuf, String> {
    let dest = base.join(sub);

    // Resolve the base (must exist)
    let canonical_base = base.canonicalize().unwrap_or_else(|_| base.to_path_buf());

    // For the destination, resolve what exists and append the rest
    let canonical_dest = resolve_path_safe(&dest);

    if canonical_dest != canonical_base && !canonical_dest.starts_with(&canonical_base) {
        return Err("Invalid path: traversal detected".into());
    }
    Ok(dest)
}

/// Resolve a path without requiring it to exist. Walks up from the full path
/// until we find an ancestor that exists (and can be canonicalized), then
/// re-appends the remaining components with `..` eliminated.
fn resolve_path_safe(path: &Path) -> PathBuf {
    // First try direct canonicalize (works if path exists)
    if let Ok(canon) = path.canonicalize() {
        return canon;
    }

    // Collect all components and manually resolve
    let mut resolved = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => {
                resolved.pop();
            }
            std::path::Component::CurDir => {}
            other => resolved.push(other),
        }
    }

    // Try to canonicalize the closest existing ancestor
    let mut ancestor = resolved.clone();
    let mut tail_parts = Vec::new();
    while !ancestor.exists() {
        if let Some(file_name) = ancestor.file_name() {
            tail_parts.push(file_name.to_os_string());
        }
        if !ancestor.pop() {
            break;
        }
    }

    let mut result = ancestor.canonicalize().unwrap_or(ancestor);
    for part in tail_parts.into_iter().rev() {
        result.push(part);
    }
    result
}

/// Validate that a profile or settings filename is safe (no path separators or traversal).
fn sanitize_name(name: &str) -> Result<&str, String> {
    if name.is_empty() {
        return Err("Name cannot be empty".into());
    }
    if name.contains('/') || name.contains('\\') || name.contains("..") || name.contains('\0') {
        return Err("Invalid name: contains forbidden characters".into());
    }
    // Only allow alphanumeric, hyphens, underscores, dots
    if !name.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '.') {
        return Err("Invalid name: only alphanumeric, hyphens, underscores and dots are allowed".into());
    }
    Ok(name)
}

fn get_user_data_dir<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    let path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

fn get_profile_dir<R: Runtime>(app_handle: &tauri::AppHandle<R>, profile: &str) -> Result<PathBuf, String> {
    let sanitized = sanitize_name(profile)?;
    let mut path = get_user_data_dir(app_handle)?;
    path.push("profiles");
    path.push(sanitized);
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

/// Read the current profile ID from disk, falling back to "default".
fn get_current_profile<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Result<String, String> {
    let path = get_user_data_dir(app_handle)?.join("current-profile");
    if path.exists() {
        std::fs::read_to_string(&path)
            .map(|s| { let t = s.trim().to_string(); if t.is_empty() { "default".into() } else { t } })
            .unwrap_or_else(|_| "default".into())
    } else {
        "default".into()
    }
    .pipe_ref(|id| sanitize_name(id).map(|s| s.to_string()))
}

/// Helper trait for piping a value through a closure.
trait PipeRef {
    fn pipe_ref<F, R2>(&self, f: F) -> R2 where F: FnOnce(&Self) -> R2;
}
impl<T> PipeRef for T {
    fn pipe_ref<F, R2>(&self, f: F) -> R2 where F: FnOnce(&Self) -> R2 { f(self) }
}

fn epoch_ms_from_metadata(metadata: &std::fs::Metadata) -> Option<u64> {
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

/// Validate that a path stays within the user data directory (sandboxing).
fn validate_fs_path<R: Runtime>(app_handle: &tauri::AppHandle<R>, path: &str) -> Result<PathBuf, String> {
    let base = get_user_data_dir(app_handle)?;
    safe_path(&base, &PathBuf::from(path).strip_prefix(&base).map_or_else(
        |_| path.to_string(),
        |rel| rel.to_string_lossy().to_string(),
    ))
}

// ─── FS Commands (tokio::fs with sandboxing) ─────────────────────────────────

#[tauri::command]
async fn fs_read_file<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<String, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::read_to_string(&validated).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_exists<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<bool, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    Ok(tokio::fs::try_exists(&validated).await.unwrap_or(false))
}

#[tauri::command]
async fn fs_stat<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<FileStat, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    let metadata = tokio::fs::metadata(&validated).await.map_err(|e| e.to_string())?;
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
async fn fs_readdir<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<Vec<String>, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    let mut entries = tokio::fs::read_dir(&validated).await.map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        if let Ok(name) = entry.file_name().into_string() {
            names.push(name);
        }
    }
    Ok(names)
}

#[tauri::command]
async fn fs_unlink<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::remove_file(&validated).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_access<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::metadata(&validated).await.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_write_file<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String, content: String) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    if let Some(parent) = validated.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    tokio::fs::write(&validated, content).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn fs_mkdir<R: Runtime>(app_handle: tauri::AppHandle<R>, path: String) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::create_dir_all(&validated).await.map_err(|e| e.to_string())
}

// ─── File Info Command ───────────────────────────────────────────────────────

/// Returns enriched file metadata: filename, human-readable size, line count,
/// preview, formatted dates, and time estimates for bulk lookups.
/// `si`: use metric (true) or IEC (false) units.
/// `time_between_min` / `time_between_max` / `randomize`: lookup timing settings
/// used to compute estimates.
#[tauri::command]
async fn file_info<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
    si: Option<bool>,
    time_between: Option<u64>,
    time_between_min: Option<u64>,
    time_between_max: Option<u64>,
    randomize: Option<bool>,
) -> Result<FileInfo, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    let metadata = tokio::fs::metadata(&validated).await.map_err(|e| e.to_string())?;
    let content = tokio::fs::read_to_string(&validated).await.map_err(|e| e.to_string())?;

    let use_si = si.unwrap_or(true);
    let line_count = content.lines().count();
    let file_preview = if content.len() > 50 { content[..50].to_string() } else { content.clone() };

    let mtime_ms = epoch_ms_from_metadata(&metadata).unwrap_or(0);
    let mtime_formatted = metadata.modified().ok().map(iso_from_system_time);
    let atime_formatted = metadata.accessed().ok().map(iso_from_system_time);

    let filename = validated.file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let (min_estimate, max_estimate) = compute_estimates(
        line_count,
        time_between.unwrap_or(1500),
        time_between_min.unwrap_or(1000),
        time_between_max.unwrap_or(1500),
        randomize.unwrap_or(false),
    );

    Ok(FileInfo {
        filename,
        size: metadata.len(),
        human_size: byte_to_human_file_size(metadata.len(), use_si),
        mtime_ms,
        mtime_formatted,
        atime_formatted,
        line_count,
        file_preview,
        min_estimate,
        max_estimate,
    })
}

/// Returns time estimates for a bulk lookup given a line count and timing settings.
#[tauri::command]
async fn bulk_estimate_time(
    line_count: usize,
    time_between: Option<u64>,
    time_between_min: Option<u64>,
    time_between_max: Option<u64>,
    randomize: Option<bool>,
) -> Result<TimeEstimate, String> {
    let (min, max) = compute_estimates(
        line_count,
        time_between.unwrap_or(1500),
        time_between_min.unwrap_or(1000),
        time_between_max.unwrap_or(1500),
        randomize.unwrap_or(false),
    );
    Ok(TimeEstimate { min, max })
}

/// Shared logic for computing min/max time estimates.
fn compute_estimates(
    line_count: usize,
    time_between: u64,
    time_between_min: u64,
    time_between_max: u64,
    randomize: bool,
) -> (String, Option<String>) {
    if randomize {
        let min_ms = line_count as u64 * time_between_min;
        let max_ms = line_count as u64 * time_between_max;
        (ms_to_human_time(min_ms), Some(ms_to_human_time(max_ms)))
    } else {
        let ms = line_count as u64 * time_between;
        (ms_to_human_time(ms), None)
    }
}

/// Convert bytes to human-readable file size (exposed as a Tauri command).
#[tauri::command]
async fn convert_file_size(bytes: u64, si: Option<bool>) -> String {
    byte_to_human_file_size(bytes, si.unwrap_or(true))
}

/// Convert milliseconds to human-readable duration (exposed as a Tauri command).
#[tauri::command]
async fn convert_duration(duration_ms: u64) -> String {
    ms_to_human_time(duration_ms)
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
                return tokio::fs::read_to_string(path).await.map_err(|e| e.to_string());
            }
        }
    }

    // Fallback for development
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    for prefix in &["dist/app/locales", "app/locales"] {
        let path = cwd.join(prefix).join(&filename);
        if path.exists() {
            return tokio::fs::read_to_string(path).await.map_err(|e| e.to_string());
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

/// Convert DomainStatus to its serde string representation.
fn domain_status_to_string(status: &DomainStatus) -> String {
    status.as_str().to_string()
}

#[tauri::command]
async fn whois_lookup<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: State<'_, AppData>,
    domain: String,
) -> Result<String, String> {
    let settings = data.lookup_settings.lock().await.clone();
    let result = perform_lookup_with_settings(&domain, &settings).await?;

    // Log to history (in a blocking task since rusqlite is sync)
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    let status = is_domain_available(&result);
    let status_str = domain_status_to_string(&status);
    let path_str = path.to_string_lossy().to_string();
    let domain_clone = domain.clone();
    let _ = tokio::task::spawn_blocking(move || {
        db_history_add(&path_str, &domain_clone, &status_str)
    }).await;

    Ok(result)
}

#[tauri::command]
async fn whois_lookup_with_settings<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    domain: String,
    settings: LookupSettings,
) -> Result<String, String> {
    let result = perform_lookup_with_settings(&domain, &settings).await?;

    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    let status = is_domain_available(&result);
    let status_str = domain_status_to_string(&status);
    let path_str = path.to_string_lossy().to_string();
    let domain_clone = domain.clone();
    let _ = tokio::task::spawn_blocking(move || {
        db_history_add(&path_str, &domain_clone, &status_str)
    }).await;

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
    domain_status_to_string(&status)
}

#[tauri::command]
async fn availability_check_with_settings(
    text: String,
    settings: AvailabilitySettings,
) -> String {
    let status = is_domain_available_with_settings(&text, &settings);
    domain_status_to_string(&status)
}

#[tauri::command]
async fn availability_params(domain: Option<String>, status: Option<DomainStatus>, text: String) -> WhoisParams {
    get_domain_parameters(domain, status, text)
}

/// Parse raw WHOIS text into a key-value JSON map (renderer replacement for parser.ts toJSON).
#[tauri::command]
async fn whois_parse(text: String) -> HashMap<String, String> {
    parse_raw_data(&text)
}

// ─── History Commands (spawn_blocking for sync SQLite) ───────────────────────

#[tauri::command]
async fn db_gui_history_get<R: Runtime>(app_handle: tauri::AppHandle<R>, limit: u32) -> Result<Vec<HistoryEntry>, String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    if !path.exists() { return Ok(Vec::new()); }
    let path_str = path.to_string_lossy().to_string();
    tokio::task::spawn_blocking(move || db_history_get(&path_str, limit))
        .await
        .map_err(|e| e.to_string())?
}

/// Filtered history query result with entries and total count.
#[derive(Serialize, Clone)]
struct HistoryPage {
    entries: Vec<HistoryEntry>,
    total: u32,
    page: u32,
    #[serde(rename = "pageSize")]
    page_size: u32,
}

/// Filtered, paginated history query. Performs domain search, status filter,
/// and date-range restriction entirely in SQL for O(log n) performance on large
/// history databases. All params are optional — omit for unfiltered.
#[tauri::command]
async fn db_gui_history_get_filtered<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    query: Option<String>,
    status: Option<String>,
    days: Option<u32>,
    page: Option<u32>,
    page_size: Option<u32>,
) -> Result<HistoryPage, String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    if !path.exists() {
        return Ok(HistoryPage { entries: Vec::new(), total: 0, page: 0, page_size: page_size.unwrap_or(50) });
    }
    let path_str = path.to_string_lossy().to_string();
    let pg = page.unwrap_or(0);
    let ps = page_size.unwrap_or(50);
    let since_ms = days.map(|d| {
        chrono::Utc::now().timestamp_millis() - (d as i64 * 86_400_000)
    });
    let q = query.clone();
    let s = status.clone();

    let (entries, total) = tokio::task::spawn_blocking(move || {
        db_history_get_filtered(
            &path_str,
            q.as_deref(),
            s.as_deref(),
            since_ms,
            pg,
            ps,
        )
    })
    .await
    .map_err(|e| e.to_string())??;

    Ok(HistoryPage { entries, total, page: pg, page_size: ps })
}

#[tauri::command]
async fn db_gui_history_clear<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    if !path.exists() { return Ok(()); }
    tokio::task::spawn_blocking(move || {
        let conn = Connection::open(&path).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM history", []).map_err(|e| e.to_string())?;
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn history_merge<R: Runtime>(app_handle: tauri::AppHandle<R>, paths: Vec<String>) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let dest_path = get_profile_dir(&app_handle, &profile)?.join(format!("history-{}.sqlite", profile));

    tokio::task::spawn_blocking(move || {
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
    }).await.map_err(|e| e.to_string())?
}

// ─── Cache Commands (spawn_blocking for sync SQLite) ─────────────────────────

#[tauri::command]
async fn db_gui_cache_get<R: Runtime>(app_handle: tauri::AppHandle<R>, key: String, ttl_ms: Option<u64>) -> Result<Option<String>, String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");
    let path_str = path.to_string_lossy().to_string();
    tokio::task::spawn_blocking(move || db_cache_get(&path_str, &key, ttl_ms))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn db_gui_cache_set<R: Runtime>(app_handle: tauri::AppHandle<R>, key: String, response: String, max_entries: Option<u32>) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");
    let path_str = path.to_string_lossy().to_string();
    tokio::task::spawn_blocking(move || db_cache_set(&path_str, &key, &response, max_entries))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn db_gui_cache_clear<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");
    if !path.exists() { return Ok(()); }
    tokio::task::spawn_blocking(move || {
        let conn = Connection::open(&path).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM cache", []).map_err(|e| e.to_string())?;
        Ok(())
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn cache_merge<R: Runtime>(app_handle: tauri::AppHandle<R>, paths: Vec<String>) -> Result<(), String> {
    let profile = get_current_profile(&app_handle)?;
    let dest_path = get_profile_dir(&app_handle, &profile)?.join("request-cache.sqlite");

    tokio::task::spawn_blocking(move || {
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
    }).await.map_err(|e| e.to_string())?
}

// ─── Bulk WHOIS Commands ─────────────────────────────────────────────────────

#[derive(Serialize, Clone)]
struct BulkProgress {
    sent: u32,
    total: u32,
    #[serde(rename = "sentPercent")]
    sent_percent: f64,
}

#[tauri::command]
async fn bulk_whois_lookup<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: State<'_, AppData>,
    domains: Vec<String>,
    tlds: Option<Vec<String>>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    {
        let mut state = data.bulk_state.lock().await;
        state.paused = false;
        state.stopped = false;
    }

    // Expand domains × TLDs if provided
    let expanded_domains = if let Some(ref tld_list) = tlds {
        if !tld_list.is_empty() {
            let mut expanded = Vec::new();
            for domain in &domains {
                // Strip existing TLD if any, then append each TLD
                let base = domain.split('.').next().unwrap_or(domain);
                for tld in tld_list {
                    let tld_clean = tld.trim_start_matches('.');
                    expanded.push(format!("{}.{}", base, tld_clean));
                }
            }
            expanded
        } else {
            domains
        }
    } else {
        domains
    };

    let lookup_settings = data.lookup_settings.lock().await.clone();
    let total = expanded_domains.len() as u32;
    let semaphore = Arc::new(Semaphore::new(concurrency));
    let mut tasks = Vec::new();
    let sent_counter = Arc::new(tokio::sync::Mutex::new(0u32));
    let per_domain_timeout = if timeout_ms > 0 {
        Some(tokio::time::Duration::from_millis(timeout_ms))
    } else {
        None
    };

    for domain in expanded_domains {
        let sem = Arc::clone(&semaphore);
        let app = app_handle.clone();
        let sent = Arc::clone(&sent_counter);
        let bulk_state = Arc::clone(&data.bulk_state);
        let settings = lookup_settings.clone();
        let domain_timeout = per_domain_timeout;

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

            let _permit = match sem.acquire().await {
                Ok(p) => p,
                Err(_) => return BulkResult { domain, data: None, error: Some("Semaphore closed".into()), status: "error".into(), params: None },
            };

            let lookup_future = perform_lookup_with_settings(&domain, &settings);
            let lookup_result = if let Some(timeout_dur) = domain_timeout {
                match tokio::time::timeout(timeout_dur, lookup_future).await {
                    Ok(res) => res,
                    Err(_) => Err(format!("Timeout after {}ms", timeout_dur.as_millis())),
                }
            } else {
                lookup_future.await
            };

            let (data_val, err, status, params) = match lookup_result {
                Ok(res) => {
                    let s = is_domain_available(&res);
                    let p = get_domain_parameters(Some(domain.clone()), Some(s.clone()), res.clone());
                    let s_str = domain_status_to_string(&s);
                    (Some(res), None, s_str, Some(p))
                },
                Err(e) => (None, Some(e.to_string()), "error".to_string(), None),
            };

            let mut s = sent.lock().await;
            *s += 1;
            let pct = if total > 0 {
                ((*s as f64 / total as f64) * 1000.0).round() / 10.0
            } else {
                0.0
            };
            let _ = app.emit("bulk:status", BulkProgress { sent: *s, total, sent_percent: pct });

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

/// Bulk WHOIS lookup directly from a file path — avoids sending the full file
/// content over IPC. Reads, splits lines, trims, and launches the lookup
/// pipeline entirely server-side via `tokio::fs` + `rayon`.
#[tauri::command]
async fn bulk_whois_lookup_from_file<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: State<'_, AppData>,
    path: String,
    tlds: Option<Vec<String>>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    let raw = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path, e))?;
    // Parse lines in parallel using rayon (faster for large files)
    let domains: Vec<String> = tokio::task::spawn_blocking(move || {
        raw.par_lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect()
    })
    .await
    .map_err(|e| e.to_string())?;

    // Delegate to the existing bulk_whois_lookup logic
    bulk_whois_lookup(app_handle, data, domains, tlds, concurrency, timeout_ms).await
}

/// Bulk WHOIS lookup from raw text content — avoids JS-side `.split('\n')`
/// and array serialisation over IPC. Splits & trims lines server-side via
/// rayon `par_lines()`, then delegates to the existing
/// `bulk_whois_lookup` pipeline.
#[tauri::command]
async fn bulk_whois_lookup_from_content<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: State<'_, AppData>,
    content: String,
    tlds: Option<Vec<String>>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    // Parse lines in parallel using rayon
    let domains: Vec<String> = tokio::task::spawn_blocking(move || {
        content
            .par_lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect()
    })
    .await
    .map_err(|e| e.to_string())?;

    // Delegate to the existing bulk_whois_lookup logic
    bulk_whois_lookup(app_handle, data, domains, tlds, concurrency, timeout_ms).await
}

// ─── Export Commands ─────────────────────────────────────────────────────────

#[tauri::command]
async fn bulk_whois_export(
    results: Vec<BulkResult>,
    options: ExportOpts,
    path: String,
) -> Result<(), String> {
    export_results(&results, &options, &path)
}

// ─── Settings Commands (tokio::fs + name sanitization) ───────────────────────

#[tauri::command]
async fn settings_load<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String) -> Result<String, String> {
    sanitize_name(&filename)?;
    let base = get_user_data_dir(&app_handle)?;
    let path = safe_path(&base, &filename)?;
    if !path.exists() { return Ok("{}".to_string()); }
    tokio::fs::read_to_string(path).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn settings_save<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String, content: String) -> Result<(), String> {
    sanitize_name(&filename)?;
    let base = get_user_data_dir(&app_handle)?;
    let path = safe_path(&base, &filename)?;
    tokio::fs::write(path, content).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn config_delete<R: Runtime>(app_handle: tauri::AppHandle<R>, filename: String) -> Result<(), String> {
    sanitize_name(&filename)?;
    let base = get_user_data_dir(&app_handle)?;
    let path = safe_path(&base, &filename)?;
    if path.exists() { tokio::fs::remove_file(path).await.map_err(|e| e.to_string())?; }
    Ok(())
}

// ─── Proxy/Settings State Commands ───────────────────────────────────────────

#[tauri::command]
async fn proxy_set_settings(data: State<'_, AppData>, settings: ProxySettings) -> Result<(), String> {
    *data.proxy_settings.lock().await = settings;
    data.proxy_rotation.reset();
    Ok(())
}

#[tauri::command]
async fn proxy_get_settings(data: State<'_, AppData>) -> Result<ProxySettings, String> {
    Ok(data.proxy_settings.lock().await.clone())
}

#[tauri::command]
async fn lookup_set_settings(data: State<'_, AppData>, settings: LookupSettings) -> Result<(), String> {
    *data.lookup_settings.lock().await = settings;
    Ok(())
}

#[tauri::command]
async fn lookup_get_settings(data: State<'_, AppData>) -> Result<LookupSettings, String> {
    Ok(data.lookup_settings.lock().await.clone())
}

// ─── Profiles Commands (sanitized names + tokio::fs) ─────────────────────────

#[tauri::command]
async fn profiles_list<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<Vec<ProfileEntry>, String> {
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    if !profiles_dir.exists() {
        let _ = tokio::fs::create_dir_all(profiles_dir.join("default")).await;
    }

    let mut entries = tokio::fs::read_dir(&profiles_dir).await.map_err(|e| e.to_string())?;
    let mut profiles = Vec::new();

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if path.is_dir() {
            let name = entry.file_name().into_string().unwrap_or_default();
            let mtime = path.join("settings.json").metadata().ok()
                .and_then(|m| epoch_ms_from_metadata(&m));
            profiles.push(ProfileEntry { id: name.clone(), name, file: path.to_string_lossy().to_string(), mtime });
        }
    }

    if profiles.is_empty() {
        let default_dir = profiles_dir.join("default");
        let _ = tokio::fs::create_dir_all(&default_dir).await;
        profiles.push(ProfileEntry { id: "default".into(), name: "default".into(), file: default_dir.to_string_lossy().into(), mtime: None });
    }

    Ok(profiles)
}

#[tauri::command]
async fn profiles_create<R: Runtime>(app_handle: tauri::AppHandle<R>, name: String, copy_current: Option<bool>) -> Result<ProfileEntry, String> {
    sanitize_name(&name)?;
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let new_dir = profiles_dir.join(&name);
    tokio::fs::create_dir_all(&new_dir).await.map_err(|e| e.to_string())?;

    if copy_current.unwrap_or(false) {
        let current = profiles_dir.join("default");
        if current.exists() {
            let mut src_entries = tokio::fs::read_dir(&current).await.map_err(|e| e.to_string())?;
            while let Some(entry) = src_entries.next_entry().await.map_err(|e| e.to_string())? {
                let _ = tokio::fs::copy(entry.path(), new_dir.join(entry.file_name())).await;
            }
        }
    }

    Ok(ProfileEntry { id: name.clone(), name, file: new_dir.to_string_lossy().into(), mtime: None })
}

#[tauri::command]
async fn profiles_rename<R: Runtime>(app_handle: tauri::AppHandle<R>, id: String, new_name: String) -> Result<(), String> {
    sanitize_name(&id)?;
    sanitize_name(&new_name)?;
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let old = profiles_dir.join(&id);
    let new_path = profiles_dir.join(&new_name);
    if old.exists() { tokio::fs::rename(old, new_path).await.map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
async fn profiles_delete<R: Runtime>(app_handle: tauri::AppHandle<R>, id: String) -> Result<(), String> {
    sanitize_name(&id)?;
    if id == "default" { return Err("Cannot delete the default profile".into()); }
    let dir = get_user_data_dir(&app_handle)?.join("profiles").join(&id);
    if dir.exists() { tokio::fs::remove_dir_all(dir).await.map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
async fn profiles_set_current<R: Runtime>(app_handle: tauri::AppHandle<R>, id: String) -> Result<(), String> {
    sanitize_name(&id)?;
    let path = get_user_data_dir(&app_handle)?.join("current-profile");
    tokio::fs::write(path, &id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn profiles_get_current<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?.join("current-profile");
    if path.exists() {
        tokio::fs::read_to_string(path).await.map_err(|e| e.to_string())
    } else {
        Ok("default".into())
    }
}

#[tauri::command]
async fn profiles_export<R: Runtime>(app_handle: tauri::AppHandle<R>, id: Option<String>) -> Result<String, String> {
    let profile_id = id.unwrap_or_else(|| "default".into());
    sanitize_name(&profile_id)?;
    let profile_dir = get_profile_dir(&app_handle, &profile_id)?;

    let zip_path = get_user_data_dir(&app_handle)?.join(format!("profile-export-{}.zip", profile_id));
    // zip::ZipWriter requires a sync Write, so use std::fs here
    let file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let zip_opts = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in WalkDir::new(&profile_dir).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            let rel = entry.path().strip_prefix(&profile_dir).map_err(|e| e.to_string())?;
            zip.start_file(rel.to_string_lossy(), zip_opts).map_err(|e| e.to_string())?;
            zip.write_all(&std::fs::read(entry.path()).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn profiles_import<R: Runtime>(app_handle: tauri::AppHandle<R>, zip_path: String, profile_name: String) -> Result<ProfileEntry, String> {
    sanitize_name(&profile_name)?;
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let dest_dir = profiles_dir.join(&profile_name);
    tokio::fs::create_dir_all(&dest_dir).await.map_err(|e| e.to_string())?;

    // Extract zip (sync since zip crate is sync)
    let file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        if let Some(name) = entry.enclosed_name() {
            let out_path = dest_dir.join(name);
            if entry.is_dir() {
                std::fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            } else {
                if let Some(parent) = out_path.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let mut outfile = std::fs::File::create(&out_path).map_err(|e| e.to_string())?;
                std::io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(ProfileEntry { id: profile_name.clone(), name: profile_name, file: dest_dir.to_string_lossy().into(), mtime: None })
}

#[tauri::command]
async fn config_export<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?.join("settings.json");
    if path.exists() { tokio::fs::read_to_string(path).await.map_err(|e| e.to_string()) } else { Ok("{}".into()) }
}

#[tauri::command]
async fn config_import<R: Runtime>(app_handle: tauri::AppHandle<R>, content: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&content).map_err(|e| format!("Invalid JSON: {}", e))?;
    let path = get_user_data_dir(&app_handle)?.join("settings.json");
    tokio::fs::write(path, content).await.map_err(|e| e.to_string())
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
            use rand::seq::SliceRandom;
            let mut rng = rand::thread_rng();
            lines.shuffle(&mut rng);
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

/// Parse a CSV file directly from a file path (avoids file content crossing IPC).
#[tauri::command]
async fn csv_parse_file(path: String) -> Result<serde_json::Value, String> {
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path, e))?;
    csv_parse(content).await
}

// ─── BWA Analyser Commands ──────────────────────────────────────────────────

/// Extract TLD from a domain string (e.g., "example.com" → "com").
fn extract_tld(domain: &str) -> String {
    domain.rsplit('.').next().unwrap_or("unknown").to_lowercase()
}

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

    let registrars = results.get("registrar")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().map(|v| v.as_str().unwrap_or("").to_string()).collect::<Vec<_>>())
        .unwrap_or_default();

    let expiry_dates = results.get("expirydate")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().map(|v| v.as_str().unwrap_or("").to_string()).collect::<Vec<_>>())
        .unwrap_or_default();

    let total = domains.len();
    let available = statuses.iter().filter(|s| s.as_str() == "available").count();
    let unavailable = statuses.iter().filter(|s| s.as_str() == "unavailable").count();
    let expired = statuses.iter().filter(|s| s.as_str() == "expired").count();
    let errors = statuses.iter().filter(|s| s.starts_with("error")).count();

    // ── Status breakdown (count each distinct status) ────────────────────
    let mut status_breakdown: HashMap<String, usize> = HashMap::new();
    for s in &statuses {
        *status_breakdown.entry(s.clone()).or_insert(0) += 1;
    }
    let status_breakdown_json: serde_json::Map<String, serde_json::Value> = status_breakdown
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    // ── TLD distribution ─────────────────────────────────────────────────
    let mut tld_distribution: HashMap<String, usize> = HashMap::new();
    for domain in &domains {
        let tld = extract_tld(domain);
        *tld_distribution.entry(tld).or_insert(0) += 1;
    }
    let tld_json: serde_json::Map<String, serde_json::Value> = tld_distribution
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    // ── TLD × Status (available per TLD) ─────────────────────────────────
    let mut tld_available: HashMap<String, usize> = HashMap::new();
    let mut tld_unavailable: HashMap<String, usize> = HashMap::new();
    for (i, domain) in domains.iter().enumerate() {
        let tld = extract_tld(domain);
        let status = statuses.get(i).map(|s| s.as_str()).unwrap_or("");
        if status == "available" {
            *tld_available.entry(tld).or_insert(0) += 1;
        } else if status == "unavailable" {
            *tld_unavailable.entry(tld).or_insert(0) += 1;
        }
    }
    let tld_available_json: serde_json::Map<String, serde_json::Value> = tld_available
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();
    let tld_unavailable_json: serde_json::Map<String, serde_json::Value> = tld_unavailable
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    // ── Registrar distribution ───────────────────────────────────────────
    let mut registrar_dist: HashMap<String, usize> = HashMap::new();
    for reg in &registrars {
        if !reg.is_empty() {
            *registrar_dist.entry(reg.clone()).or_insert(0) += 1;
        }
    }
    // Sort by count descending, take top 20
    let mut registrar_vec: Vec<(String, usize)> = registrar_dist.into_iter().collect();
    registrar_vec.sort_by(|a, b| b.1.cmp(&a.1));
    registrar_vec.truncate(20);
    let registrar_json: serde_json::Map<String, serde_json::Value> = registrar_vec
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    // ── Build per-row data table for the frontend ────────────────────────
    let mut table_data = Vec::new();
    for i in 0..total {
        let mut row = serde_json::Map::new();
        row.insert("domain".into(), serde_json::Value::String(domains.get(i).cloned().unwrap_or_default()));
        row.insert("status".into(), serde_json::Value::String(statuses.get(i).cloned().unwrap_or_default()));
        row.insert("registrar".into(), serde_json::Value::String(registrars.get(i).cloned().unwrap_or_default()));
        row.insert("expiryDate".into(), serde_json::Value::String(expiry_dates.get(i).cloned().unwrap_or_default()));
        row.insert("tld".into(), serde_json::Value::String(extract_tld(domains.get(i).map(|d| d.as_str()).unwrap_or(""))));
        table_data.push(serde_json::Value::Object(row));
    }

    Ok(serde_json::json!({
        "total": total,
        "available": available,
        "unavailable": unavailable,
        "expired": expired,
        "errors": errors,
        "availablePercent": if total > 0 { (available as f64 / total as f64) * 100.0 } else { 0.0 },
        "unavailablePercent": if total > 0 { (unavailable as f64 / total as f64) * 100.0 } else { 0.0 },
        "errorPercent": if total > 0 { (errors as f64 / total as f64) * 100.0 } else { 0.0 },
        "statusBreakdown": serde_json::Value::Object(status_breakdown_json),
        "tldDistribution": serde_json::Value::Object(tld_json),
        "tldAvailable": serde_json::Value::Object(tld_available_json),
        "tldUnavailable": serde_json::Value::Object(tld_unavailable_json),
        "topRegistrars": serde_json::Value::Object(registrar_json),
        "data": table_data,
        "domains": domains,
        "statuses": statuses,
    }))
}

/// Pre-generate BWA table HTML server-side — avoids N×M `createElement` calls
/// in the renderer. Builds `<thead>` and `<tbody>` HTML from the analysis
/// records. Column headers are abbreviated to initials (matching the
/// client-side `getInitials` logic). Row generation uses rayon `par_iter()`
/// for large datasets.
#[tauri::command]
async fn bwa_render_table_html(records: Vec<serde_json::Value>) -> Result<serde_json::Value, String> {
    if records.is_empty() {
        return Ok(serde_json::json!({ "thead": "", "tbody": "" }));
    }

    // Extract column keys from the first record
    let columns: Vec<String> = records[0]
        .as_object()
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();

    // Build thead: single <tr> with <th><abbr title="col">initials</abbr></th>
    let thead = {
        let mut html = String::from("<tr>");
        for col in &columns {
            let initials = get_initials(col, 1);
            html.push_str(&format!(
                "<th><abbr title=\"{}\">{}</abbr></th>",
                html_escape(col),
                html_escape(&initials)
            ));
        }
        html.push_str("</tr>");
        html
    };

    // Build tbody rows in parallel with rayon
    let cols = columns.clone();
    let tbody = tokio::task::spawn_blocking(move || {
        let rows: Vec<String> = records
            .par_iter()
            .map(|record| {
                let mut row = String::from("<tr>");
                for col in &cols {
                    let val = record
                        .get(col)
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    row.push_str("<td>");
                    row.push_str(&html_escape(val));
                    row.push_str("</td>");
                }
                row.push_str("</tr>");
                row
            })
            .collect();
        rows.join("")
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "thead": thead, "tbody": tbody }))
}

/// Minimal HTML escaping for text content injected into table cells.
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Mirrors the frontend `getInitials` logic: extract the first letter of each
/// word boundary. Falls back to a prefix substring when initials are too short.
fn get_initials(s: &str, threshold: usize) -> String {
    let initials: Vec<char> = s
        .split(|c: char| !c.is_alphanumeric())
        .filter(|w| !w.is_empty())
        .filter_map(|w| w.chars().next())
        .collect();

    if initials.len() > threshold {
        initials.into_iter().collect()
    } else {
        s.chars().take(threshold + 1).collect()
    }
}

/// Count lines in a text blob — runs server-side so the frontend doesn't have
/// to materialise a full `.split('\n')` array just to get the count.
#[tauri::command]
fn count_lines(text: String) -> usize {
    if text.is_empty() {
        0
    } else {
        // Count newlines + 1 (matching JS `str.split('\n').length` semantics)
        text.as_bytes().iter().filter(|&&b| b == b'\n').count() + 1
    }
}

// ─── Stats Commands ──────────────────────────────────────────────────────────

fn get_dir_size(path: &Path) -> u64 {
    let entries: Vec<_> = WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .collect();
    entries.par_iter()
        .filter_map(|entry| entry.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

async fn compute_stats_internal(config_path: String, data_path: String) -> AppStats {
    let config_p = Path::new(&config_path);
    let data_p = Path::new(&data_path);

    let mut mtime = None;
    let mut loaded = false;
    let mut config_size = 0;
    let mut read_write = false;

    if let Ok(metadata) = std::fs::metadata(config_p) {
        loaded = true;
        config_size = metadata.len();
        mtime = epoch_ms_from_metadata(&metadata);
        if std::fs::OpenOptions::new().read(true).write(true).open(config_p).is_ok() {
            read_write = true;
        }
    }

    // Use spawn_blocking for rayon-powered directory size calculation
    let dp = data_p.to_path_buf();
    let size = if dp.exists() {
        tokio::task::spawn_blocking(move || get_dir_size(&dp))
            .await
            .unwrap_or(0)
    } else {
        0
    };

    let config_size_human = byte_to_human_file_size(config_size, true);
    let data_size_human = byte_to_human_file_size(size, true);

    AppStats { mtime, loaded, size, config_path, config_size, read_write, data_path, config_size_human, data_size_human }
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
        Ok(ref res) => domain_status_to_string(&is_domain_available(res)),
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

// ─── AI Commands ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn ai_suggest<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    prompt: String,
    count: usize,
) -> Result<Vec<String>, String> {
    // Try to load OpenAI settings from the user's settings.json
    let settings = match load_openai_settings_from_profile(&app_handle) {
        Some(s) => s,
        None => OpenAiSettings::default(),
    };
    wd_ai_mod::suggest_words(&settings, &prompt, count).await
}

/// Load OpenAI settings from the active profile's settings.json.
fn load_openai_settings_from_profile<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Option<OpenAiSettings> {
    let base = get_user_data_dir(app_handle).ok()?;
    let settings_path = base.join("settings.json");
    let content = std::fs::read_to_string(settings_path).ok()?;
    let json: serde_json::Value = serde_json::from_str(&content).ok()?;
    let ai = json.get("ai")?;
    Some(OpenAiSettings {
        url: ai.get("url").and_then(|v| v.as_str()).map(String::from),
        api_key: ai.get("apiKey").and_then(|v| v.as_str()).map(String::from),
        model: ai.get("model").and_then(|v| v.as_str()).map(String::from),
    })
}

#[tauri::command]
async fn ai_suggest_with_settings(
    prompt: String,
    count: usize,
    url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<Vec<String>, String> {
    let settings = OpenAiSettings { url, api_key, model };
    wd_ai_mod::suggest_words(&settings, &prompt, count).await
}

#[tauri::command]
async fn ai_download_model<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let data_dir = get_user_data_dir(&app_handle)?;
    let model_dir = data_dir.join("ai");
    let url = "https://raw.githubusercontent.com/supermarsx/whoisdigger/main/app/data/availability_model.json";
    wd_ai_mod::download_model(&model_dir, url, "availability_model.json").await
}

#[tauri::command]
async fn ai_predict<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    text: String,
) -> Result<String, String> {
    let data_dir = get_user_data_dir(&app_handle)?;
    let model_dir = data_dir.join("ai");
    let model = wd_ai_mod::load_model(&model_dir, "availability_model.json").await?;
    Ok(wd_ai_mod::predict(&model, &text).to_string())
}

// ─── Wordlist Commands ───────────────────────────────────────────────────────

#[tauri::command]
async fn wordlist_transform(
    content: String,
    operation: String,
    arg1: Option<String>,
    arg2: Option<String>,
) -> Result<String, String> {
    let lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();

    let result = match operation.as_str() {
        "addPrefix" => wd_wordlist_mod::add_prefix(&lines, arg1.as_deref().unwrap_or("")),
        "addSuffix" => wd_wordlist_mod::add_suffix(&lines, arg1.as_deref().unwrap_or("")),
        "sort" => wd_wordlist_mod::sort_lines(&lines),
        "sortReverse" => wd_wordlist_mod::sort_lines_reverse(&lines),
        "shuffle" => wd_wordlist_mod::shuffle_lines(&lines),
        "trimSpaces" => wd_wordlist_mod::trim_spaces(&lines),
        "deleteSpaces" => wd_wordlist_mod::delete_spaces(&lines),
        "deleteBlankLines" => wd_wordlist_mod::delete_blank_lines(&lines),
        "trimNonAlnum" => wd_wordlist_mod::trim_non_alnum(&lines),
        "deleteNonAlnum" => wd_wordlist_mod::delete_non_alnum(&lines),
        "dedupe" => wd_wordlist_mod::dedupe_lines(&lines),
        "deleteLinesContaining" => {
            wd_wordlist_mod::delete_lines_containing(&lines, arg1.as_deref().unwrap_or(""))
        }
        "deleteString" => {
            wd_wordlist_mod::delete_string(&lines, arg1.as_deref().unwrap_or(""))
        }
        "toLowerCase" => wd_wordlist_mod::to_lower_case_lines(&lines),
        "toUpperCase" => wd_wordlist_mod::to_upper_case_lines(&lines),
        "rot13" => wd_wordlist_mod::rot13_lines(&lines),
        "leetSpeak" => wd_wordlist_mod::to_leet_speak_lines(&lines),
        "replaceString" => wd_wordlist_mod::replace_string(
            &lines,
            arg1.as_deref().unwrap_or(""),
            arg2.as_deref().unwrap_or(""),
        ),
        "deleteRegex" => wd_wordlist_mod::delete_regex(&lines, arg1.as_deref().unwrap_or(""))?,
        "trimRegex" => wd_wordlist_mod::trim_regex(&lines, arg1.as_deref().unwrap_or(""))?,
        "replaceRegex" => wd_wordlist_mod::replace_regex(
            &lines,
            arg1.as_deref().unwrap_or(""),
            arg2.as_deref().unwrap_or(""),
        )?,
        _ => return Err(format!("Unknown operation: {}", operation)),
    };

    Ok(result.join("\n"))
}

// ─── Main ────────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .manage(AppData {
            stats_watchers: Mutex::new(HashMap::new()),
            next_watcher_id: Mutex::new(1),
            monitor: AsyncMutex::new(MonitorState { active: false, cancel_token: None }),
            bulk_state: Arc::new(AsyncMutex::new(BulkLookupState { paused: false, stopped: false })),
            proxy_settings: AsyncMutex::new(ProxySettings::default()),
            proxy_rotation: ProxyRotation::new(),
            lookup_settings: AsyncMutex::new(LookupSettings::default()),
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // WHOIS lookups
            whois_lookup,
            whois_lookup_with_settings,
            dns_lookup_cmd,
            rdap_lookup_cmd,
            availability_check,
            availability_check_with_settings,
            availability_params,
            whois_parse,
            // FS operations
            fs_read_file,
            fs_exists,
            fs_stat,
            fs_readdir,
            fs_unlink,
            fs_access,
            fs_write_file,
            fs_mkdir,
            // File info + conversions
            file_info,
            bulk_estimate_time,
            convert_file_size,
            convert_duration,
            // Shell
            shell_open_path,
            // I18n
            i18n_load,
            // App paths
            app_get_base_dir,
            app_get_user_data_path,
            // History
            db_gui_history_get,
            db_gui_history_get_filtered,
            db_gui_history_clear,
            history_merge,
            // Cache
            db_gui_cache_get,
            db_gui_cache_set,
            db_gui_cache_clear,
            cache_merge,
            // Bulk WHOIS
            bulk_whois_lookup,
            bulk_whois_lookup_from_file,
            bulk_whois_lookup_from_content,
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
            // Proxy/Lookup state
            proxy_set_settings,
            proxy_get_settings,
            lookup_set_settings,
            lookup_get_settings,
            // Profiles
            profiles_list,
            profiles_create,
            profiles_rename,
            profiles_delete,
            profiles_set_current,
            profiles_get_current,
            profiles_export,
            profiles_import,
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
            csv_parse_file,
            // BWA
            bwa_analyser_start,
            bwa_render_table_html,
            // Text
            count_lines,
            // Path
            path_join,
            path_basename,
            // AI
            ai_suggest,
            ai_suggest_with_settings,
            ai_download_model,
            ai_predict,
            // Wordlist
            wordlist_transform
        ])
        .setup(|app| {
            // Ensure default profile directory exists
            if let Ok(data_dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(data_dir.join("profiles").join("default"));
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
    use std::fs;
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

    // ── FS operations (test tokio::fs behavior directly, since commands now require AppHandle) ──

    #[tokio::test]
    async fn test_fs_read_file_success() {
        let dir = std::env::temp_dir().join("wd_test_fs_read");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "hello world").unwrap();

        let result = tokio::fs::read_to_string(&file).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "hello world");

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_read_file_not_found() {
        let result = tokio::fs::read_to_string("/non/existent/file.txt").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_fs_exists() {
        let dir = std::env::temp_dir().join("wd_test_fs_exists");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "data").unwrap();

        assert!(tokio::fs::try_exists(&file).await.unwrap_or(false));
        assert!(!tokio::fs::try_exists("/non/existent/file.txt").await.unwrap_or(false));

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_stat() {
        let dir = std::env::temp_dir().join("wd_test_fs_stat");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "12345").unwrap();

        let metadata = tokio::fs::metadata(&file).await.unwrap();
        assert_eq!(metadata.len(), 5);
        assert!(metadata.is_file());
        assert!(!metadata.is_dir());

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_stat_directory() {
        let dir = std::env::temp_dir().join("wd_test_fs_stat_dir");
        let _ = fs::create_dir_all(&dir);

        let metadata = tokio::fs::metadata(&dir).await.unwrap();
        assert!(metadata.is_dir());
        assert!(!metadata.is_file());

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_readdir() {
        let dir = std::env::temp_dir().join("wd_test_fs_readdir");
        let _ = fs::create_dir_all(&dir);
        fs::write(dir.join("a.txt"), "").unwrap();
        fs::write(dir.join("b.txt"), "").unwrap();

        let mut entries = tokio::fs::read_dir(&dir).await.unwrap();
        let mut names = Vec::new();
        while let Some(entry) = entries.next_entry().await.unwrap() {
            names.push(entry.file_name().into_string().unwrap());
        }
        assert!(names.contains(&"a.txt".to_string()));
        assert!(names.contains(&"b.txt".to_string()));

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_write_and_unlink() {
        let dir = std::env::temp_dir().join("wd_test_fs_write");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("output.txt");

        tokio::fs::write(&file, "test content").await.unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "test content");

        tokio::fs::remove_file(&file).await.unwrap();
        assert!(!file.exists());

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_write_creates_parent_dirs() {
        let dir = std::env::temp_dir().join("wd_test_fs_mkdir_write");
        let _ = fs::remove_dir_all(&dir);
        let file = dir.join("sub").join("deep").join("file.txt");

        if let Some(parent) = file.parent() {
            tokio::fs::create_dir_all(parent).await.unwrap();
        }
        tokio::fs::write(&file, "nested").await.unwrap();
        assert_eq!(fs::read_to_string(&file).unwrap(), "nested");

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_access_exists() {
        let dir = std::env::temp_dir().join("wd_test_fs_access");
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("test.txt");
        fs::write(&file, "data").unwrap();

        assert!(tokio::fs::metadata(&file).await.is_ok());
        assert!(tokio::fs::metadata("/non/existent").await.is_err());

        let _ = fs::remove_dir_all(&dir);
    }

    #[tokio::test]
    async fn test_fs_mkdir() {
        let dir = std::env::temp_dir().join("wd_test_fs_mkdir").join("a").join("b");
        let _ = fs::remove_dir_all(std::env::temp_dir().join("wd_test_fs_mkdir"));

        tokio::fs::create_dir_all(&dir).await.unwrap();
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
            "domain": ["a.com", "b.net", "c.com", "d.org"],
            "status": ["available", "unavailable", "available", "error:timeout"],
            "registrar": ["", "GoDaddy", "", "Namecheap"],
            "expirydate": ["", "2030-01-01", "", "2028-06-15"]
        });
        let result = bwa_analyser_start(data).await;
        assert!(result.is_ok());
        let res = result.unwrap();
        assert_eq!(res["total"], 4);
        assert_eq!(res["available"], 2);
        assert_eq!(res["unavailable"], 1);
        assert_eq!(res["expired"], 0);
        assert_eq!(res["errors"], 1);
        assert!((res["availablePercent"].as_f64().unwrap() - 50.0).abs() < 0.1);
        assert!((res["unavailablePercent"].as_f64().unwrap() - 25.0).abs() < 0.1);
        assert!((res["errorPercent"].as_f64().unwrap() - 25.0).abs() < 0.1);

        // Status breakdown
        let sb = res["statusBreakdown"].as_object().unwrap();
        assert_eq!(sb["available"], 2);
        assert_eq!(sb["unavailable"], 1);
        assert_eq!(sb["error:timeout"], 1);

        // TLD distribution
        let tld = res["tldDistribution"].as_object().unwrap();
        assert_eq!(tld["com"], 2);
        assert_eq!(tld["net"], 1);
        assert_eq!(tld["org"], 1);

        // TLD × status
        let tld_a = res["tldAvailable"].as_object().unwrap();
        assert_eq!(tld_a["com"], 2);
        assert!(tld_a.get("net").is_none());

        let tld_u = res["tldUnavailable"].as_object().unwrap();
        assert_eq!(tld_u["net"], 1);

        // Top registrars
        let reg = res["topRegistrars"].as_object().unwrap();
        assert_eq!(reg["GoDaddy"], 1);
        assert_eq!(reg["Namecheap"], 1);
        assert!(reg.get("").is_none()); // empty registrars excluded

        // Data table
        let table = res["data"].as_array().unwrap();
        assert_eq!(table.len(), 4);
        assert_eq!(table[0]["domain"], "a.com");
        assert_eq!(table[0]["tld"], "com");
        assert_eq!(table[1]["registrar"], "GoDaddy");
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
        assert_eq!(res["expired"], 0);
        assert_eq!(res["availablePercent"], 0.0);
        assert_eq!(res["unavailablePercent"], 0.0);
        assert_eq!(res["errorPercent"], 0.0);
        assert!(res["statusBreakdown"].as_object().unwrap().is_empty());
        assert!(res["tldDistribution"].as_object().unwrap().is_empty());
        assert!(res["data"].as_array().unwrap().is_empty());
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
        assert_eq!(result["tldDistribution"]["com"], 2);
        assert_eq!(result["tldAvailable"]["com"], 2);
    }

    #[tokio::test]
    async fn test_bwa_analyser_invalid_data() {
        let data = serde_json::json!("not an object");
        let result = bwa_analyser_start(data).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_bwa_analyser_expired_domains() {
        let data = serde_json::json!({
            "domain": ["old.com", "new.net"],
            "status": ["expired", "unavailable"],
            "registrar": ["RegA", "RegA"],
            "expirydate": ["2020-01-01", "2030-01-01"]
        });
        let res = bwa_analyser_start(data).await.unwrap();
        assert_eq!(res["expired"], 1);
        assert_eq!(res["unavailable"], 1);
        assert_eq!(res["statusBreakdown"]["expired"], 1);
        assert_eq!(res["topRegistrars"]["RegA"], 2);
    }

    #[tokio::test]
    async fn test_bwa_analyser_multi_tld() {
        let data = serde_json::json!({
            "domain": ["a.io", "b.io", "c.io", "d.ai", "e.ai"],
            "status": ["available", "unavailable", "available", "unavailable", "unavailable"]
        });
        let res = bwa_analyser_start(data).await.unwrap();
        assert_eq!(res["tldDistribution"]["io"], 3);
        assert_eq!(res["tldDistribution"]["ai"], 2);
        assert_eq!(res["tldAvailable"]["io"], 2);
        assert!(res["tldAvailable"].get("ai").is_none());
        assert_eq!(res["tldUnavailable"]["io"], 1);
        assert_eq!(res["tldUnavailable"]["ai"], 2);
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
        // Empty text is now correctly identified as "error:nocontent"
        assert_eq!(result, "error:nocontent");
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
            config_size_human: "512 B".into(),
            data_size_human: "2.0 kB".into(),
        };
        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("\"configPath\""));
        assert!(json.contains("\"configSize\""));
        assert!(json.contains("\"readWrite\""));
        assert!(json.contains("\"dataPath\""));
        assert!(json.contains("\"configSizeHuman\""));
        assert!(json.contains("\"dataSizeHuman\""));
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

    // ── byte_to_human_file_size ──────────────────────────────────────────

    #[test]
    fn test_byte_to_human_file_size_zero() {
        assert_eq!(byte_to_human_file_size(0, true), "0 B");
        assert_eq!(byte_to_human_file_size(0, false), "0 B");
    }

    #[test]
    fn test_byte_to_human_file_size_bytes() {
        assert_eq!(byte_to_human_file_size(500, true), "500 B");
        assert_eq!(byte_to_human_file_size(999, true), "999 B");
        assert_eq!(byte_to_human_file_size(1023, false), "1023 B");
    }

    #[test]
    fn test_byte_to_human_file_size_si() {
        assert_eq!(byte_to_human_file_size(1000, true), "1.0 kB");
        assert_eq!(byte_to_human_file_size(1_000_000, true), "1.0 MB");
        assert_eq!(byte_to_human_file_size(1_500_000, true), "1.5 MB");
        assert_eq!(byte_to_human_file_size(1_000_000_000, true), "1.0 GB");
    }

    #[test]
    fn test_byte_to_human_file_size_iec() {
        assert_eq!(byte_to_human_file_size(1024, false), "1.0 KiB");
        assert_eq!(byte_to_human_file_size(1_048_576, false), "1.0 MiB");
        assert_eq!(byte_to_human_file_size(1_073_741_824, false), "1.0 GiB");
    }

    // ── ms_to_human_time ─────────────────────────────────────────────────

    #[test]
    fn test_ms_to_human_time_zero() {
        assert_eq!(ms_to_human_time(0), "-");
    }

    #[test]
    fn test_ms_to_human_time_millis_only() {
        assert_eq!(ms_to_human_time(500), "500 ms");
    }

    #[test]
    fn test_ms_to_human_time_seconds() {
        assert_eq!(ms_to_human_time(5000), "5 s");
        assert_eq!(ms_to_human_time(5500), "5 s 500 ms");
    }

    #[test]
    fn test_ms_to_human_time_minutes() {
        assert_eq!(ms_to_human_time(60_000), "1 m");
        assert_eq!(ms_to_human_time(90_000), "1 m 30 s");
    }

    #[test]
    fn test_ms_to_human_time_hours() {
        assert_eq!(ms_to_human_time(3_600_000), "1 h");
        assert_eq!(ms_to_human_time(7_530_000), "2 h 5 m 30 s");
    }

    #[test]
    fn test_ms_to_human_time_complex() {
        // 1 day, 2 hours, 3 minutes, 4 seconds, 5 ms
        let ms = 24 * 3_600_000 + 2 * 3_600_000 + 3 * 60_000 + 4 * 1_000 + 5;
        let result = ms_to_human_time(ms);
        assert!(result.contains("1 d"));
        assert!(result.contains("2 h"));
        assert!(result.contains("3 m"));
        assert!(result.contains("4 s"));
        assert!(result.contains("5 ms"));
    }

    // ── compute_estimates ────────────────────────────────────────────────

    #[test]
    fn test_compute_estimates_fixed() {
        let (min, max) = compute_estimates(10, 1000, 0, 0, false);
        assert_eq!(min, "10 s");
        assert!(max.is_none());
    }

    #[test]
    fn test_compute_estimates_randomized() {
        let (min, max) = compute_estimates(10, 1000, 500, 2000, true);
        assert_eq!(min, "5 s");
        assert_eq!(max.unwrap(), "20 s");
    }

    #[test]
    fn test_compute_estimates_zero_lines() {
        let (min, max) = compute_estimates(0, 1000, 500, 2000, true);
        assert_eq!(min, "-");
        assert_eq!(max.unwrap(), "-");
    }

    // ── count_lines ─────────────────────────────────────────────────────

    #[test]
    fn test_count_lines_empty() {
        assert_eq!(count_lines(String::new()), 0);
    }

    #[test]
    fn test_count_lines_single_line() {
        assert_eq!(count_lines("hello".into()), 1);
    }

    #[test]
    fn test_count_lines_multiple() {
        assert_eq!(count_lines("a\nb\nc".into()), 3);
    }

    #[test]
    fn test_count_lines_trailing_newline() {
        // "a\nb\n" → split('\n') in JS produces ["a","b",""] → length 3
        assert_eq!(count_lines("a\nb\n".into()), 3);
    }

    // ── html_escape ─────────────────────────────────────────────────────

    #[test]
    fn test_html_escape_plain() {
        assert_eq!(html_escape("hello"), "hello");
    }

    #[test]
    fn test_html_escape_special_chars() {
        assert_eq!(html_escape("<b>bold & \"fine\"</b>"), "&lt;b&gt;bold &amp; &quot;fine&quot;&lt;/b&gt;");
    }

    // ── get_initials ────────────────────────────────────────────────────

    #[test]
    fn test_get_initials_multi_word() {
        assert_eq!(get_initials("expiry date", 1), "ed");
    }

    #[test]
    fn test_get_initials_single_word() {
        assert_eq!(get_initials("domain", 1), "do");
    }

    #[test]
    fn test_get_initials_camel_case() {
        // "expiryDate" has no word boundary split, so it's a single word
        assert_eq!(get_initials("expiryDate", 1), "ex");
    }

    // ── bwa_render_table_html ───────────────────────────────────────────

    #[tokio::test]
    async fn test_bwa_render_table_html_empty() {
        let result = bwa_render_table_html(vec![]).await.unwrap();
        assert_eq!(result["thead"], "");
        assert_eq!(result["tbody"], "");
    }

    #[tokio::test]
    async fn test_bwa_render_table_html_basic() {
        let records = vec![
            serde_json::json!({"domain": "example.com", "status": "available"}),
            serde_json::json!({"domain": "test.org", "status": "unavailable"}),
        ];
        let result = bwa_render_table_html(records).await.unwrap();
        let thead = result["thead"].as_str().unwrap();
        let tbody = result["tbody"].as_str().unwrap();
        assert!(thead.contains("<th>"));
        assert!(thead.contains("domain"));
        assert!(tbody.contains("example.com"));
        assert!(tbody.contains("test.org"));
        assert!(tbody.contains("available"));
        assert!(tbody.contains("unavailable"));
    }

    #[tokio::test]
    async fn test_bwa_render_table_html_escapes() {
        let records = vec![
            serde_json::json!({"name": "<script>alert(1)</script>"}),
        ];
        let result = bwa_render_table_html(records).await.unwrap();
        let tbody = result["tbody"].as_str().unwrap();
        assert!(!tbody.contains("<script>"));
        assert!(tbody.contains("&lt;script&gt;"));
    }
}
