use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::schedule::Schedule;

/// Unique job identifier.
pub type JobId = String;

/// Job status.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Active,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

/// A scheduled job definition.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Job {
    pub id: JobId,
    pub name: String,
    pub description: Option<String>,
    /// Domains to scan in each run.
    pub domains: Vec<String>,
    /// Schedule configuration.
    pub schedule: Schedule,
    pub status: JobStatus,
    /// When the job was created.
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
    /// When the job was last run.
    pub last_run: Option<DateTime<Utc>>,
    /// When the next run should happen.
    pub next_run: Option<DateTime<Utc>>,
    /// Total completed runs.
    pub run_count: u64,
    /// Max consecutive failures before auto-pause.
    pub max_failures: u32,
    /// Current consecutive failures.
    pub consecutive_failures: u32,
    /// Notify on completion.
    pub notify: bool,
    /// Tags for organization.
    pub tags: Vec<String>,
}

impl Job {
    pub fn new(name: impl Into<String>, domains: Vec<String>, schedule: Schedule) -> Self {
        let now = Utc::now();
        let next = schedule.next_occurrence(now);
        Self {
            id: generate_id(),
            name: name.into(),
            description: None,
            domains,
            schedule,
            status: JobStatus::Active,
            created_at: now,
            last_run: None,
            next_run: next,
            run_count: 0,
            max_failures: 5,
            consecutive_failures: 0,
            notify: false,
            tags: vec![],
        }
    }

    /// Check if the job is due to run.
    pub fn is_due(&self) -> bool {
        if self.status != JobStatus::Active {
            return false;
        }
        match self.next_run {
            Some(next) => Utc::now() >= next,
            None => false,
        }
    }

    /// Mark the job as having completed a run successfully.
    pub fn record_success(&mut self) {
        self.last_run = Some(Utc::now());
        self.run_count += 1;
        self.consecutive_failures = 0;
        self.next_run = self.schedule.next_occurrence(Utc::now());
        // If one-shot, mark completed
        if matches!(self.schedule.kind, crate::schedule::ScheduleKind::Once) {
            self.status = JobStatus::Completed;
            self.next_run = None;
        }
    }

    /// Mark the job as having failed a run.
    pub fn record_failure(&mut self) {
        self.last_run = Some(Utc::now());
        self.consecutive_failures += 1;
        if self.consecutive_failures >= self.max_failures {
            self.status = JobStatus::Paused;
        }
        self.next_run = self.schedule.next_occurrence(Utc::now());
    }

    pub fn pause(&mut self) {
        self.status = JobStatus::Paused;
        self.next_run = None;
    }
    pub fn resume(&mut self) {
        self.status = JobStatus::Active;
        self.next_run = self.schedule.next_occurrence(Utc::now());
    }
    pub fn cancel(&mut self) {
        self.status = JobStatus::Cancelled;
        self.next_run = None;
    }
}

fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    format!("job_{:x}", nanos)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schedule::{Schedule, ScheduleKind};

    #[test]
    fn test_job_creation() {
        let sched = Schedule {
            kind: ScheduleKind::IntervalMinutes(60),
            enabled: true,
        };
        let job = Job::new("My Scan", vec!["example.com".into()], sched);
        assert_eq!(job.status, JobStatus::Active);
        assert_eq!(job.run_count, 0);
        assert!(job.next_run.is_some());
    }

    #[test]
    fn test_record_success() {
        let sched = Schedule {
            kind: ScheduleKind::IntervalMinutes(60),
            enabled: true,
        };
        let mut job = Job::new("Test", vec!["a.com".into()], sched);
        job.record_success();
        assert_eq!(job.run_count, 1);
        assert_eq!(job.consecutive_failures, 0);
        assert!(job.last_run.is_some());
    }

    #[test]
    fn test_one_shot_completes_after_success() {
        let sched = Schedule {
            kind: ScheduleKind::Once,
            enabled: true,
        };
        let mut job = Job::new("OneShot", vec!["a.com".into()], sched);
        job.record_success();
        assert_eq!(job.status, JobStatus::Completed);
        assert!(job.next_run.is_none());
    }

    #[test]
    fn test_auto_pause_on_failures() {
        let sched = Schedule {
            kind: ScheduleKind::IntervalMinutes(60),
            enabled: true,
        };
        let mut job = Job::new("Fragile", vec!["a.com".into()], sched);
        job.max_failures = 3;
        job.record_failure();
        job.record_failure();
        assert_eq!(job.status, JobStatus::Active);
        job.record_failure();
        assert_eq!(job.status, JobStatus::Paused);
    }

    #[test]
    fn test_pause_resume() {
        let sched = Schedule {
            kind: ScheduleKind::IntervalMinutes(60),
            enabled: true,
        };
        let mut job = Job::new("PR", vec![], sched);
        job.pause();
        assert_eq!(job.status, JobStatus::Paused);
        assert!(job.next_run.is_none());
        job.resume();
        assert_eq!(job.status, JobStatus::Active);
        assert!(job.next_run.is_some());
    }

    #[test]
    fn test_cancel() {
        let sched = Schedule {
            kind: ScheduleKind::IntervalMinutes(60),
            enabled: true,
        };
        let mut job = Job::new("Cancel", vec![], sched);
        job.cancel();
        assert_eq!(job.status, JobStatus::Cancelled);
    }
}
