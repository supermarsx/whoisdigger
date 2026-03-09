use super::backend::{CacheBackend, CacheEntry, CacheError, CacheResult};
use chrono::Utc;
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// SQLite-backed cache backend.
///
/// Each entry is stored as a row in a `proxy_cache` table with columns:
/// `key TEXT PRIMARY KEY, value TEXT, created_at INTEGER, ttl_ms INTEGER, hit_count INTEGER`.
///
/// The connection is wrapped in a `Mutex` because `rusqlite::Connection` is
/// not `Sync`. For async callers, wrap operations in `tokio::task::spawn_blocking`.
pub struct SqliteCache {
    conn: Mutex<Connection>,
    #[allow(dead_code)]
    path: PathBuf,
}

impl SqliteCache {
    /// Open (or create) a SQLite cache at the given path.
    pub fn open(path: impl AsRef<Path>) -> CacheResult<Self> {
        let path = path.as_ref().to_path_buf();
        let conn = Connection::open(&path).map_err(|e| CacheError::Backend(e.to_string()))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS proxy_cache (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                ttl_ms     INTEGER,
                hit_count  INTEGER NOT NULL DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_proxy_cache_created ON proxy_cache(created_at);",
        )
        .map_err(|e| CacheError::Backend(e.to_string()))?;

        // Performance tuning
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        Ok(Self {
            conn: Mutex::new(conn),
            path,
        })
    }

    /// Open an in-memory SQLite database (useful for testing).
    pub fn open_in_memory() -> CacheResult<Self> {
        let conn = Connection::open_in_memory().map_err(|e| CacheError::Backend(e.to_string()))?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS proxy_cache (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                ttl_ms     INTEGER,
                hit_count  INTEGER NOT NULL DEFAULT 0
            );",
        )
        .map_err(|e| CacheError::Backend(e.to_string()))?;

        Ok(Self {
            conn: Mutex::new(conn),
            path: PathBuf::from(":memory:"),
        })
    }
}

impl CacheBackend for SqliteCache {
    fn get(&self, key: &str) -> CacheResult<Option<CacheEntry>> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        let mut stmt = conn
            .prepare(
                "SELECT key, value, created_at, ttl_ms, hit_count FROM proxy_cache WHERE key = ?",
            )
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        let mut rows = stmt
            .query([key])
            .map_err(|e| CacheError::Backend(e.to_string()))?;

