//! # wd-import
//!
//! Bulk import module supporting multiple domain list formats:
//! zone files (CZDS), Certificate Transparency logs, CSV, JSON, newline-delimited
//! text, and clipboard paste. Includes validation, deduplication, and statistics.

pub mod format;
pub mod parser;
pub mod validate;
pub mod stats;

pub use format::{ImportFormat, ImportSource};
pub use parser::{parse_import, ImportResult};
pub use validate::{DomainValidator, ValidationLevel};
pub use stats::ImportStats;
