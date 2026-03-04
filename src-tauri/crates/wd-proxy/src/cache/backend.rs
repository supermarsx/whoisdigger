use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

// ─── Errors ──────────────────────────────────────────────────────────────────

#[derive(Error, Debug)]
pub enum CacheError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("serialisation error: {0}")]
    Serialization(String),

    #[error("backend error: {0}")]
    Backend(String),

    #[error("entry expired")]
    Expired,

    #[error("entry not found")]
    NotFound,
}

pub type CacheResult<T> = Result<T, CacheError>;

// ─── Cache Entry ─────────────────────────────────────────────────────────────

/// A single cached value with metadata.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CacheEntry {
    /// The cache key (e.g. domain name).
    pub key: String,
    /// The cached response payload.
    pub value: String,
    /// When the entry was stored.
    pub created_at: DateTime<Utc>,
    /// Optional TTL in milliseconds. `None` means never expires.
    pub ttl_ms: Option<u64>,
    /// Number of times this entry has been read from cache.
    #[serde(default)]
    pub hit_count: u64,
}

impl CacheEntry {
    /// Create a new entry with the current timestamp.
    pub fn new(key: impl Into<String>, value: impl Into<String>, ttl_ms: Option<u64>) -> Self {
        Self {
            key: key.into(),
            value: value.into(),
            created_at: Utc::now(),
            ttl_ms,
            hit_count: 0,
        }
    }

    /// Returns `true` if the entry has expired.
    pub fn is_expired(&self) -> bool {
        if let Some(ttl) = self.ttl_ms {
            let age = Utc::now()
                .signed_duration_since(self.created_at)
                .num_milliseconds();
            age > ttl as i64
        } else {
            false
        }
    }
}

// ─── Backend Trait ────────────────────────────────────────────────────────────

/// Pluggable cache backend interface.
///
/// Every backend must implement these five operations. The trait is `Send + Sync`
/// so backends can be shared across async tasks behind an `Arc`.
pub trait CacheBackend: Send + Sync {
    /// Retrieve an entry by key. Return `None` if missing (don't error).
    fn get(&self, key: &str) -> CacheResult<Option<CacheEntry>>;

    /// Store (or overwrite) an entry.
    fn set(&self, entry: CacheEntry) -> CacheResult<()>;

    /// Remove a specific key. No-op if missing.
    fn remove(&self, key: &str) -> CacheResult<()>;

    /// Remove all entries.
    fn clear(&self) -> CacheResult<()>;

    /// Return the number of stored entries.
    fn len(&self) -> CacheResult<usize>;

    /// Convenience: true when `len() == 0`.
    fn is_empty(&self) -> CacheResult<bool> {
        Ok(self.len()? == 0)
    }

    /// Evict entries that have exceeded their TTL.
    /// Default implementation is a no-op; backends that support
    /// efficient bulk eviction should override.
    fn evict_expired(&self) -> CacheResult<u64> {
        Ok(0)
    }

    /// Return a human-readable name for this backend (e.g. "inmemory", "sqlite").
    fn name(&self) -> &str;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cache_entry_not_expired() {
        let entry = CacheEntry::new("example.com", "whois data", Some(60_000));
        assert!(!entry.is_expired());
    }

    #[test]
    fn test_cache_entry_no_ttl_never_expires() {
        let entry = CacheEntry::new("example.com", "whois data", None);
        assert!(!entry.is_expired());
    }

    #[test]
    fn test_cache_entry_expired() {
        let mut entry = CacheEntry::new("example.com", "whois data", Some(1));
        // Backdate the entry
        entry.created_at = Utc::now() - chrono::Duration::seconds(10);
        assert!(entry.is_expired());
    }
}
