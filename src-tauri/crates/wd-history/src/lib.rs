//! # wd-history
//!
//! WHOIS / RDAP history management with snapshot storage, diffing,
//! registrar pricing intelligence, and timeline reconstruction.
//!
//! ## Modules
//!
//! - **snapshot** – point-in-time WHOIS/RDAP record storage
//! - **diff** – field-level change detection between snapshots
//! - **timeline** – chronological event reconstruction
//! - **pricing** – registrar price lookup from public APIs
//! - **store** – SQLite persistence layer

pub mod diff;
pub mod pricing;
pub mod snapshot;
pub mod store;
pub mod timeline;

// ─── Re-exports ──────────────────────────────────────────────────────────────

pub use diff::{DiffEntry, DiffKind, SnapshotDiff};
pub use pricing::{PriceQuote, Registrar, RegistrarPricing, TldPricing};
pub use snapshot::{LookupProtocol, Snapshot};
pub use store::HistoryStore;
pub use timeline::{TimelineEntry, TimelineEventKind};
