use std::path::{Path, PathBuf};

#[tauri::command]
pub async fn path_join(parts: Vec<String>) -> String {
    let mut result = PathBuf::new();
    for p in parts {
        result.push(p);
    }
    result.to_string_lossy().to_string()
}

#[tauri::command]
pub async fn path_basename(path: String) -> String {
    Path::new(&path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default()
}
