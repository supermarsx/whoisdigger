use std::io::Write;

use tauri::Runtime;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;

use crate::tauri_app::support::{
    epoch_ms_from_metadata, get_profile_dir, get_user_data_dir, sanitize_name, ProfileEntry,
};

#[tauri::command]
pub async fn profiles_list<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
) -> Result<Vec<ProfileEntry>, String> {
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    if !profiles_dir.exists() {
        let _ = tokio::fs::create_dir_all(profiles_dir.join("default")).await;
    }

    let mut entries = tokio::fs::read_dir(&profiles_dir)
        .await
        .map_err(|e| e.to_string())?;
    let mut profiles = Vec::new();

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if path.is_dir() {
            let name = entry.file_name().into_string().unwrap_or_default();
            let mtime = path
                .join("settings.json")
                .metadata()
                .ok()
                .and_then(|m| epoch_ms_from_metadata(&m));
            profiles.push(ProfileEntry {
                id: name.clone(),
                name,
                file: path.to_string_lossy().to_string(),
                mtime,
            });
        }
    }

    if profiles.is_empty() {
        let default_dir = profiles_dir.join("default");
        let _ = tokio::fs::create_dir_all(&default_dir).await;
        profiles.push(ProfileEntry {
            id: "default".into(),
            name: "default".into(),
            file: default_dir.to_string_lossy().into(),
            mtime: None,
        });
    }

    Ok(profiles)
}

#[tauri::command]
pub async fn profiles_create<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    name: String,
    copy_current: Option<bool>,
) -> Result<ProfileEntry, String> {
    sanitize_name(&name)?;
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let new_dir = profiles_dir.join(&name);
    tokio::fs::create_dir_all(&new_dir)
        .await
        .map_err(|e| e.to_string())?;

    if copy_current.unwrap_or(false) {
        let current = profiles_dir.join("default");
        if current.exists() {
            let mut src_entries = tokio::fs::read_dir(&current)
                .await
                .map_err(|e| e.to_string())?;
            while let Some(entry) = src_entries.next_entry().await.map_err(|e| e.to_string())? {
                let _ = tokio::fs::copy(entry.path(), new_dir.join(entry.file_name())).await;
            }
        }
    }

    Ok(ProfileEntry {
        id: name.clone(),
        name,
        file: new_dir.to_string_lossy().into(),
        mtime: None,
    })
}

#[tauri::command]
pub async fn profiles_rename<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    id: String,
    new_name: String,
) -> Result<(), String> {
    sanitize_name(&id)?;
    sanitize_name(&new_name)?;
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let old = profiles_dir.join(&id);
    let new_path = profiles_dir.join(&new_name);
    if old.exists() {
        tokio::fs::rename(old, new_path)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn profiles_delete<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    id: String,
) -> Result<(), String> {
    sanitize_name(&id)?;
    if id == "default" {
        return Err("Cannot delete the default profile".into());
    }
    let dir = get_user_data_dir(&app_handle)?.join("profiles").join(&id);
    if dir.exists() {
        tokio::fs::remove_dir_all(dir)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn profiles_set_current<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    id: String,
) -> Result<(), String> {
    sanitize_name(&id)?;
    let path = get_user_data_dir(&app_handle)?.join("current-profile");
    tokio::fs::write(path, &id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn profiles_get_current<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
) -> Result<String, String> {
    let path = get_user_data_dir(&app_handle)?.join("current-profile");
    if path.exists() {
        tokio::fs::read_to_string(path)
            .await
            .map_err(|e| e.to_string())
    } else {
        Ok("default".into())
    }
}

#[tauri::command]
pub async fn profiles_export<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    id: Option<String>,
) -> Result<String, String> {
    let profile_id = id.unwrap_or_else(|| "default".into());
    sanitize_name(&profile_id)?;
    let profile_dir = get_profile_dir(&app_handle, &profile_id)?;

    let zip_path =
        get_user_data_dir(&app_handle)?.join(format!("profile-export-{}.zip", profile_id));
    let file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let zip_opts =
        SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    for entry in WalkDir::new(&profile_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_file() {
            let rel = entry
                .path()
                .strip_prefix(&profile_dir)
                .map_err(|e| e.to_string())?;
            zip.start_file(rel.to_string_lossy(), zip_opts)
                .map_err(|e| e.to_string())?;
            zip.write_all(&std::fs::read(entry.path()).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn profiles_import<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    zip_path: String,
    profile_name: String,
) -> Result<ProfileEntry, String> {
    sanitize_name(&profile_name)?;
    let profiles_dir = get_user_data_dir(&app_handle)?.join("profiles");
    let dest_dir = profiles_dir.join(&profile_name);
    tokio::fs::create_dir_all(&dest_dir)
        .await
        .map_err(|e| e.to_string())?;

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

    Ok(ProfileEntry {
        id: profile_name.clone(),
        name: profile_name,
        file: dest_dir.to_string_lossy().into(),
        mtime: None,
    })
}
