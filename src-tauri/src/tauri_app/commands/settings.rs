use crate::{lookup::LookupSettings, proxy::ProxySettings};
use tauri::Runtime;

use crate::tauri_app::{
    state::AppState,
    support::{get_user_data_dir, safe_path, sanitize_name},
};

#[tauri::command]
pub async fn settings_load<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    filename: String,
) -> Result<String, String> {
    sanitize_name(&filename)?;
    let base = get_user_data_dir(&app_handle)?;
    let path = safe_path(&base, &filename)?;
    if !path.exists() {
        return Ok("{}".to_string());
    }
    tokio::fs::read_to_string(path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn settings_save<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    filename: String,
    content: String,
) -> Result<(), String> {
    sanitize_name(&filename)?;
    let base = get_user_data_dir(&app_handle)?;
    let path = safe_path(&base, &filename)?;
    tokio::fs::write(path, content)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn config_delete<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    filename: String,
) -> Result<(), String> {
    sanitize_name(&filename)?;
    let base = get_user_data_dir(&app_handle)?;
    let path = safe_path(&base, &filename)?;
    if path.exists() {
        tokio::fs::remove_file(path)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn proxy_set_settings(data: AppState<'_>, settings: ProxySettings) -> Result<(), String> {
    *data.proxy_settings.lock().await = settings;
    data.proxy_rotation.reset();
    Ok(())
}

#[tauri::command]
pub async fn proxy_get_settings(data: AppState<'_>) -> Result<ProxySettings, String> {
    Ok(data.proxy_settings.lock().await.clone())
}

#[tauri::command]
pub async fn lookup_set_settings(
    data: AppState<'_>,
    settings: LookupSettings,
) -> Result<(), String> {
    *data.lookup_settings.lock().await = settings;
    Ok(())
}

#[tauri::command]
pub async fn lookup_get_settings(data: AppState<'_>) -> Result<LookupSettings, String> {
    Ok(data.lookup_settings.lock().await.clone())
}

#[tauri::command]
pub async fn config_export<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?.join("settings.json");
    if path.exists() {
        tokio::fs::read_to_string(path)
            .await
            .map_err(|e| e.to_string())
    } else {
        Ok("{}".into())
    }
}

#[tauri::command]
pub async fn config_import<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    content: String,
) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    let path = get_user_data_dir(&app_handle)?.join("settings.json");
    tokio::fs::write(path, content)
        .await
        .map_err(|e| e.to_string())
}
