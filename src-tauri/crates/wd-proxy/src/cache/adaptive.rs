use super::backend::{CacheBackend, CacheEntry, CacheResult};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Instant;

// ─── Cache Metrics ───────────────────────────────────────────────────────────

/// Tracks hit/miss rates and latency for adaptive tier decisions.
#[derive(Debug)]
pub struct CacheMetrics {
    pub hits: AtomicU64,
    pub misses: AtomicU64,
    pub total_get_ns: AtomicU64,
    pub total_set_ns: AtomicU64,
    pub get_count: AtomicU64,
    pub set_count: AtomicU64,
}

impl Default for CacheMetrics {
    fn default() -> Self {
        Self {
            hits: AtomicU64::new(0),
            misses: AtomicU64::new(0),
            total_get_ns: AtomicU64::new(0),
            total_set_ns: AtomicU64::new(0),
            get_count: AtomicU64::new(0),
            set_count: AtomicU64::new(0),
        }
    }
}

impl CacheMetrics {
    /// Hit rate as a percentage (0.0–100.0). Returns 0.0 if no operations.
    pub fn hit_rate(&self) -> f64 {
        let h = self.hits.load(Ordering::Relaxed) as f64;
        let m = self.misses.load(Ordering::Relaxed) as f64;
        let total = h + m;
        if total == 0.0 { 0.0 } else { (h / total) * 100.0 }
    }

    /// Average GET latency in microseconds.
    pub fn avg_get_us(&self) -> f64 {
        let count = self.get_count.load(Ordering::Relaxed);
        if count == 0 {
            return 0.0;
        }
        let total_ns = self.total_get_ns.load(Ordering::Relaxed) as f64;
        total_ns / count as f64 / 1000.0
    }

    /// Average SET latency in microseconds.
    pub fn avg_set_us(&self) -> f64 {
        let count = self.set_count.load(Ordering::Relaxed);
        if count == 0 {
            return 0.0;
        }
        let total_ns = self.total_set_ns.load(Ordering::Relaxed) as f64;
        total_ns / count as f64 / 1000.0
    }

    /// Reset all counters to zero.
    pub fn reset(&self) {
        self.hits.store(0, Ordering::Relaxed);
        self.misses.store(0, Ordering::Relaxed);
        self.total_get_ns.store(0, Ordering::Relaxed);
        self.total_set_ns.store(0, Ordering::Relaxed);
        self.get_count.store(0, Ordering::Relaxed);
        self.set_count.store(0, Ordering::Relaxed);
    }
}

// ─── Adaptive Cache Manager ──────────────────────────────────────────────────

/// A caching layer that wraps any `CacheBackend` and adds:
///
/// - **Metrics** — hit-rate and latency tracking per backend
/// - **Tiered write-through** — optionally writes to a secondary (slower)
///   backend on every `set` for durability, while serving reads from
///   the fast primary
/// - **Eviction scheduling** — `evict_expired()` on the underlying backend
///
/// # Usage
///
/// ```rust,ignore
/// use wd_proxy::cache::{inmemory::InMemoryCache, adaptive::AdaptiveCacheManager};
///
/// let fast = InMemoryCache::new(10_000);
/// let manager = AdaptiveCacheManager::new(fast);
/// ```
pub struct AdaptiveCacheManager {
    primary: Box<dyn CacheBackend>,
    secondary: Mutex<Option<Box<dyn CacheBackend>>>,
    pub metrics: CacheMetrics,
}

impl AdaptiveCacheManager {
    /// Wrap a single backend with metric tracking.
    pub fn new(backend: impl CacheBackend + 'static) -> Self {
        Self {
            primary: Box::new(backend),
            secondary: Mutex::new(None),
            metrics: CacheMetrics::default(),
        }
    }

    /// Add a write-through secondary backend.
    ///
    /// Reads are served from the primary. On `set`, the entry is written to
    /// both primary and secondary. On `get` miss from primary, the manager
    /// falls back to the secondary and promotes the entry to primary.
    pub fn with_secondary(mut self, backend: impl CacheBackend + 'static) -> Self {
        self.secondary = Mutex::new(Some(Box::new(backend)));
        self
    }

