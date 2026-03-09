use std::collections::HashMap;

use crate::{
    availability::{
        get_domain_parameters, is_domain_available, is_domain_available_with_settings,
        AvailabilitySettings, DomainStatus, WhoisParams,
    },
    db_history_add, dns_lookup,
    lookup::LookupSettings,
    parser::parse_raw_data,
    perform_lookup_with_settings, rdap_lookup,
};
use tauri::Runtime;

use crate::tauri_app::{
    state::AppState,
    support::{domain_status_to_string, get_current_profile, get_profile_dir},
};

#[tauri::command]
pub async fn whois_lookup<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: AppState<'_>,
    domain: String,
) -> Result<String, String> {
    let settings = data.lookup_settings.lock().await.clone();
    let result: String = perform_lookup_with_settings(&domain, &settings).await?;
    log_lookup_history(&app_handle, &domain, &result).await?;
    Ok(result)
}

#[tauri::command]
pub async fn whois_lookup_with_settings<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    domain: String,
    settings: LookupSettings,
) -> Result<String, String> {
    let result: String = perform_lookup_with_settings(&domain, &settings).await?;
    log_lookup_history(&app_handle, &domain, &result).await?;
    Ok(result)
}

async fn log_lookup_history<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    domain: &str,
    result: &str,
) -> Result<(), String> {
    let profile = get_current_profile(app_handle)?;
    let path = get_profile_dir(app_handle, &profile)?.join(format!("history-{}.sqlite", profile));
    let status_str = domain_status_to_string(&is_domain_available(result));
    let path_str = path.to_string_lossy().to_string();
    let domain_owned = domain.to_string();
    let _ =
        tokio::task::spawn_blocking(move || db_history_add(&path_str, &domain_owned, &status_str))
            .await;
    Ok(())
}

#[tauri::command]
pub async fn dns_lookup_cmd(domain: String) -> Result<bool, String> {
    dns_lookup(&domain).await
}

#[tauri::command]
pub async fn rdap_lookup_cmd(domain: String) -> Result<String, String> {
    rdap_lookup(&domain).await
}

#[tauri::command]
pub async fn availability_check(text: String) -> String {
    domain_status_to_string(&is_domain_available(&text))
}

#[tauri::command]
pub async fn availability_check_with_settings(
    text: String,
    settings: AvailabilitySettings,
) -> String {
    domain_status_to_string(&is_domain_available_with_settings(&text, &settings))
}

#[tauri::command]
pub async fn availability_params(
    domain: Option<String>,
    status: Option<DomainStatus>,
    text: String,
) -> WhoisParams {
    get_domain_parameters(domain, status, text)
}

#[tauri::command]
pub async fn whois_parse(text: String) -> HashMap<String, String> {
    parse_raw_data(&text)
}
