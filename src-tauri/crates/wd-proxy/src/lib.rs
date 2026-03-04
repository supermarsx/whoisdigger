//! # wd-proxy
//!
//! Full proxy management crate for whoisdigger.
//!
//! Provides proxy types, rotation with failure tracking, role-based access
//! control (RBAC), and adaptive caching with pluggable backend adapters
//! (in-memory, JSON file, SQLite, PostgreSQL).

// ─── Modules ─────────────────────────────────────────────────────────────────

pub mod cache;
pub mod rbac;
pub mod rotation;
pub mod types;

// ─── Re-exports: proxy types (backward-compatible) ──────────────────────────

pub use types::{
    parse_proxy_entry, ProxyAuth, ProxyEntry, ProxyInfo, ProxyMode, ProxyMultiMode, ProxySettings,
};

// ─── Re-exports: rotation ────────────────────────────────────────────────────

pub use rotation::ProxyRotation;

// ─── Re-exports: cache backends & traits ─────────────────────────────────────

pub use cache::adaptive::{AdaptiveCacheManager, CacheMetrics};
pub use cache::backend::{CacheBackend, CacheEntry, CacheError, CacheResult};
pub use cache::inmemory::InMemoryCache;
pub use cache::json::JsonFileCache;

#[cfg(feature = "sqlite")]
pub use cache::sqlite::SqliteCache;

#[cfg(feature = "postgres")]
pub use cache::postgres::PostgresCache;

// ─── Re-exports: RBAC ────────────────────────────────────────────────────────

pub use rbac::{Permission, Rbac, Role, RoleBinding};
