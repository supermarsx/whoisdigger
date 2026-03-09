use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{Manager, Runtime};

use crate::availability::DomainStatus;

#[derive(Serialize, Clone)]
pub struct FileStat {
    pub size: u64,
    #[serde(rename = "mtimeMs")]
    pub mtime_ms: u64,
    pub mtime: Option<String>,
    pub atime: Option<String>,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(rename = "isFile")]
    pub is_file: bool,
}

#[derive(Serialize, Clone)]
pub struct FileInfo {
    pub filename: String,
    pub size: u64,
    #[serde(rename = "humanSize")]
    pub human_size: String,
    #[serde(rename = "mtimeMs")]
    pub mtime_ms: u64,
    #[serde(rename = "mtimeFormatted")]
    pub mtime_formatted: Option<String>,
    #[serde(rename = "atimeFormatted")]
    pub atime_formatted: Option<String>,
    #[serde(rename = "lineCount")]
    pub line_count: usize,
    #[serde(rename = "filePreview")]
    pub file_preview: String,
    #[serde(rename = "minEstimate")]
    pub min_estimate: String,
    #[serde(rename = "maxEstimate")]
    pub max_estimate: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct TimeEstimate {
    pub min: String,
    pub max: Option<String>,
}

#[derive(Serialize, Clone)]
pub struct AppStats {
    pub mtime: Option<u64>,
    pub loaded: bool,
    pub size: u64,
    #[serde(rename = "configPath")]
    pub config_path: String,
    #[serde(rename = "configSize")]
    pub config_size: u64,
    #[serde(rename = "readWrite")]
    pub read_write: bool,
    #[serde(rename = "dataPath")]
    pub data_path: String,
    #[serde(rename = "configSizeHuman")]
    pub config_size_human: String,
    #[serde(rename = "dataSizeHuman")]
    pub data_size_human: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProfileEntry {
    pub id: String,
    pub name: String,
    pub file: String,
    pub mtime: Option<u64>,
}

#[derive(Serialize, Clone)]
pub struct HistoryPage<T> {
    pub entries: Vec<T>,
    pub total: u32,
    pub page: u32,
    #[serde(rename = "pageSize")]
    pub page_size: u32,
}

#[derive(Serialize, Clone)]
pub struct BulkProgress {
    pub sent: u32,
    pub total: u32,
    #[serde(rename = "sentPercent")]
    pub sent_percent: f64,
}

#[derive(Deserialize)]
pub struct ProcessOptions {
    pub prefix: Option<String>,
    pub suffix: Option<String>,
    #[serde(rename = "trimSpaces")]
    pub trim_spaces: Option<bool>,
    #[serde(rename = "deleteBlankLines")]
    pub delete_blank_lines: Option<bool>,
    pub dedupe: Option<bool>,
    pub sort: Option<String>,
}

pub trait PipeRef {
    fn pipe_ref<F, R2>(&self, f: F) -> R2
    where
        F: FnOnce(&Self) -> R2;
}

impl<T> PipeRef for T {
    fn pipe_ref<F, R2>(&self, f: F) -> R2
    where
        F: FnOnce(&Self) -> R2,
    {
        f(self)
    }
}

pub fn byte_to_human_file_size(bytes: u64, si: bool) -> String {
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

pub fn ms_to_human_time(duration_ms: u64) -> String {
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
    if y > 0 {
        parts.push(format!("{} Y", y));
    }
    if mo > 0 {
        parts.push(format!("{} M", mo));
    }
    if w > 0 {
        parts.push(format!("{} w", w));
    }
    if d > 0 {
        parts.push(format!("{} d", d));
    }
    if h > 0 {
        parts.push(format!("{} h", h));
    }
    if m > 0 {
        parts.push(format!("{} m", m));
    }
    if s > 0 {
        parts.push(format!("{} s", s));
    }
    if ms > 0 {
        parts.push(format!("{} ms", ms));
    }

    if parts.is_empty() {
        "-".to_string()
    } else {
        parts.join(" ")
    }
}

pub fn safe_path(base: &Path, sub: &str) -> Result<PathBuf, String> {
    let dest = base.join(sub);
    let canonical_base = base.canonicalize().unwrap_or_else(|_| base.to_path_buf());
    let canonical_dest = resolve_path_safe(&dest);

    if canonical_dest != canonical_base && !canonical_dest.starts_with(&canonical_base) {
        return Err("Invalid path: traversal detected".into());
    }
    Ok(dest)
}

pub fn resolve_path_safe(path: &Path) -> PathBuf {
    if let Ok(canon) = path.canonicalize() {
        return canon;
    }

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

pub fn sanitize_name(name: &str) -> Result<&str, String> {
    if name.is_empty() {
        return Err("Name cannot be empty".into());
    }
    if name.contains('/') || name.contains('\\') || name.contains("..") || name.contains('\0') {
        return Err("Invalid name: contains forbidden characters".into());
    }
    if !name
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '.')
    {
        return Err(
            "Invalid name: only alphanumeric, hyphens, underscores and dots are allowed".into(),
        );
    }
    Ok(name)
}

pub fn get_user_data_dir<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Result<PathBuf, String> {
    let path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

pub fn get_profile_dir<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    profile: &str,
) -> Result<PathBuf, String> {
    let sanitized = sanitize_name(profile)?;
    let mut path = get_user_data_dir(app_handle)?;
    path.push("profiles");
    path.push(sanitized);
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    Ok(path)
}

pub fn get_current_profile<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> Result<String, String> {
    let path = get_user_data_dir(app_handle)?.join("current-profile");
    if path.exists() {
        std::fs::read_to_string(&path)
            .map(|s| {
                let t = s.trim().to_string();
                if t.is_empty() {
                    "default".into()
                } else {
                    t
                }
            })
            .unwrap_or_else(|_| "default".into())
    } else {
        "default".into()
    }
    .pipe_ref(|id| sanitize_name(id).map(|s| s.to_string()))
}

pub fn epoch_ms_from_metadata(metadata: &std::fs::Metadata) -> Option<u64> {
    metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
}

pub fn iso_from_system_time(st: std::time::SystemTime) -> String {
    let duration = st.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let dt = chrono::DateTime::from_timestamp(secs as i64, 0).unwrap_or_default();
    dt.to_rfc3339()
}

pub fn validate_fs_path<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    path: &str,
) -> Result<PathBuf, String> {
    let base = get_user_data_dir(app_handle)?;
    safe_path(
        &base,
        &PathBuf::from(path).strip_prefix(&base).map_or_else(
            |_| path.to_string(),
            |rel| rel.to_string_lossy().to_string(),
        ),
    )
}

pub fn compute_estimates(
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

pub fn domain_status_to_string(status: &DomainStatus) -> String {
    status.as_str().to_string()
}

pub fn extract_tld(domain: &str) -> String {
    domain
        .rsplit('.')
        .next()
        .unwrap_or("unknown")
        .to_lowercase()
}

pub fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

pub fn get_initials(s: &str, threshold: usize) -> String {
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

pub fn get_dir_size(path: &Path) -> u64 {
    let entries: Vec<_> = walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .collect();
    use rayon::prelude::*;
    entries
        .par_iter()
        .filter_map(|entry| entry.metadata().ok())
        .filter(|m| m.is_file())
        .map(|m| m.len())
        .sum()
}

pub fn load_openai_settings_from_json(content: &str) -> Option<crate::ai::OpenAiSettings> {
    let json: serde_json::Value = serde_json::from_str(content).ok()?;
    let ai = json.get("ai")?;
    Some(crate::ai::OpenAiSettings {
        url: ai.get("url").and_then(|v| v.as_str()).map(String::from),
        api_key: ai.get("apiKey").and_then(|v| v.as_str()).map(String::from),
        model: ai.get("model").and_then(|v| v.as_str()).map(String::from),
    })
}

pub type JsonMap = HashMap<String, String>;
