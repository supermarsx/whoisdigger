use tauri::{Manager, Runtime};

use crate::tauri_app::support::get_user_data_dir;

#[tauri::command]
pub async fn i18n_load<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    lang: String,
) -> Result<serde_json::Value, String> {
    let filename = format!("{}.json", lang);

    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        for prefix in &["dist/app/locales", "locales"] {
            let path = resource_dir.join(prefix).join(&filename);
            if path.exists() {
                let raw = tokio::fs::read_to_string(path)
                    .await
                    .map_err(|e| e.to_string())?;
                return serde_json::from_str(&raw).map_err(|e| e.to_string());
            }
        }
    }

    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    for prefix in &["dist/app/locales", "app/locales"] {
        let path = cwd.join(prefix).join(&filename);
        if path.exists() {
            let raw = tokio::fs::read_to_string(path)
                .await
                .map_err(|e| e.to_string())?;
            return serde_json::from_str(&raw).map_err(|e| e.to_string());
        }
    }

    Ok(serde_json::json!({}))
}

#[tauri::command]
pub async fn app_get_base_dir() -> Result<String, String> {
    let path = std::env::current_dir().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn app_get_user_data_path<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?;
    Ok(path.to_string_lossy().to_string())
}
