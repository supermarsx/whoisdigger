use std::path::{Path, PathBuf};

use tauri::{Emitter, Runtime};

use crate::tauri_app::{
    state::AppState,
    support::{byte_to_human_file_size, epoch_ms_from_metadata, get_dir_size, AppStats},
};

pub async fn compute_stats_internal(config_path: String, data_path: String) -> AppStats {
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
        if std::fs::OpenOptions::new()
            .read(true)
            .write(true)
            .open(config_p)
            .is_ok()
        {
            read_write = true;
        }
    }

    let dp = PathBuf::from(data_p);
    let size = if dp.exists() {
        tokio::task::spawn_blocking(move || get_dir_size(&dp))
            .await
            .unwrap_or(0)
    } else {
        0
    };

    let config_size_human = byte_to_human_file_size(config_size, true);
    let data_size_human = byte_to_human_file_size(size, true);

    AppStats {
        mtime,
        loaded,
        size,
        config_path,
        config_size,
        read_write,
        data_path,
        config_size_human,
        data_size_human,
    }
}

#[tauri::command]
pub async fn stats_get(config_path: String, data_path: String) -> Result<AppStats, String> {
    Ok(compute_stats_internal(config_path, data_path).await)
}

#[tauri::command]
pub async fn stats_start<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: AppState<'_>,
    config_path: String,
    data_path: String,
) -> Result<u32, String> {
    let id = {
        let mut watchers = data.stats_watchers.lock().unwrap();
        let mut next_id = data.next_watcher_id.lock().unwrap();
        let id = *next_id;
        *next_id += 1;
        watchers.insert(
            id,
            crate::tauri_app::state::StatsWatcher {
                config_path: config_path.clone(),
                data_path: data_path.clone(),
            },
        );
        id
    };

    let stats = compute_stats_internal(config_path, data_path).await;
    let _ = app_handle.emit("stats:update", stats);
    Ok(id)
}

#[tauri::command]
pub async fn stats_refresh<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: AppState<'_>,
    id: u32,
) -> Result<(), String> {
    let watcher = {
        let watchers = data.stats_watchers.lock().unwrap();
        watchers
            .get(&id)
            .map(|w| (w.config_path.clone(), w.data_path.clone()))
    };

    if let Some((config_path, data_path)) = watcher {
        let stats = compute_stats_internal(config_path, data_path).await;
        let _ = app_handle.emit("stats:update", stats);
    }
    Ok(())
}

#[tauri::command]
pub async fn stats_stop(data: AppState<'_>, id: u32) -> Result<(), String> {
    data.stats_watchers.lock().unwrap().remove(&id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::compute_stats_internal;

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
        )
        .await;

        assert!(stats.loaded);
        assert_eq!(stats.config_size, 14);
        assert!(stats.read_write);
    }
}
