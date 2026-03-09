use tauri::Runtime;
use tauri_plugin_shell::ShellExt;

#[tauri::command]
#[allow(deprecated)]
pub async fn shell_open_path<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    path: String,
) -> Result<(), String> {
    app_handle
        .shell()
        .open(path, None)
        .map_err(|e| e.to_string())
}
