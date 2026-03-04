//! Adaptive caching framework for WHOIS lookups.
//!
//! Provides a `CacheBackend` trait implemented by four adapters:
//! - [`InMemoryCache`] — fast, volatile, bounded LRU-style cache
//! - [`JsonFileCache`] — persistent JSON file with scheduled flush
//! - [`SqliteCache`] — SQLite-backed (feature `sqlite`)
//! - [`PostgresCache`] — PostgreSQL-backed (feature `postgres`)
//!
//! The [`AdaptiveCacheManager`] wraps any backend and adds automatic
//! TTL enforcement, hit-rate tracking, and optional tiered promotion.

pub mod adaptive;
pub mod backend;
pub mod inmemory;
pub mod json;

#[cfg(feature = "sqlite")]
pub mod sqlite;

#[cfg(feature = "postgres")]
pub mod postgres;
