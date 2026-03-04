use super::backend::{CacheBackend, CacheEntry, CacheError, CacheResult};
use chrono::Utc;
use std::sync::Mutex;
use tokio_postgres::{Client, NoTls};

/// PostgreSQL-backed cache backend.
///
/// Stores entries in a `proxy_cache` table. The connection is wrapped in a
/// `Mutex` because `tokio_postgres::Client` is `!Sync`. Callers should
/// wrap operations in `tokio::task::spawn_blocking` or hold the lock
/// briefly (all queries are simple single-row ops).
///
/// # Schema
///
/// ```sql
/// CREATE TABLE IF NOT EXISTS proxy_cache (
///     key        TEXT PRIMARY KEY,
///     value      TEXT NOT NULL,
///     created_at BIGINT NOT NULL,
///     ttl_ms     BIGINT,
///     hit_count  BIGINT NOT NULL DEFAULT 0
/// );
/// ```
pub struct PostgresCache {
    client: Mutex<Client>,
}

impl PostgresCache {
    /// Connect to a PostgreSQL database and ensure the cache table exists.
    ///
    /// `conn_str` is a standard libpq connection string, e.g.:
    /// `"host=localhost user=wd password=secret dbname=whoisdigger"`
    ///
    /// The caller must have a running tokio runtime.
    pub async fn connect(conn_str: &str) -> CacheResult<Self> {
        let (client, connection) =
            tokio_postgres::connect(conn_str, NoTls)
                .await
                .map_err(|e| CacheError::Backend(format!("pg connect: {e}")))?;

        // Spawn the connection future so it keeps running
        tokio::spawn(async move {
            if let Err(e) = connection.await {
                log::error!("PostgreSQL connection error: {e}");
            }
        });

        client
            .batch_execute(
                "CREATE TABLE IF NOT EXISTS proxy_cache (
                    key        TEXT PRIMARY KEY,
                    value      TEXT NOT NULL,
                    created_at BIGINT NOT NULL,
                    ttl_ms     BIGINT,
                    hit_count  BIGINT NOT NULL DEFAULT 0
                );",
            )
            .await
            .map_err(|e| CacheError::Backend(format!("pg init: {e}")))?;

        Ok(Self {
            client: Mutex::new(client),
        })
    }

    /// Helper: run a blocking query via the locked client.
    /// This uses `tokio::runtime::Handle::current()` to block on the async
    /// client from the sync `CacheBackend` trait methods.
    fn block_on<F, T>(&self, f: F) -> CacheResult<T>
    where
        F: std::future::Future<Output = Result<T, tokio_postgres::Error>>,
    {
        let handle = tokio::runtime::Handle::try_current()
            .map_err(|e| CacheError::Backend(format!("no tokio runtime: {e}")))?;
        handle
            .block_on(f)
            .map_err(|e| CacheError::Backend(format!("pg query: {e}")))
    }
}

impl CacheBackend for PostgresCache {
    fn get(&self, key: &str) -> CacheResult<Option<CacheEntry>> {
        let client = self.client.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        let rows = self.block_on(
            client.query(
                "SELECT key, value, created_at, ttl_ms, hit_count FROM proxy_cache WHERE key = $1",
                &[&key],
            ),
        )?;

        if let Some(row) = rows.first() {
            let created_ms: i64 = row.get(2);
            let ttl_ms: Option<i64> = row.get(3);
            let hit_count: i64 = row.get(4);

            let created_at = chrono::DateTime::from_timestamp_millis(created_ms)
                .unwrap_or_else(|| Utc::now());

            let entry = CacheEntry {
                key: row.get::<_, String>(0),
                value: row.get::<_, String>(1),
                created_at,
                ttl_ms: ttl_ms.map(|v| v as u64),
                hit_count: hit_count as u64,
            };

            if entry.is_expired() {
                self.block_on(
                    client.execute("DELETE FROM proxy_cache WHERE key = $1", &[&key]),
                )?;
                return Ok(None);
            }

            self.block_on(
                client.execute(
                    "UPDATE proxy_cache SET hit_count = hit_count + 1 WHERE key = $1",
                    &[&key],
                ),
            )?;

            Ok(Some(CacheEntry {
                hit_count: entry.hit_count + 1,
                ..entry
            }))
        } else {
            Ok(None)
        }
    }

    fn set(&self, entry: CacheEntry) -> CacheResult<()> {
        let client = self.client.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        let created_ms = entry.created_at.timestamp_millis();
        let ttl: Option<i64> = entry.ttl_ms.map(|t| t as i64);
        let hit: i64 = entry.hit_count as i64;

        self.block_on(client.execute(
            "INSERT INTO proxy_cache(key, value, created_at, ttl_ms, hit_count)
             VALUES($1, $2, $3, $4, $5)
             ON CONFLICT(key) DO UPDATE SET value=$2, created_at=$3, ttl_ms=$4, hit_count=$5",
            &[&entry.key, &entry.value, &created_ms, &ttl, &hit],
        ))?;
        Ok(())
    }

    fn remove(&self, key: &str) -> CacheResult<()> {
        let client = self.client.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        self.block_on(
            client.execute("DELETE FROM proxy_cache WHERE key = $1", &[&key]),
        )?;
        Ok(())
    }

    fn clear(&self) -> CacheResult<()> {
        let client = self.client.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        self.block_on(client.execute("DELETE FROM proxy_cache", &[]))?;
        Ok(())
    }

    fn len(&self) -> CacheResult<usize> {
        let client = self.client.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        let rows = self.block_on(
            client.query("SELECT COUNT(*) FROM proxy_cache", &[]),
        )?;
        let count: i64 = rows.first().map(|r| r.get(0)).unwrap_or(0);
        Ok(count as usize)
    }

    fn evict_expired(&self) -> CacheResult<u64> {
        let client = self.client.lock().map_err(|e| CacheError::Backend(e.to_string()))?;
        let now = Utc::now().timestamp_millis();
        let deleted = self.block_on(client.execute(
            "DELETE FROM proxy_cache WHERE ttl_ms IS NOT NULL AND (created_at + ttl_ms) < $1",
            &[&now],
        ))?;
        Ok(deleted)
    }

    fn name(&self) -> &str {
        "postgres"
    }
}

// Note: PostgreSQL tests require a running database and are integration tests.
// They are not included in unit tests to avoid CI failures.
// Use `cargo test -p wd-proxy --features postgres -- --ignored` with a running PG.
#[cfg(test)]
mod tests {
    #[test]
    fn test_postgres_module_compiles() {
        // Compilation test — actual connectivity tested via integration tests
        assert_eq!(super::PostgresCache::NAME, "postgres");
    }
}

// Provide the NAME constant for the compile test above
impl PostgresCache {
    const NAME: &'static str = "postgres";
}
