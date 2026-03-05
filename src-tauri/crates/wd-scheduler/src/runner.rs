use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Record of a single scheduled run.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RunRecord {
    pub job_id: String,
    pub run_number: u64,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub started_at: DateTime<Utc>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub finished_at: DateTime<Utc>,
    pub domains_queried: u32,
    pub domains_succeeded: u32,
    pub domains_failed: u32,
    /// Per-domain result summary (domain → status).
    pub results: HashMap<String, DomainRunResult>,
    pub duration_ms: u64,
    pub success: bool,
    pub error: Option<String>,
}

/// Per-domain result in a run.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DomainRunResult {
    Success,
    Timeout,
    RateLimited,
    Error(String),
}

/// Diff between two consecutive runs for the same job.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RunDiff {
    pub job_id: String,
    pub run_a: u64,
    pub run_b: u64,
    /// Domains that appeared in run_b but not run_a.
    pub new_domains: Vec<String>,
    /// Domains that were in run_a but not run_b.
    pub removed_domains: Vec<String>,
    /// Domains whose result status changed between runs.
    pub status_changes: Vec<StatusChange>,
    /// Overall performance delta.
    pub success_rate_delta: f64,
}

/// A change in domain result between two runs.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StatusChange {
    pub domain: String,
    pub old: DomainRunResult,
    pub new: DomainRunResult,
}

impl RunRecord {
    /// Create a completed run record.
    pub fn completed(
        job_id: impl Into<String>,
        run_number: u64,
        started_at: DateTime<Utc>,
        results: HashMap<String, DomainRunResult>,
    ) -> Self {
        let finished_at = Utc::now();
        let duration_ms = (finished_at - started_at).num_milliseconds().max(0) as u64;
        let domains_queried = results.len() as u32;
        let domains_succeeded = results.values().filter(|r| **r == DomainRunResult::Success).count() as u32;
        let domains_failed = domains_queried - domains_succeeded;

        Self {
            job_id: job_id.into(),
            run_number,
            started_at,
            finished_at,
            domains_queried,
            domains_succeeded,
            domains_failed,
            results,
            duration_ms,
            success: domains_failed == 0,
            error: None,
        }
    }

    /// Success rate (0.0–1.0).
    pub fn success_rate(&self) -> f64 {
        if self.domains_queried == 0 { return 0.0; }
        self.domains_succeeded as f64 / self.domains_queried as f64
    }
}

/// Compute the diff between two runs.
pub fn diff_runs(a: &RunRecord, b: &RunRecord) -> RunDiff {
    let a_domains: std::collections::HashSet<&String> = a.results.keys().collect();
    let b_domains: std::collections::HashSet<&String> = b.results.keys().collect();

    let new_domains: Vec<String> = b_domains.difference(&a_domains).map(|d| (*d).clone()).collect();
    let removed_domains: Vec<String> = a_domains.difference(&b_domains).map(|d| (*d).clone()).collect();

    let mut status_changes = vec![];
    for domain in a_domains.intersection(&b_domains) {
        let old = &a.results[*domain];
        let new = &b.results[*domain];
        if old != new {
            status_changes.push(StatusChange {
                domain: (*domain).clone(),
                old: old.clone(),
                new: new.clone(),
            });
        }
    }

    let success_rate_delta = b.success_rate() - a.success_rate();

    RunDiff {
        job_id: b.job_id.clone(),
        run_a: a.run_number,
        run_b: b.run_number,
        new_domains,
        removed_domains,
        status_changes,
        success_rate_delta,
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_results(entries: Vec<(&str, DomainRunResult)>) -> HashMap<String, DomainRunResult> {
        entries.into_iter().map(|(d, r)| (d.to_string(), r)).collect()
    }

    #[test]
    fn test_run_record_success_rate() {
        let rec = RunRecord::completed(
            "j1", 1, Utc::now(),
            make_results(vec![
                ("a.com", DomainRunResult::Success),
                ("b.com", DomainRunResult::Success),
                ("c.com", DomainRunResult::Error("timeout".into())),
            ]),
        );
        assert!((rec.success_rate() - 2.0 / 3.0).abs() < 0.01);
    }

    #[test]
    fn test_diff_runs_new_domains() {
        let a = RunRecord::completed("j1", 1, Utc::now(), make_results(vec![
            ("a.com", DomainRunResult::Success),
        ]));
        let b = RunRecord::completed("j1", 2, Utc::now(), make_results(vec![
            ("a.com", DomainRunResult::Success),
            ("b.com", DomainRunResult::Success),
        ]));
        let diff = diff_runs(&a, &b);
        assert!(diff.new_domains.contains(&"b.com".to_string()));
    }

    #[test]
    fn test_diff_runs_removed_domains() {
        let a = RunRecord::completed("j1", 1, Utc::now(), make_results(vec![
            ("a.com", DomainRunResult::Success),
            ("b.com", DomainRunResult::Success),
        ]));
        let b = RunRecord::completed("j1", 2, Utc::now(), make_results(vec![
            ("a.com", DomainRunResult::Success),
        ]));
        let diff = diff_runs(&a, &b);
        assert!(diff.removed_domains.contains(&"b.com".to_string()));
    }

    #[test]
    fn test_diff_runs_status_changes() {
        let a = RunRecord::completed("j1", 1, Utc::now(), make_results(vec![
            ("a.com", DomainRunResult::Success),
        ]));
        let b = RunRecord::completed("j1", 2, Utc::now(), make_results(vec![
            ("a.com", DomainRunResult::Timeout),
        ]));
        let diff = diff_runs(&a, &b);
        assert_eq!(diff.status_changes.len(), 1);
        assert_eq!(diff.status_changes[0].domain, "a.com");
    }

    #[test]
    fn test_diff_runs_identical() {
        let results = make_results(vec![("a.com", DomainRunResult::Success)]);
        let a = RunRecord::completed("j1", 1, Utc::now(), results.clone());
        let b = RunRecord::completed("j1", 2, Utc::now(), results);
        let diff = diff_runs(&a, &b);
        assert!(diff.new_domains.is_empty());
        assert!(diff.removed_domains.is_empty());
        assert!(diff.status_changes.is_empty());
    }
}
