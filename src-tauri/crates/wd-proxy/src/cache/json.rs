use super::backend::{CacheBackend, CacheEntry, CacheError, CacheResult};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// Persistent JSON-file cache backend.
///
/// Stores all entries in a single JSON file on disk. Reads are answered
/// from an in-memory snapshot that is loaded at construction time.
/// Writes flush to disk after every mutation to ensure durability.
///
/// Best suited for small-to-medium caches (< 50 000 entries). For
/// larger datasets prefer the SQLite or PostgreSQL backends.
pub struct JsonFileCache {
    path: PathBuf,
    store: Mutex<HashMap<String, CacheEntry>>,
}

impl JsonFileCache {
    /// Open (or create) a JSON cache file at the given path.
    pub fn open(path: impl AsRef<Path>) -> CacheResult<Self> {
        let path = path.as_ref().to_path_buf();
        let store = if path.exists() {
            let data = std::fs::read_to_string(&path)?;
            serde_json::from_str::<HashMap<String, CacheEntry>>(&data)
                .map_err(|e| CacheError::Serialization(e.to_string()))?
        } else {
            HashMap::new()
        };
        Ok(Self {
            path,
            store: Mutex::new(store),
        })
    }

    /// Flush the current in-memory state to disk.
    fn flush(&self, store: &HashMap<String, CacheEntry>) -> CacheResult<()> {
        // Write to a temp file first, then rename for atomicity
        let tmp = self.path.with_extension("json.tmp");
        let data = serde_json::to_string_pretty(store)
            .map_err(|e| CacheError::Serialization(e.to_string()))?;
        std::fs::write(&tmp, data)?;
        std::fs::rename(&tmp, &self.path)?;
        Ok(())
    }
}

impl CacheBackend for JsonFileCache {
    fn get(&self, key: &str) -> CacheResult<Option<CacheEntry>> {
        let mut store = self.store.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        if let Some(entry) = store.get_mut(key) {
            if entry.is_expired() {
                let key_owned = key.to_string();
                store.remove(&key_owned);
                self.flush(&store)?;
                return Ok(None);
            }
            entry.hit_count += 1;
            let result = entry.clone();
            // Persist hit_count update
            self.flush(&store)?;
            Ok(Some(result))
        } else {
            Ok(None)
        }
    }

    fn set(&self, entry: CacheEntry) -> CacheResult<()> {
        let mut store = self.store.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        store.insert(entry.key.clone(), entry);
        self.flush(&store)
    }

    fn remove(&self, key: &str) -> CacheResult<()> {
        let mut store = self.store.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        store.remove(key);
        self.flush(&store)
    }

    fn clear(&self) -> CacheResult<()> {
        let mut store = self.store.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        store.clear();
        self.flush(&store)
    }

    fn len(&self) -> CacheResult<usize> {
        let store = self.store.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        Ok(store.len())
    }

    fn evict_expired(&self) -> CacheResult<u64> {
        let mut store = self.store.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        let before = store.len();
        store.retain(|_, v| !v.is_expired());
        let evicted = (before - store.len()) as u64;
        if evicted > 0 {
            self.flush(&store)?;
        }
        Ok(evicted)
    }

    fn name(&self) -> &str {
        "json"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_path(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join("wd_proxy_test");
        fs::create_dir_all(&dir).unwrap();
        dir.join(name)
    }

    #[test]
    fn test_json_roundtrip() {
        let path = temp_path("roundtrip.json");
        let _ = fs::remove_file(&path);

        {
            let cache = JsonFileCache::open(&path).unwrap();
            cache.set(CacheEntry::new("a.com", "data-a", None)).unwrap();
            cache.set(CacheEntry::new("b.com", "data-b", Some(60_000))).unwrap();
            assert_eq!(cache.len().unwrap(), 2);
        }

        // Re-open and verify persistence
        {
            let cache = JsonFileCache::open(&path).unwrap();
            assert_eq!(cache.len().unwrap(), 2);
            let entry = cache.get("a.com").unwrap().unwrap();
            assert_eq!(entry.value, "data-a");
        }

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn test_json_remove_and_clear() {
        let path = temp_path("remove_clear.json");
        let _ = fs::remove_file(&path);

        let cache = JsonFileCache::open(&path).unwrap();
        cache.set(CacheEntry::new("a.com", "1", None)).unwrap();
        cache.set(CacheEntry::new("b.com", "2", None)).unwrap();

        cache.remove("a.com").unwrap();
        assert_eq!(cache.len().unwrap(), 1);

        cache.clear().unwrap();
        assert!(cache.is_empty().unwrap());

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn test_json_expired_eviction() {
        let path = temp_path("eviction.json");
        let _ = fs::remove_file(&path);

        let cache = JsonFileCache::open(&path).unwrap();
        let mut old = CacheEntry::new("stale.com", "old", Some(1));
        old.created_at = chrono::Utc::now() - chrono::Duration::seconds(10);
        cache.set(old).unwrap();
        cache.set(CacheEntry::new("fresh.com", "new", Some(60_000))).unwrap();

        let evicted = cache.evict_expired().unwrap();
        assert_eq!(evicted, 1);
        assert_eq!(cache.len().unwrap(), 1);

        let _ = fs::remove_file(&path);
    }

    #[test]
    fn test_json_creates_missing_file() {
        let path = temp_path("new_file.json");
        let _ = fs::remove_file(&path);

        let cache = JsonFileCache::open(&path).unwrap();
        assert!(cache.is_empty().unwrap());
        cache.set(CacheEntry::new("x.com", "v", None)).unwrap();
        assert!(path.exists());

        let _ = fs::remove_file(&path);
    }
}
