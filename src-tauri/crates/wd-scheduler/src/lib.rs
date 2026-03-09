//! # wd-scheduler
//!
//! Recurring bulk scan scheduler. Supports cron-like scheduling, one-shot and
//! repeating jobs, run history, and diff tracking between consecutive runs.

pub mod job;
pub mod runner;
pub mod schedule;
pub mod store;

pub use job::{Job, JobId, JobStatus};
pub use runner::{RunDiff, RunRecord};
pub use schedule::{Schedule, ScheduleKind};
pub use store::SchedulerStore;
