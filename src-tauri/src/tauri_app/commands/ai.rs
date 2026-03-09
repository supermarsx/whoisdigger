use crate::ai::{self as wd_ai_mod, OpenAiSettings};
use tauri::Runtime;

use crate::tauri_app::support::{get_user_data_dir, load_openai_settings_from_json};

#[tauri::command]
pub async fn ai_suggest<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    prompt: String,
    count: usize,
) -> Result<Vec<String>, String> {
    let settings = match load_openai_settings_from_profile(&app_handle) {
        Some(s) => s,
        None => OpenAiSettings::default(),
    };
    wd_ai_mod::suggest_words(&settings, &prompt, count).await
}

fn load_openai_settings_from_profile<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
) -> Option<OpenAiSettings> {
    let base = get_user_data_dir(app_handle).ok()?;
    let settings_path = base.join("settings.json");
    let content = std::fs::read_to_string(settings_path).ok()?;
    load_openai_settings_from_json(&content)
}

#[tauri::command]
pub async fn ai_suggest_with_settings(
    prompt: String,
    count: usize,
    url: Option<String>,
    api_key: Option<String>,
    model: Option<String>,
) -> Result<Vec<String>, String> {
    let settings = OpenAiSettings {
        url,
        api_key,
        model,
    };
    wd_ai_mod::suggest_words(&settings, &prompt, count).await
}

#[tauri::command]
pub async fn ai_download_model<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let data_dir = get_user_data_dir(&app_handle)?;
    let model_dir = data_dir.join("ai");
    let url = "https://raw.githubusercontent.com/supermarsx/whoisdigger/main/app/data/availability_model.json";
    wd_ai_mod::download_model(&model_dir, url, "availability_model.json").await
}

#[tauri::command]
pub async fn ai_predict<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    text: String,
) -> Result<String, String> {
    let data_dir = get_user_data_dir(&app_handle)?;
    let model_dir = data_dir.join("ai");
    let model = wd_ai_mod::load_model(&model_dir, "availability_model.json").await?;
    Ok(wd_ai_mod::predict(&model, &text).to_string())
}
