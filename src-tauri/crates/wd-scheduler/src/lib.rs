//! # wd-scheduler
//!
//! Recurring bulk scan scheduler. Supports cron-like scheduling, one-shot and
//! repeating jobs, run history, and diff tracking between consecutive runs.

pub mod job;
pub mod schedule;
pub mod runner;
pub mod store;

pub use job::{Job, JobId, JobStatus};
pub use schedule::{Schedule, ScheduleKind};
pub use runner::{RunRecord, RunDiff};
pub use store::SchedulerStore;
