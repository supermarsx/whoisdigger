use crate::snapshot::Snapshot;
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

/// What kind of change occurred for a single field.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DiffKind {
    Added,
    Removed,
    Changed,
}

/// A single field-level diff entry.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct DiffEntry {
    pub field: String,
    pub kind: DiffKind,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
}

/// The result of diffing two snapshots.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SnapshotDiff {
    pub domain: String,
    pub from_id: Option<i64>,
    pub to_id: Option<i64>,
    pub from_time: String,
    pub to_time: String,
    pub entries: Vec<DiffEntry>,
}

impl SnapshotDiff {
    /// True when there are zero differences.
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Number of changes.
    pub fn len(&self) -> usize {
        self.entries.len()
    }

    /// Filter entries by `DiffKind`.
    pub fn filter_kind(&self, kind: &DiffKind) -> Vec<&DiffEntry> {
        self.entries.iter().filter(|e| &e.kind == kind).collect()
    }
}

/// Compute a field-level diff between `old` and `new` snapshots.
///
/// Compares `fields`, `registrar`, `nameservers`, and `status_codes`.
pub fn diff_snapshots(old: &Snapshot, new: &Snapshot) -> SnapshotDiff {
    let mut entries = Vec::new();

    // ── Field map comparison ─────────────────────────────────────────────
    let all_keys: BTreeSet<&String> = old.fields.keys().chain(new.fields.keys()).collect();
    for key in all_keys {
        match (old.fields.get(key), new.fields.get(key)) {
            (None, Some(v)) => entries.push(DiffEntry {
                field: key.clone(),
                kind: DiffKind::Added,
                old_value: None,
                new_value: Some(v.clone()),
            }),
            (Some(v), None) => entries.push(DiffEntry {
                field: key.clone(),
                kind: DiffKind::Removed,
                old_value: Some(v.clone()),
                new_value: None,
            }),
            (Some(a), Some(b)) if a != b => entries.push(DiffEntry {
                field: key.clone(),
                kind: DiffKind::Changed,
                old_value: Some(a.clone()),
                new_value: Some(b.clone()),
            }),
            _ => {}
        }
    }

    // ── Registrar ────────────────────────────────────────────────────────
    diff_option_field("registrar", &old.registrar, &new.registrar, &mut entries);

    // ── Nameservers (set comparison) ─────────────────────────────────────
    diff_vec_field(
        "nameservers",
        &old.nameservers,
        &new.nameservers,
        &mut entries,
    );

    // ── Status codes (set comparison) ────────────────────────────────────
    diff_vec_field(
        "status_codes",
        &old.status_codes,
        &new.status_codes,
        &mut entries,
    );

    SnapshotDiff {
        domain: new.domain.clone(),
        from_id: old.id,
        to_id: new.id,
        from_time: old.captured_at.to_rfc3339(),
        to_time: new.captured_at.to_rfc3339(),
        entries,
    }
}