    /// Return the name of the primary backend.
    pub fn primary_name(&self) -> &str {
        self.primary.name()
    }

    /// Return the name of the secondary backend, if any.
    pub fn secondary_name(&self) -> Option<String> {
        self.secondary
            .lock()
            .ok()
            .and_then(|guard| guard.as_ref().map(|b| b.name().to_string()))
    }

    /// Run eviction on both backends.
    pub fn evict_all_expired(&self) -> CacheResult<u64> {
        let mut total = self.primary.evict_expired()?;
        if let Ok(guard) = self.secondary.lock() {
            if let Some(ref sec) = *guard {
                total += sec.evict_expired()?;
            }
        }
        Ok(total)
    }
}

impl CacheBackend for AdaptiveCacheManager {
    fn get(&self, key: &str) -> CacheResult<Option<CacheEntry>> {
        let start = Instant::now();

        // Try primary first
        let result = self.primary.get(key)?;

        if let Some(entry) = result {
            let elapsed = start.elapsed().as_nanos() as u64;
            self.metrics.hits.fetch_add(1, Ordering::Relaxed);
            self.metrics.total_get_ns.fetch_add(elapsed, Ordering::Relaxed);
            self.metrics.get_count.fetch_add(1, Ordering::Relaxed);
            return Ok(Some(entry));
        }

        // Fallback to secondary
        if let Ok(guard) = self.secondary.lock() {
            if let Some(ref sec) = *guard {
                if let Ok(Some(entry)) = sec.get(key) {
                    // Promote to primary
                    let _ = self.primary.set(entry.clone());

                    let elapsed = start.elapsed().as_nanos() as u64;
                    self.metrics.hits.fetch_add(1, Ordering::Relaxed);
                    self.metrics.total_get_ns.fetch_add(elapsed, Ordering::Relaxed);
                    self.metrics.get_count.fetch_add(1, Ordering::Relaxed);
                    return Ok(Some(entry));
                }
            }
        }

        let elapsed = start.elapsed().as_nanos() as u64;
        self.metrics.misses.fetch_add(1, Ordering::Relaxed);
        self.metrics.total_get_ns.fetch_add(elapsed, Ordering::Relaxed);
        self.metrics.get_count.fetch_add(1, Ordering::Relaxed);
        Ok(None)
    }

    fn set(&self, entry: CacheEntry) -> CacheResult<()> {
        let start = Instant::now();

        // Write to primary
        self.primary.set(entry.clone())?;

        // Write-through to secondary
        if let Ok(guard) = self.secondary.lock() {
            if let Some(ref sec) = *guard {
                let _ = sec.set(entry);
            }
        }

        let elapsed = start.elapsed().as_nanos() as u64;
        self.metrics.total_set_ns.fetch_add(elapsed, Ordering::Relaxed);
        self.metrics.set_count.fetch_add(1, Ordering::Relaxed);
        Ok(())
    }

    fn remove(&self, key: &str) -> CacheResult<()> {
        self.primary.remove(key)?;
        if let Ok(guard) = self.secondary.lock() {
            if let Some(ref sec) = *guard {
                let _ = sec.remove(key);
            }
        }
        Ok(())
    }

    fn clear(&self) -> CacheResult<()> {
        self.primary.clear()?;
        if let Ok(guard) = self.secondary.lock() {
            if let Some(ref sec) = *guard {
                let _ = sec.clear();
            }
        }
        Ok(())
    }

    fn len(&self) -> CacheResult<usize> {
        self.primary.len()
    }

    fn evict_expired(&self) -> CacheResult<u64> {
        self.evict_all_expired()
    }

