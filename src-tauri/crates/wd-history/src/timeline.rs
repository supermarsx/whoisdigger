use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Kinds of events on a domain timeline.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TimelineEventKind {
    Registered,
    Updated,
    Transferred,
    Expired,
    Renewed,
    StatusChanged,
    NameserverChanged,
    RegistrarChanged,
    Snapshot,
    Custom(String),
}

/// A single event on a domain's timeline.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TimelineEntry {
    pub domain: String,
    pub timestamp: DateTime<Utc>,
    pub kind: TimelineEventKind,
    pub description: String,
    /// Optional reference to the snapshot that generated this event.
    pub snapshot_id: Option<i64>,
}

impl TimelineEntry {
    pub fn new(
        domain: impl Into<String>,
        timestamp: DateTime<Utc>,
        kind: TimelineEventKind,
        description: impl Into<String>,
    ) -> Self {
        Self {
            domain: domain.into(),
            timestamp,
            kind,
            description: description.into(),
            snapshot_id: None,
        }
    }

    pub fn with_snapshot_id(mut self, id: i64) -> Self {
        self.snapshot_id = Some(id);
        self
    }
}

/// Build a timeline from a set of snapshots by detecting changes.
pub fn build_timeline(snapshots: &[crate::Snapshot]) -> Vec<TimelineEntry> {
    let mut entries = Vec::new();

    for (i, snap) in snapshots.iter().enumerate() {
        // First snapshot → registration event
        if i == 0 {
            entries.push(TimelineEntry::new(
                &snap.domain,
                snap.captured_at,
                TimelineEventKind::Snapshot,
                "Initial snapshot captured",
            ));
            continue;
        }

        let prev = &snapshots[i - 1];
        let diff = crate::diff::diff_snapshots(prev, snap);

        if diff.is_empty() {
            entries.push(TimelineEntry::new(
                &snap.domain,
                snap.captured_at,
                TimelineEventKind::Snapshot,
                "Snapshot captured (no changes)",
            ));
            continue;
        }

        for entry in &diff.entries {
            let kind = match entry.field.as_str() {
                "registrar" => TimelineEventKind::RegistrarChanged,
                "nameservers" => TimelineEventKind::NameserverChanged,
                f if f.contains("status") => TimelineEventKind::StatusChanged,
                _ => TimelineEventKind::Updated,
            };
            let desc = format!(
                "{}: {} → {}",
                entry.field,
                entry.old_value.as_deref().unwrap_or("(none)"),
                entry.new_value.as_deref().unwrap_or("(none)")
            );
            entries.push(TimelineEntry::new(
                &snap.domain,
                snap.captured_at,
                kind,
                desc,
            ));
        }
    }

    entries
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::snapshot::{LookupProtocol, Snapshot};

    #[test]
    fn test_build_timeline_single() {
        let s = Snapshot::new("a.com", LookupProtocol::Whois, "raw");
        let tl = build_timeline(&[s]);
        assert_eq!(tl.len(), 1);
        assert_eq!(tl[0].kind, TimelineEventKind::Snapshot);
    }

    #[test]
    fn test_build_timeline_with_changes() {
        let s1 = Snapshot::new("a.com", LookupProtocol::Whois, "raw1").with_registrar("OldCo");
        let s2 = Snapshot::new("a.com", LookupProtocol::Whois, "raw2").with_registrar("NewCo");
        let tl = build_timeline(&[s1, s2]);
        assert!(tl
            .iter()
            .any(|e| e.kind == TimelineEventKind::RegistrarChanged));
    }

    #[test]
    fn test_timeline_entry_with_snapshot_id() {
        let e = TimelineEntry::new(
            "x.com",
            Utc::now(),
            TimelineEventKind::Renewed,
            "Renewed for 1yr",
        )
        .with_snapshot_id(42);
        assert_eq!(e.snapshot_id, Some(42));
    }
}
