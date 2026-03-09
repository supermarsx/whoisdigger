use crate::types::*;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

// ─── Failure Tracking ────────────────────────────────────────────────────────

struct FailureInfo {
    count: u32,
    last_failure: Instant,
}

// ─── Proxy Rotation ──────────────────────────────────────────────────────────

/// Thread-safe proxy rotation manager with failure tracking and cooldown.
///
/// Supports ascending (round-robin), descending, and random strategies.
/// Proxies that exceed the configured retry limit are automatically skipped
/// until the cooldown period expires (default 5 minutes).
pub struct ProxyRotation {
    index: Mutex<usize>,
    failures: Mutex<HashMap<String, FailureInfo>>,
    failure_expiry: Duration,
}

impl Default for ProxyRotation {
    fn default() -> Self {
        Self::new()
    }
}

impl ProxyRotation {
    pub fn new() -> Self {
        Self {
            index: Mutex::new(0),
            failures: Mutex::new(HashMap::new()),
            failure_expiry: Duration::from_secs(5 * 60),
        }
    }

    /// Create a rotation manager with a custom failure expiry duration.
    pub fn with_expiry(expiry: Duration) -> Self {
        Self {
            index: Mutex::new(0),
            failures: Mutex::new(HashMap::new()),
            failure_expiry: expiry,
        }
    }

    pub fn reset(&self) {
        *self.index.lock().unwrap() = 0;
        self.failures.lock().unwrap().clear();
    }

    pub fn report_failure(&self, proxy: &ProxyInfo) {
        let key = proxy.key();
        let mut failures = self.failures.lock().unwrap();
        let entry = failures.entry(key).or_insert(FailureInfo {
            count: 0,
            last_failure: Instant::now(),
        });
        entry.count += 1;
        entry.last_failure = Instant::now();
    }

    pub fn report_success(&self, proxy: &ProxyInfo) {
        self.failures.lock().unwrap().remove(&proxy.key());
    }

    /// Return the current failure count for a given proxy, or 0 if healthy.
    pub fn failure_count(&self, proxy: &ProxyInfo) -> u32 {
        self.failures
            .lock()
            .unwrap()
            .get(&proxy.key())
            .map(|f| f.count)
            .unwrap_or(0)
    }

    /// Select the next proxy based on settings.
    pub fn get_proxy(&self, settings: &ProxySettings) -> Option<ProxyInfo> {
        if !settings.enable {
            return None;
        }

        self.cleanup_failures();

        let owned_entries: Vec<ProxyEntry> = match settings.mode {
            ProxyMode::Single => {
                if let Some(ref s) = settings.single {
                    vec![ProxyEntry::Plain(s.clone())]
                } else {
                    return None;
                }
            }
            ProxyMode::Multi => settings.list.clone(),
        };

        let refs: Vec<&ProxyEntry> = owned_entries.iter().collect();
        self.select_from_entries(&refs, settings)
    }

    fn select_from_entries(
        &self,
        list: &[&ProxyEntry],
        settings: &ProxySettings,
    ) -> Option<ProxyInfo> {
        if list.is_empty() {
            return None;
        }

        let max_retries = settings.retries.unwrap_or(0);
        let failures = self.failures.lock().unwrap();
        let mut idx = self.index.lock().unwrap();

        for _ in 0..list.len() {
            let entry_idx = match settings.multimode {
                ProxyMultiMode::Random => {
                    use rand::Rng;
                    rand::thread_rng().gen_range(0..list.len())
                }
                ProxyMultiMode::Ascending => {
                    let i = *idx;
                    *idx = (*idx + 1) % list.len();
                    i
                }
                ProxyMultiMode::Descending => {
                    if *idx == 0 {
                        *idx = list.len() - 1;
                    } else {
                        *idx -= 1;
                    }
                    *idx
                }
            };

            let entry = list[entry_idx];
            let info = parse_proxy_entry(
                entry,
                settings.username.as_deref(),
                settings.password.as_deref(),
            );
            if let Some(ref info) = info {
                if max_retries > 0 {
                    if let Some(fi) = failures.get(&info.key()) {
                        if fi.count >= max_retries {
                            continue;
                        }
                    }
                }
                return Some(info.clone());
            }
        }

        None
    }