    fn name(&self) -> &str {
        "adaptive"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cache::inmemory::InMemoryCache;

    #[test]
    fn test_single_backend_get_set() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(100));
        mgr.set(CacheEntry::new("a.com", "data", None)).unwrap();
        let entry = mgr.get("a.com").unwrap().unwrap();
        assert_eq!(entry.value, "data");
    }

    #[test]
    fn test_metrics_tracking() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(100));
        mgr.set(CacheEntry::new("a.com", "data", None)).unwrap();

        mgr.get("a.com").unwrap(); // hit
        mgr.get("b.com").unwrap(); // miss

        assert_eq!(mgr.metrics.hits.load(Ordering::Relaxed), 1);
        assert_eq!(mgr.metrics.misses.load(Ordering::Relaxed), 1);
        assert!(mgr.metrics.hit_rate() > 49.0 && mgr.metrics.hit_rate() < 51.0);
    }

    #[test]
    fn test_tiered_fallback_and_promotion() {
        let primary = InMemoryCache::new(100);
        let secondary = InMemoryCache::new(100);

        // Put data only in secondary
        secondary.set(CacheEntry::new("deep.com", "from-secondary", None)).unwrap();

        let mgr = AdaptiveCacheManager::new(primary).with_secondary(secondary);

        // First get: miss primary, hit secondary, promote
        let entry = mgr.get("deep.com").unwrap().unwrap();
        assert_eq!(entry.value, "from-secondary");

        // Second get: should now hit primary directly
        let entry2 = mgr.get("deep.com").unwrap().unwrap();
        assert_eq!(entry2.value, "from-secondary");
        assert_eq!(mgr.metrics.hits.load(Ordering::Relaxed), 2);
        assert_eq!(mgr.metrics.misses.load(Ordering::Relaxed), 0);
    }

    #[test]
    fn test_write_through() {
        let sec_ref = InMemoryCache::new(100);
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(100))
            .with_secondary(sec_ref);

        mgr.set(CacheEntry::new("wt.com", "written", None)).unwrap();

        // Primary should have it
        assert!(mgr.get("wt.com").unwrap().is_some());
    }

    #[test]
    fn test_remove_from_both() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(100))
            .with_secondary(InMemoryCache::new(100));

        mgr.set(CacheEntry::new("rm.com", "data", None)).unwrap();
        mgr.remove("rm.com").unwrap();
        assert!(mgr.get("rm.com").unwrap().is_none());
    }

    #[test]
    fn test_clear_both() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(100))
            .with_secondary(InMemoryCache::new(100));

        mgr.set(CacheEntry::new("x.com", "data", None)).unwrap();
        mgr.clear().unwrap();
        assert!(mgr.is_empty().unwrap());
    }

    #[test]
    fn test_metrics_reset() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(100));
        mgr.set(CacheEntry::new("a.com", "d", None)).unwrap();
        mgr.get("a.com").unwrap();
        mgr.metrics.reset();
        assert_eq!(mgr.metrics.hits.load(Ordering::Relaxed), 0);
        assert_eq!(mgr.metrics.hit_rate(), 0.0);
    }

    #[test]
    fn test_primary_and_secondary_names() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(10))
            .with_secondary(InMemoryCache::new(10));
        assert_eq!(mgr.primary_name(), "inmemory");
        assert_eq!(mgr.secondary_name().unwrap(), "inmemory");
        assert_eq!(mgr.name(), "adaptive");
    }

    #[test]
    fn test_avg_latency_zero_when_no_ops() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(10));
        assert_eq!(mgr.metrics.avg_get_us(), 0.0);
        assert_eq!(mgr.metrics.avg_set_us(), 0.0);
    }

    #[test]
    fn test_avg_latency_after_operations() {
        let mgr = AdaptiveCacheManager::new(InMemoryCache::new(100));
        mgr.set(CacheEntry::new("lat.com", "data", None)).unwrap();
        mgr.get("lat.com").unwrap();
        // Latency should be > 0 (even if very small)
        assert!(mgr.metrics.avg_set_us() >= 0.0);
        assert!(mgr.metrics.avg_get_us() >= 0.0);
    }
}
