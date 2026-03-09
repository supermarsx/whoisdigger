use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::lookup::LookupSettings;
use crate::proxy::{ProxyRotation, ProxySettings};
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;

pub struct StatsWatcher {
    pub config_path: String,
    pub data_path: String,
}

pub struct MonitorState {
    pub active: bool,
    pub cancel_token: Option<tokio::sync::oneshot::Sender<()>>,
}

pub struct BulkLookupState {
    pub paused: bool,
    pub stopped: bool,
}

pub struct AppData {
    pub stats_watchers: Mutex<HashMap<u32, StatsWatcher>>,
    pub next_watcher_id: Mutex<u32>,
    pub monitor: AsyncMutex<MonitorState>,
    pub bulk_state: Arc<AsyncMutex<BulkLookupState>>,
    pub proxy_settings: AsyncMutex<ProxySettings>,
    pub proxy_rotation: ProxyRotation,
    pub lookup_settings: AsyncMutex<LookupSettings>,
}

impl AppData {
    pub fn new() -> Self {
        Self {
            stats_watchers: Mutex::new(HashMap::new()),
            next_watcher_id: Mutex::new(1),
            monitor: AsyncMutex::new(MonitorState {
                active: false,
                cancel_token: None,
            }),
            bulk_state: Arc::new(AsyncMutex::new(BulkLookupState {
                paused: false,
                stopped: false,
            })),
            proxy_settings: AsyncMutex::new(ProxySettings::default()),
            proxy_rotation: ProxyRotation::new(),
            lookup_settings: AsyncMutex::new(LookupSettings::default()),
        }
    }
}

pub type AppState<'a> = State<'a, AppData>;
