use std::sync::Arc;

use crate::{
    availability::{get_domain_parameters, is_domain_available},
    export::{export_results, BulkResult, ExportOpts},
    perform_lookup_with_settings,
};
use futures::future::join_all;
use rayon::prelude::*;
use tauri::{Emitter, Runtime};
use tokio::sync::Semaphore;

use crate::tauri_app::{
    state::AppState,
    support::{domain_status_to_string, BulkProgress},
};

#[tauri::command]
pub async fn bulk_whois_lookup<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: AppState<'_>,
    domains: Vec<String>,
    tlds: Option<Vec<String>>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    {
        let mut state = data.bulk_state.lock().await;
        state.paused = false;
        state.stopped = false;
    }

    let expanded_domains = if let Some(ref tld_list) = tlds {
        if !tld_list.is_empty() {
            let mut expanded = Vec::new();
            for domain in &domains {
                let base = domain.split('.').next().unwrap_or(domain);
                for tld in tld_list {
                    let tld_clean = tld.trim_start_matches('.');
                    expanded.push(format!("{}.{}", base, tld_clean));
                }
            }
            expanded
        } else {
            domains
        }
    } else {
        domains
    };

    let lookup_settings = data.lookup_settings.lock().await.clone();
    let total = expanded_domains.len() as u32;
    let semaphore = Arc::new(Semaphore::new(concurrency));
    let mut tasks = Vec::new();
    let sent_counter = Arc::new(tokio::sync::Mutex::new(0u32));
    let per_domain_timeout = if timeout_ms > 0 {
        Some(tokio::time::Duration::from_millis(timeout_ms))
    } else {
        None
    };

    for domain in expanded_domains {
        let sem = Arc::clone(&semaphore);
        let app = app_handle.clone();
        let sent = Arc::clone(&sent_counter);
        let bulk_state = Arc::clone(&data.bulk_state);
        let settings = lookup_settings.clone();
        let domain_timeout = per_domain_timeout;

        tasks.push(tokio::spawn(async move {
            {
                let state = bulk_state.lock().await;
                if state.stopped {
                    return BulkResult {
                        domain,
                        data: None,
                        error: Some("Stopped".into()),
                        status: "error".into(),
                        params: None,
                    };
                }
            }

            loop {
                let state = bulk_state.lock().await;
                if state.stopped {
                    return BulkResult {
                        domain,
                        data: None,
                        error: Some("Stopped".into()),
                        status: "error".into(),
                        params: None,
                    };
                }
                if !state.paused {
                    break;
                }
                drop(state);
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            }

            let _permit = match sem.acquire().await {
                Ok(p) => p,
                Err(_) => {
                    return BulkResult {
                        domain,
                        data: None,
                        error: Some("Semaphore closed".into()),
                        status: "error".into(),
                        params: None,
                    }
                }
            };

            let lookup_future = perform_lookup_with_settings(&domain, &settings);
            let lookup_result = if let Some(timeout_dur) = domain_timeout {
                match tokio::time::timeout(timeout_dur, lookup_future).await {
                    Ok(res) => res,
                    Err(_) => Err(format!("Timeout after {}ms", timeout_dur.as_millis())),
                }
            } else {
                lookup_future.await
            };

            let (data_val, err, status, params) = match lookup_result {
                Ok(res) => {
                    let s = is_domain_available(&res);
                    let p =
                        get_domain_parameters(Some(domain.clone()), Some(s.clone()), res.clone());
                    let s_str = domain_status_to_string(&s);
                    (Some(res), None, s_str, Some(p))
                }
                Err(e) => (None, Some(e.to_string()), "error".to_string(), None),
            };

            let mut s = sent.lock().await;
            *s += 1;
            let pct = if total > 0 {
                ((*s as f64 / total as f64) * 1000.0).round() / 10.0
            } else {
                0.0
            };
            let _ = app.emit(
                "bulk:status",
                BulkProgress {
                    sent: *s,
                    total,
                    sent_percent: pct,
                },
            );

            BulkResult {
                domain,
                data: data_val,
                error: err,
                status,
                params,
            }
        }));
    }

    let results = join_all(tasks).await;
    Ok(results.into_iter().filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn bulk_whois_pause(data: AppState<'_>) -> Result<(), String> {
    data.bulk_state.lock().await.paused = true;
    Ok(())
}

#[tauri::command]
pub async fn bulk_whois_continue(data: AppState<'_>) -> Result<(), String> {
    data.bulk_state.lock().await.paused = false;
    Ok(())
}

#[tauri::command]
pub async fn bulk_whois_stop(data: AppState<'_>) -> Result<(), String> {
    let mut state = data.bulk_state.lock().await;
    state.stopped = true;
    state.paused = false;
    Ok(())
}

#[tauri::command]
pub async fn bulk_whois_lookup_from_file<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: AppState<'_>,
    path: String,
    tlds: Option<Vec<String>>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    let raw = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path, e))?;
    let domains: Vec<String> = tokio::task::spawn_blocking(move || {
        raw.par_lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect()
    })
    .await
    .map_err(|e| e.to_string())?;

    bulk_whois_lookup(app_handle, data, domains, tlds, concurrency, timeout_ms).await
}

#[tauri::command]
pub async fn bulk_whois_lookup_from_content<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: AppState<'_>,
    content: String,
    tlds: Option<Vec<String>>,
    concurrency: usize,
    timeout_ms: u64,
) -> Result<Vec<BulkResult>, String> {
    let domains: Vec<String> = tokio::task::spawn_blocking(move || {
        content
            .par_lines()
            .map(|l| l.trim().to_string())
            .filter(|l| !l.is_empty())
            .collect()
    })
    .await
    .map_err(|e| e.to_string())?;

    bulk_whois_lookup(app_handle, data, domains, tlds, concurrency, timeout_ms).await
}

#[tauri::command]
pub async fn bulk_whois_export(
    results: Vec<BulkResult>,
    options: ExportOpts,
    path: String,
) -> Result<(), String> {
    export_results(&results, &options, &path)
}
