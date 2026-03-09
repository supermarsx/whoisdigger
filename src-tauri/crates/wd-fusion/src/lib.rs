//! # wd-fusion
//!
//! Combined WHOIS + RDAP + DNS lookup fusion engine. Merges results from
//! multiple sources into a single unified record with confidence scoring,
//! source attribution, and fallback chain support.

pub mod confidence;
pub mod fallback;
pub mod merge;
pub mod record;

pub use confidence::{ConfidenceScore, FieldConfidence};
pub use fallback::{FallbackChain, FallbackOutcome};
pub use merge::{merge_records, MergeStrategy};
pub use record::{FusedRecord, LookupSource, SourceRecord};
