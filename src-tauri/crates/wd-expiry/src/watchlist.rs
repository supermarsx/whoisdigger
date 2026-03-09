use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Priority level for a watched domain.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum WatchPriority {
    Low,
    Medium,
    High,
    Critical,
}

impl Default for WatchPriority {
    fn default() -> Self {
        Self::Medium
    }
}

/// A domain on the watchlist.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WatchEntry {
    pub id: Option<i64>,
    pub domain: String,
    pub priority: WatchPriority,
    pub added_at: DateTime<Utc>,
    pub last_checked: Option<DateTime<Utc>>,
    /// Last known expiry date from WHOIS.
    pub expiry_date: Option<DateTime<Utc>>,
    /// Last known registrar.
    pub registrar: Option<String>,
    /// Whether notifications are enabled for this entry.
    pub notify: bool,
    /// Optional notes/tags.
    pub notes: Option<String>,
    /// Whether this entry is active (paused entries aren't polled).
    pub active: bool,
}

impl WatchEntry {
    pub fn new(domain: impl Into<String>) -> Self {
        Self {
            id: None,
            domain: domain.into(),
            priority: WatchPriority::default(),
            added_at: Utc::now(),
            last_checked: None,
            expiry_date: None,
            registrar: None,
            notify: true,
            notes: None,
            active: true,
        }
    }

    pub fn with_priority(mut self, p: WatchPriority) -> Self {
        self.priority = p;
        self
    }

    pub fn with_expiry(mut self, dt: DateTime<Utc>) -> Self {
        self.expiry_date = Some(dt);
        self
    }

    pub fn with_notes(mut self, n: impl Into<String>) -> Self {
        self.notes = Some(n.into());
        self
    }
}

/// An in-memory watchlist with filtering and sorting.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct Watchlist {
    pub entries: Vec<WatchEntry>,
}

impl Watchlist {
    pub fn new() -> Self {
        Self {
            entries: Vec::new(),
        }
    }

    pub fn add(&mut self, entry: WatchEntry) {
        self.entries.push(entry);
    }

    pub fn remove(&mut self, domain: &str) -> bool {
        let before = self.entries.len();
        self.entries.retain(|e| e.domain != domain);
        self.entries.len() < before
    }

    pub fn get(&self, domain: &str) -> Option<&WatchEntry> {
        self.entries.iter().find(|e| e.domain == domain)
    }

    pub fn get_mut(&mut self, domain: &str) -> Option<&mut WatchEntry> {
        self.entries.iter_mut().find(|e| e.domain == domain)
    }

    /// Return entries sorted by priority (critical first), then by expiry date.
    pub fn sorted_by_urgency(&self) -> Vec<&WatchEntry> {
        let mut sorted: Vec<_> = self.entries.iter().filter(|e| e.active).collect();
        sorted.sort_by(|a, b| {
            b.priority
                .cmp(&a.priority)
                .then_with(|| a.expiry_date.cmp(&b.expiry_date))
        });
        sorted
    }

    /// Filter entries by priority.
    pub fn filter_priority(&self, priority: &WatchPriority) -> Vec<&WatchEntry> {
        self.entries
            .iter()
            .filter(|e| &e.priority == priority)
            .collect()
    }

    /// Return entries that are due for checking (last_checked older than `interval_secs`).
    pub fn due_for_check(&self, interval_secs: i64) -> Vec<&WatchEntry> {
        let now = Utc::now();
        self.entries
            .iter()
            .filter(|e| {
                e.active
                    && match e.last_checked {
                        None => true,
                        Some(lc) => (now - lc).num_seconds() >= interval_secs,
                    }
            })
            .collect()
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    pub fn active_count(&self) -> usize {
        self.entries.iter().filter(|e| e.active).count()
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_watchlist_add_remove() {
        let mut wl = Watchlist::new();
        wl.add(WatchEntry::new("a.com"));
        wl.add(WatchEntry::new("b.com"));
        assert_eq!(wl.len(), 2);
        assert!(wl.remove("a.com"));
        assert_eq!(wl.len(), 1);
        assert!(!wl.remove("nonexistent.com"));
    }

    #[test]
    fn test_sorted_by_urgency() {
        let mut wl = Watchlist::new();
        wl.add(WatchEntry::new("low.com").with_priority(WatchPriority::Low));
        wl.add(WatchEntry::new("crit.com").with_priority(WatchPriority::Critical));
        wl.add(WatchEntry::new("med.com").with_priority(WatchPriority::Medium));
        let sorted = wl.sorted_by_urgency();
        assert_eq!(sorted[0].domain, "crit.com");
        assert_eq!(sorted[2].domain, "low.com");
    }

    #[test]
    fn test_filter_priority() {
        let mut wl = Watchlist::new();
        wl.add(WatchEntry::new("a.com").with_priority(WatchPriority::High));
        wl.add(WatchEntry::new("b.com").with_priority(WatchPriority::Low));
        wl.add(WatchEntry::new("c.com").with_priority(WatchPriority::High));
        let high = wl.filter_priority(&WatchPriority::High);
        assert_eq!(high.len(), 2);
    }

    #[test]
    fn test_due_for_check() {
        let mut wl = Watchlist::new();
        let mut e = WatchEntry::new("old.com");
        e.last_checked = Some(Utc::now() - chrono::Duration::hours(2));
        wl.add(e);
        let mut recent = WatchEntry::new("recent.com");
        recent.last_checked = Some(Utc::now());
        wl.add(recent);
        wl.add(WatchEntry::new("never.com")); // never checked

        let due = wl.due_for_check(3600); // 1 hour interval
        assert_eq!(due.len(), 2); // old.com + never.com
    }

    #[test]
    fn test_active_count() {
        let mut wl = Watchlist::new();
        wl.add(WatchEntry::new("a.com"));
        let mut inactive = WatchEntry::new("b.com");
        inactive.active = false;
        wl.add(inactive);
        assert_eq!(wl.active_count(), 1);
    }

    #[test]
    fn test_get_mut() {
        let mut wl = Watchlist::new();
        wl.add(WatchEntry::new("x.com"));
        wl.get_mut("x.com").unwrap().priority = WatchPriority::Critical;
        assert_eq!(wl.get("x.com").unwrap().priority, WatchPriority::Critical);
    }
}
