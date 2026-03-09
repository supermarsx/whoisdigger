use tauri::Runtime;

use crate::tauri_app::support::{
    byte_to_human_file_size, compute_estimates, epoch_ms_from_metadata, iso_from_system_time,
    ms_to_human_time, validate_fs_path, FileInfo, FileStat, TimeEstimate,
};

#[tauri::command]
pub async fn fs_read_file<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<String, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::read_to_string(&validated)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_exists<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<bool, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    Ok(tokio::fs::try_exists(&validated).await.unwrap_or(false))
}

#[tauri::command]
pub async fn fs_stat<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<FileStat, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    let metadata = tokio::fs::metadata(&validated)
        .await
        .map_err(|e| e.to_string())?;
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
pub async fn fs_readdir<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<Vec<String>, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    let mut entries = tokio::fs::read_dir(&validated)
        .await
        .map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        if let Ok(name) = entry.file_name().into_string() {
            names.push(name);
        }
    }
    Ok(names)
}

#[tauri::command]
pub async fn fs_unlink<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::remove_file(&validated)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_access<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::metadata(&validated)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_write_file<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
    content: String,
) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    if let Some(parent) = validated.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    tokio::fs::write(&validated, content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fs_mkdir<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<(), String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    tokio::fs::create_dir_all(&validated)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn file_info<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
    si: Option<bool>,
    time_between: Option<u64>,
    time_between_min: Option<u64>,
    time_between_max: Option<u64>,
    randomize: Option<bool>,
) -> Result<FileInfo, String> {
    let validated = validate_fs_path(&app_handle, &path)?;
    let metadata = tokio::fs::metadata(&validated)
        .await
        .map_err(|e| e.to_string())?;
    let content = tokio::fs::read_to_string(&validated)
        .await
        .map_err(|e| e.to_string())?;

    let use_si = si.unwrap_or(true);
    let line_count = content.lines().count();
    let file_preview = if content.len() > 50 {
        content[..50].to_string()
    } else {
        content.clone()
    };

    let mtime_ms = epoch_ms_from_metadata(&metadata).unwrap_or(0);
    let mtime_formatted = metadata.modified().ok().map(iso_from_system_time);
    let atime_formatted = metadata.accessed().ok().map(iso_from_system_time);

    let filename = validated
        .file_name()
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

#[tauri::command]
pub async fn bulk_estimate_time(
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

#[tauri::command]
pub async fn convert_file_size(bytes: u64, si: Option<bool>) -> String {
    byte_to_human_file_size(bytes, si.unwrap_or(true))
}

#[tauri::command]
pub async fn convert_duration(duration_ms: u64) -> String {
    ms_to_human_time(duration_ms)
}
