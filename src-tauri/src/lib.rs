// Re-export segregated crates for backward-compatible public API.
//
// Consumers can continue using `whoisdigger::perform_lookup`,
// `whoisdigger::availability::DomainStatus`, etc. without changes.

// ── Lookup operations ────────────────────────────────────────────────────────
pub use wd_lookup::{dns_lookup, perform_lookup, rdap_lookup};
pub use wd_lookup::{
    convert_domain, psl_clean, prepare_domain, perform_lookup_with_settings,
    get_follow, get_timeout, get_time_between,
    ConversionAlgorithm, ConversionSettings, LookupSettings,
    LookupGeneralSettings, RandomizeSettings,
};

// ── Database operations ──────────────────────────────────────────────────────
pub use wd_db::{db_cache_get, db_cache_set, db_history_add, db_history_get, db_history_get_filtered, HistoryEntry};

// ── Sub-modules (path-compatible re-exports) ─────────────────────────────────
pub mod parser {
    pub use wd_parser::*;
}

pub mod availability {
    pub use wd_availability::*;
}

pub mod export {
    pub use wd_export::*;
}

pub mod proxy {
    pub use wd_proxy::*;
}

pub mod lookup {
    pub use wd_lookup::*;
}

pub mod wordlist {
    pub use wd_wordlist::*;
}

pub mod ai {
    pub use wd_ai::*;
}