        if let Some(row) = rows
            .next()
            .map_err(|e| CacheError::Backend(e.to_string()))?
        {
            let created_ms: i64 = row.get(2).map_err(|e| CacheError::Backend(e.to_string()))?;
            let ttl_ms: Option<u64> = row
                .get::<_, Option<i64>>(3)
                .map_err(|e| CacheError::Backend(e.to_string()))?
                .map(|v| v as u64);
            let hit_count: u64 =
                row.get::<_, i64>(4)
                    .map_err(|e| CacheError::Backend(e.to_string()))? as u64;

            let created_at =
                chrono::DateTime::from_timestamp_millis(created_ms).unwrap_or_else(|| Utc::now());

            let entry = CacheEntry {
                key: row
                    .get::<_, String>(0)
                    .map_err(|e| CacheError::Backend(e.to_string()))?,
                value: row
                    .get::<_, String>(1)
                    .map_err(|e| CacheError::Backend(e.to_string()))?,
                created_at,
                ttl_ms,
                hit_count,
            };

            // Check expiry
            if entry.is_expired() {
                conn.execute("DELETE FROM proxy_cache WHERE key = ?", [key])
                    .map_err(|e| CacheError::Backend(e.to_string()))?;
                return Ok(None);
            }

            // Increment hit count
            conn.execute(
                "UPDATE proxy_cache SET hit_count = hit_count + 1 WHERE key = ?",
                [key],
            )
            .map_err(|e| CacheError::Backend(e.to_string()))?;

            Ok(Some(CacheEntry {
                hit_count: entry.hit_count + 1,
                ..entry
            }))
        } else {
            Ok(None)
        }
    }

    fn set(&self, entry: CacheEntry) -> CacheResult<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        let created_ms = entry.created_at.timestamp_millis();
        let ttl: Option<i64> = entry.ttl_ms.map(|t| t as i64);
        conn.execute(
            "INSERT OR REPLACE INTO proxy_cache(key, value, created_at, ttl_ms, hit_count)
             VALUES(?, ?, ?, ?, ?)",
            params![
                entry.key,
                entry.value,
                created_ms,
                ttl,
                entry.hit_count as i64
            ],
        )
        .map_err(|e| CacheError::Backend(e.to_string()))?;
        Ok(())
    }

    fn remove(&self, key: &str) -> CacheResult<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        conn.execute("DELETE FROM proxy_cache WHERE key = ?", [key])
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        Ok(())
    }

    fn clear(&self) -> CacheResult<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        conn.execute("DELETE FROM proxy_cache", [])
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        Ok(())
    }

    fn len(&self) -> CacheResult<usize> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM proxy_cache", [], |r| r.get(0))
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        Ok(count as usize)
    }

    fn evict_expired(&self) -> CacheResult<u64> {
        let conn = self
            .conn
            .lock()
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        let now = Utc::now().timestamp_millis();
        let deleted = conn
            .execute(
                "DELETE FROM proxy_cache WHERE ttl_ms IS NOT NULL AND (created_at + ttl_ms) < ?",
                [now],
            )
            .map_err(|e| CacheError::Backend(e.to_string()))?;
        Ok(deleted as u64)
    }

    fn name(&self) -> &str {
        "sqlite"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_basic_ops() {
        let cache = SqliteCache::open_in_memory().unwrap();
        assert!(cache.is_empty().unwrap());

        cache.set(CacheEntry::new("a.com", "data-a", None)).unwrap();
        cache
            .set(CacheEntry::new("b.com", "data-b", Some(60_000)))
            .unwrap();
        assert_eq!(cache.len().unwrap(), 2);

        let entry = cache.get("a.com").unwrap().unwrap();
        assert_eq!(entry.value, "data-a");
        assert_eq!(entry.hit_count, 1);

        cache.remove("a.com").unwrap();
        assert_eq!(cache.len().unwrap(), 1);

        cache.clear().unwrap();
        assert!(cache.is_empty().unwrap());
    }

    #[test]
    fn test_sqlite_expired() {
        let cache = SqliteCache::open_in_memory().unwrap();
        let mut old = CacheEntry::new("stale.com", "old", Some(1));
        old.created_at = Utc::now() - chrono::Duration::seconds(10);
        cache.set(old).unwrap();

        // get should auto-evict
        assert!(cache.get("stale.com").unwrap().is_none());
        assert!(cache.is_empty().unwrap());
    }

    #[test]
    fn test_sqlite_evict_expired() {
        let cache = SqliteCache::open_in_memory().unwrap();
        let mut old = CacheEntry::new("stale.com", "old", Some(1));
        old.created_at = Utc::now() - chrono::Duration::seconds(10);
        cache.set(old).unwrap();
        cache
            .set(CacheEntry::new("fresh.com", "new", Some(600_000)))
            .unwrap();

        let evicted = cache.evict_expired().unwrap();
        assert_eq!(evicted, 1);
        assert_eq!(cache.len().unwrap(), 1);
    }

    #[test]
    fn test_sqlite_upsert() {
        let cache = SqliteCache::open_in_memory().unwrap();
        cache.set(CacheEntry::new("a.com", "v1", None)).unwrap();
        cache.set(CacheEntry::new("a.com", "v2", None)).unwrap();
        assert_eq!(cache.len().unwrap(), 1);
        assert_eq!(cache.get("a.com").unwrap().unwrap().value, "v2");
    }

    #[test]
    fn test_sqlite_hit_count() {
        let cache = SqliteCache::open_in_memory().unwrap();
        cache.set(CacheEntry::new("x.com", "data", None)).unwrap();
        cache.get("x.com").unwrap();
        cache.get("x.com").unwrap();
        let entry = cache.get("x.com").unwrap().unwrap();
        assert_eq!(entry.hit_count, 3);
    }

    #[test]
    fn test_sqlite_file_persistence() {
        let dir = std::env::temp_dir().join("wd_proxy_sqlite_test");
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test_persist.sqlite");
        let _ = std::fs::remove_file(&path);

        {
            let cache = SqliteCache::open(&path).unwrap();
            cache
                .set(CacheEntry::new("persist.com", "value", None))
                .unwrap();
        }

        {
            let cache = SqliteCache::open(&path).unwrap();
            let entry = cache.get("persist.com").unwrap().unwrap();
            assert_eq!(entry.value, "value");
        }

        let _ = std::fs::remove_file(&path);
    }
}
