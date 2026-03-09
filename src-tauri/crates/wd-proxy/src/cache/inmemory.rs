use super::backend::{CacheBackend, CacheEntry, CacheError, CacheResult};
use std::collections::HashMap;
use std::sync::Mutex;

/// Fast, volatile, bounded in-memory cache.
///
/// Uses a `HashMap` guarded by a `Mutex` for thread-safety.
/// When `max_entries` is reached, the oldest entry (by `created_at`) is evicted
/// before inserting a new one — simple LRU-style behaviour.
pub struct InMemoryCache {
    store: Mutex<HashMap<String, CacheEntry>>,
    max_entries: usize,
}

impl InMemoryCache {
    /// Create a new in-memory cache with the given capacity.
    /// Pass `0` for unbounded (not recommended in production).
    pub fn new(max_entries: usize) -> Self {
        Self {
            store: Mutex::new(HashMap::with_capacity(max_entries.min(1024))),
            max_entries,
        }
    }
}

impl Default for InMemoryCache {
    fn default() -> Self {
        Self::new(10_000)
    }
}

impl CacheBackend for InMemoryCache {
    fn get(&self, key: &str) -> CacheResult<Option<CacheEntry>> {
        let mut store = self
            .store
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        if let Some(entry) = store.get_mut(key) {
            if entry.is_expired() {
                store.remove(key);
                return Ok(None);
            }
            entry.hit_count += 1;
            Ok(Some(entry.clone()))
        } else {
            Ok(None)
        }
    }

    fn set(&self, entry: CacheEntry) -> CacheResult<()> {
        let mut store = self
            .store
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        // Evict oldest entry if at capacity (skip if updating existing key)
        if self.max_entries > 0
            && store.len() >= self.max_entries
            && !store.contains_key(&entry.key)
        {
            if let Some(oldest_key) = store
                .iter()
                .min_by_key(|(_, v)| v.created_at)
                .map(|(k, _)| k.clone())
            {
                store.remove(&oldest_key);
            }
        }

        store.insert(entry.key.clone(), entry);
        Ok(())
    }

    fn remove(&self, key: &str) -> CacheResult<()> {
        let mut store = self
            .store
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        store.remove(key);
        Ok(())
    }

    fn clear(&self) -> CacheResult<()> {
        let mut store = self
            .store
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        store.clear();
        Ok(())
    }

    fn len(&self) -> CacheResult<usize> {
        let store = self
            .store
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        Ok(store.len())
    }

    fn evict_expired(&self) -> CacheResult<u64> {
        let mut store = self
            .store
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        let before = store.len();
        store.retain(|_, v| !v.is_expired());
        Ok((before - store.len()) as u64)
    }

    fn name(&self) -> &str {
        "inmemory"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_set() {
        let cache = InMemoryCache::new(100);
        let entry = CacheEntry::new("example.com", "whois data here", None);
        cache.set(entry).unwrap();

        let result = cache.get("example.com").unwrap().unwrap();
        assert_eq!(result.value, "whois data here");
        assert_eq!(result.hit_count, 1);
    }

    #[test]
    fn test_get_miss() {
        let cache = InMemoryCache::new(100);
        assert!(cache.get("missing.com").unwrap().is_none());
    }

    #[test]
    fn test_remove() {
        let cache = InMemoryCache::new(100);
        cache.set(CacheEntry::new("a.com", "data", None)).unwrap();
        cache.remove("a.com").unwrap();
        assert!(cache.get("a.com").unwrap().is_none());
    }

    #[test]
    fn test_clear() {
        let cache = InMemoryCache::new(100);
        cache.set(CacheEntry::new("a.com", "data", None)).unwrap();
        cache.set(CacheEntry::new("b.com", "data", None)).unwrap();
        assert_eq!(cache.len().unwrap(), 2);
        cache.clear().unwrap();
        assert_eq!(cache.len().unwrap(), 0);
    }

    #[test]
    fn test_eviction_at_capacity() {
        let cache = InMemoryCache::new(2);
        cache.set(CacheEntry::new("a.com", "1", None)).unwrap();
        cache.set(CacheEntry::new("b.com", "2", None)).unwrap();
        cache.set(CacheEntry::new("c.com", "3", None)).unwrap();
        // Should evict oldest, keeping size at 2
        assert_eq!(cache.len().unwrap(), 2);
        assert!(cache.get("c.com").unwrap().is_some());
    }

    #[test]
    fn test_expired_entry_removed_on_get() {
        let cache = InMemoryCache::new(100);
        let mut entry = CacheEntry::new("old.com", "stale", Some(1));
        entry.created_at = chrono::Utc::now() - chrono::Duration::seconds(10);
        cache.set(entry).unwrap();

        assert!(cache.get("old.com").unwrap().is_none());
        assert_eq!(cache.len().unwrap(), 0);
    }

    #[test]
    fn test_evict_expired() {
        let cache = InMemoryCache::new(100);
        let mut old = CacheEntry::new("old.com", "stale", Some(1));
        old.created_at = chrono::Utc::now() - chrono::Duration::seconds(10);
        cache.set(old).unwrap();
        cache
            .set(CacheEntry::new("fresh.com", "fresh", Some(60_000)))
            .unwrap();

        let evicted = cache.evict_expired().unwrap();
        assert_eq!(evicted, 1);
        assert_eq!(cache.len().unwrap(), 1);
    }

    #[test]
    fn test_update_existing_key_no_eviction() {
        let cache = InMemoryCache::new(2);
        cache.set(CacheEntry::new("a.com", "v1", None)).unwrap();
        cache.set(CacheEntry::new("b.com", "v2", None)).unwrap();
        // Update existing key — should NOT evict
        cache
            .set(CacheEntry::new("a.com", "v1-updated", None))
            .unwrap();
        assert_eq!(cache.len().unwrap(), 2);
        assert_eq!(cache.get("a.com").unwrap().unwrap().value, "v1-updated");
    }

    #[test]
    fn test_hit_count_increments() {
        let cache = InMemoryCache::new(100);
        cache.set(CacheEntry::new("x.com", "data", None)).unwrap();
        cache.get("x.com").unwrap();
        cache.get("x.com").unwrap();
        let entry = cache.get("x.com").unwrap().unwrap();
        assert_eq!(entry.hit_count, 3);
    }
}