    fn cleanup_failures(&self) {
        let now = Instant::now();
        let mut failures = self.failures.lock().unwrap();
        failures.retain(|_, info| now.duration_since(info.last_failure) < self.failure_expiry);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rotation_ascending() {
        let rot = ProxyRotation::new();
        let settings = ProxySettings {
            enable: true,
            mode: ProxyMode::Multi,
            multimode: ProxyMultiMode::Ascending,
            list: vec![
                ProxyEntry::Plain("1.1.1.1:80".into()),
                ProxyEntry::Plain("2.2.2.2:80".into()),
            ],
            ..Default::default()
        };
        let p1 = rot.get_proxy(&settings).unwrap();
        assert_eq!(p1.ipaddress, "1.1.1.1");
        let p2 = rot.get_proxy(&settings).unwrap();
        assert_eq!(p2.ipaddress, "2.2.2.2");
        let p3 = rot.get_proxy(&settings).unwrap();
        assert_eq!(p3.ipaddress, "1.1.1.1");
    }

    #[test]
    fn test_rotation_descending() {
        let rot = ProxyRotation::new();
        let settings = ProxySettings {
            enable: true,
            mode: ProxyMode::Multi,
            multimode: ProxyMultiMode::Descending,
            list: vec![
                ProxyEntry::Plain("1.1.1.1:80".into()),
                ProxyEntry::Plain("2.2.2.2:80".into()),
                ProxyEntry::Plain("3.3.3.3:80".into()),
            ],
            ..Default::default()
        };
        // Descending starts from the end
        let p1 = rot.get_proxy(&settings).unwrap();
        assert_eq!(p1.ipaddress, "3.3.3.3");
        let p2 = rot.get_proxy(&settings).unwrap();
        assert_eq!(p2.ipaddress, "2.2.2.2");
        let p3 = rot.get_proxy(&settings).unwrap();
        assert_eq!(p3.ipaddress, "1.1.1.1");
    }

    #[test]
    fn test_rotation_disabled() {
        let rot = ProxyRotation::new();
        let settings = ProxySettings {
            enable: false,
            ..Default::default()
        };
        assert!(rot.get_proxy(&settings).is_none());
    }

    #[test]
    fn test_failure_tracking() {
        let rot = ProxyRotation::new();
        let proxy = ProxyInfo {
            ipaddress: "1.1.1.1".into(),
            port: 80,
            auth: None,
        };
        rot.report_failure(&proxy);
        rot.report_failure(&proxy);
        rot.report_failure(&proxy);
        assert_eq!(rot.failure_count(&proxy), 3);

        let settings = ProxySettings {
            enable: true,
            mode: ProxyMode::Multi,
            multimode: ProxyMultiMode::Ascending,
            retries: Some(3),
            list: vec![ProxyEntry::Plain("1.1.1.1:80".into())],
            ..Default::default()
        };
        // Should skip the failed proxy
        assert!(rot.get_proxy(&settings).is_none());

        // After success report, it should work again
        rot.report_success(&proxy);
        assert_eq!(rot.failure_count(&proxy), 0);
        assert!(rot.get_proxy(&settings).is_some());
    }

    #[test]
    fn test_reset() {
        let rot = ProxyRotation::new();
        let settings = ProxySettings {
            enable: true,
            mode: ProxyMode::Multi,
            multimode: ProxyMultiMode::Ascending,
            list: vec![
                ProxyEntry::Plain("1.1.1.1:80".into()),
                ProxyEntry::Plain("2.2.2.2:80".into()),
            ],
            ..Default::default()
        };
        rot.get_proxy(&settings);
        rot.get_proxy(&settings);
        rot.reset();
        let p = rot.get_proxy(&settings).unwrap();
        assert_eq!(p.ipaddress, "1.1.1.1");
    }

    #[test]
    fn test_custom_expiry() {
        let rot = ProxyRotation::with_expiry(std::time::Duration::from_secs(1));
        let proxy = ProxyInfo {
            ipaddress: "1.1.1.1".into(),
            port: 80,
            auth: None,
        };
        rot.report_failure(&proxy);
        assert_eq!(rot.failure_count(&proxy), 1);
    }
}
