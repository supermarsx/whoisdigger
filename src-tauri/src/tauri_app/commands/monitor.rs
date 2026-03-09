use crate::{availability::is_domain_available, perform_lookup};
use tauri::{Emitter, Runtime};

use crate::tauri_app::{state::AppState, support::domain_status_to_string};

#[tauri::command]
pub async fn monitor_start<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    data: AppState<'_>,
) -> Result<(), String> {
    let mut monitor = data.monitor.lock().await;
    if monitor.active {
        return Ok(());
    }

    let (tx, mut rx) = tokio::sync::oneshot::channel();
    monitor.active = true;
    monitor.cancel_token = Some(tx);

    let app = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::select! {
                _ = &mut rx => break,
                _ = tokio::time::sleep(tokio::time::Duration::from_secs(60)) => {
                    let _ = app.emit("monitor:heartbeat", ());
                }
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn monitor_stop(data: AppState<'_>) -> Result<(), String> {
    let mut monitor = data.monitor.lock().await;
    if let Some(tx) = monitor.cancel_token.take() {
        let _ = tx.send(());
    }
    monitor.active = false;
    Ok(())
}

#[tauri::command]
pub async fn monitor_lookup<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    domain: String,
) -> Result<(), String> {
    let result = perform_lookup(&domain, 10000).await;
    let status = match result {
        Ok(ref res) => domain_status_to_string(&is_domain_available(res)),
        Err(_) => "error".to_string(),
    };
    let _ = app_handle.emit(
        "monitor:update",
        serde_json::json!({ "domain": domain, "status": status }),
    );
    Ok(())
}