/// Batch-diff a chronological list of snapshots for one domain.
/// Returns N-1 diffs for N snapshots.
pub fn diff_timeline(snapshots: &[Snapshot]) -> Vec<SnapshotDiff> {
    snapshots
        .windows(2)
        .map(|w| diff_snapshots(&w[0], &w[1]))
        .collect()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn diff_option_field(
    name: &str,
    old: &Option<String>,
    new: &Option<String>,
    out: &mut Vec<DiffEntry>,
) {
    match (old, new) {
        (None, Some(v)) => out.push(DiffEntry {
            field: name.to_string(),
            kind: DiffKind::Added,
            old_value: None,
            new_value: Some(v.clone()),
        }),
        (Some(v), None) => out.push(DiffEntry {
            field: name.to_string(),
            kind: DiffKind::Removed,
            old_value: Some(v.clone()),
            new_value: None,
        }),
        (Some(a), Some(b)) if a != b => out.push(DiffEntry {
            field: name.to_string(),
            kind: DiffKind::Changed,
            old_value: Some(a.clone()),
            new_value: Some(b.clone()),
        }),
        _ => {}
    }
}

fn diff_vec_field(name: &str, old: &[String], new: &[String], out: &mut Vec<DiffEntry>) {
    let old_joined = sorted_join(old);
    let new_joined = sorted_join(new);
    if old_joined != new_joined {
        let kind = if old.is_empty() {
            DiffKind::Added
        } else if new.is_empty() {
            DiffKind::Removed
        } else {
            DiffKind::Changed
        };
        out.push(DiffEntry {
            field: name.to_string(),
            kind,
            old_value: if old.is_empty() {
                None
            } else {
                Some(old_joined)
            },
            new_value: if new.is_empty() {
                None
            } else {
                Some(new_joined)
            },
        });
    }
}

fn sorted_join(v: &[String]) -> String {
    let mut sorted: Vec<&str> = v.iter().map(|s| s.as_str()).collect();
    sorted.sort();
    sorted.join(", ")
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::snapshot::{LookupProtocol, Snapshot};
    use std::collections::HashMap;

    fn snap(fields: HashMap<String, String>) -> Snapshot {
        let mut s = Snapshot::new("example.com", LookupProtocol::Whois, "");
        s.fields = fields;
        s
    }

    #[test]
    fn test_no_diff_identical() {
        let mut f = HashMap::new();
        f.insert("registrant".into(), "Alice".into());
        let a = snap(f.clone());
        let b = snap(f);
        let d = diff_snapshots(&a, &b);
        assert!(d.is_empty());
    }

    #[test]
    fn test_field_added() {
        let a = snap(HashMap::new());
        let mut f = HashMap::new();
        f.insert("registrant".into(), "Bob".into());
        let b = snap(f);
        let d = diff_snapshots(&a, &b);
        assert_eq!(d.len(), 1);
        assert_eq!(d.entries[0].kind, DiffKind::Added);
        assert_eq!(d.entries[0].new_value.as_deref(), Some("Bob"));
    }

    #[test]
    fn test_field_removed() {
        let mut f = HashMap::new();
        f.insert("registrant".into(), "Bob".into());
        let a = snap(f);
        let b = snap(HashMap::new());
        let d = diff_snapshots(&a, &b);
        assert_eq!(d.len(), 1);
        assert_eq!(d.entries[0].kind, DiffKind::Removed);
    }

    #[test]
    fn test_field_changed() {
        let mut f1 = HashMap::new();
        f1.insert("registrant".into(), "Alice".into());
        let mut f2 = HashMap::new();
        f2.insert("registrant".into(), "Bob".into());
        let d = diff_snapshots(&snap(f1), &snap(f2));
        assert_eq!(d.len(), 1);
        assert_eq!(d.entries[0].kind, DiffKind::Changed);
    }

    #[test]
    fn test_registrar_change() {
        let mut a = snap(HashMap::new());
        a.registrar = Some("OldCo".into());
        let mut b = snap(HashMap::new());
        b.registrar = Some("NewCo".into());
        let d = diff_snapshots(&a, &b);
        let reg = d.entries.iter().find(|e| e.field == "registrar").unwrap();
        assert_eq!(reg.kind, DiffKind::Changed);
    }

    #[test]
    fn test_nameserver_change() {
        let mut a = snap(HashMap::new());
        a.nameservers = vec!["ns1.old.com".into()];
        let mut b = snap(HashMap::new());
        b.nameservers = vec!["ns1.new.com".into()];
        let d = diff_snapshots(&a, &b);
        let ns = d.entries.iter().find(|e| e.field == "nameservers").unwrap();
        assert_eq!(ns.kind, DiffKind::Changed);
    }

    #[test]
    fn test_diff_timeline() {
        let s1 = snap(HashMap::new());
        let mut f = HashMap::new();
        f.insert("org".into(), "A".into());
        let s2 = snap(f.clone());
        f.insert("org".into(), "B".into());
        let s3 = snap(f);
        let diffs = diff_timeline(&[s1, s2, s3]);
        assert_eq!(diffs.len(), 2);
    }

    #[test]
    fn test_filter_kind() {
        let mut f1 = HashMap::new();
        f1.insert("a".into(), "1".into());
        let mut f2 = HashMap::new();
        f2.insert("a".into(), "2".into());
        f2.insert("b".into(), "3".into());
        let d = diff_snapshots(&snap(f1), &snap(f2));
        assert_eq!(d.filter_kind(&DiffKind::Changed).len(), 1);
        assert_eq!(d.filter_kind(&DiffKind::Added).len(), 1);
    }
}
