//! # wd-expiry
//!
//! Domain expiry monitoring, grace period tracking, drop catching,
//! and watchlist management.
//!
//! ## Modules
//!
//! - **domain** – domain expiry state model and grace period logic
//! - **watchlist** – prioritised watchlist for monitored domains
//! - **dropcatch** – drop date estimation and catch scheduling
//! - **store** – SQLite persistence for watchlist state

pub mod domain;
pub mod dropcatch;
pub mod store;
pub mod watchlist;

pub use domain::{DomainExpiry, ExpiryPhase, GracePeriod};
pub use dropcatch::{DropEstimate, DropStrategy};
pub use store::ExpiryStore;
pub use watchlist::{WatchEntry, WatchPriority, Watchlist};
