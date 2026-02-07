pub mod parser;
pub mod availability;

use whois_rust::{WhoIs, WhoIsLookupOptions};
use trust_dns_resolver::TokioAsyncResolver;
use trust_dns_resolver::config::*;
use rusqlite::{params, Connection};
use chrono::Utc;
use serde::{Serialize, Deserialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct HistoryEntry {
    pub domain: String,
    pub timestamp: i64,
    pub status: String,
}

pub async fn perform_lookup(domain: &str, timeout_ms: u64) -> Result<String, String> {
    let whois = WhoIs::from_string(&format!(
        "{{\"server\": null, \"port\": 43, \"timeout\": {}, \"follow\": 0, \"punycode\": false}}",
        timeout_ms
    )).map_err(|e| e.to_string())?;
    
    whois.lookup(WhoIsLookupOptions::from_string(domain).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

pub async fn dns_lookup(domain: &str) -> Result<bool, String> {
    let resolver = TokioAsyncResolver::tokio(
        ResolverConfig::default(),
        ResolverOpts::default(),
    );
    
    match resolver.ns_lookup(domain).await {
        Ok(ns) => Ok(!ns.into_iter().next().is_none()),
        Err(_) => Ok(false),
    }
}

pub async fn rdap_lookup(domain: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("https://rdap.org/domain/{}", domain);
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    res.text().await.map_err(|e| e.to_string())
}

// Database Operations
pub fn db_history_add(path: &str, domain: &str, status: &str) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)",
        [],
    ).map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO history(domain, timestamp, status) VALUES(?, ?, ?)",
        params![domain, Utc::now().timestamp_millis(), status],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn db_history_get(path: &str, limit: u32) -> Result<Vec<HistoryEntry>, String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS history(domain TEXT, timestamp INTEGER, status TEXT)",
        [],
    ).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT domain, timestamp, status FROM history ORDER BY timestamp DESC LIMIT ?")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([limit], |row| {
        Ok(HistoryEntry {
            domain: row.get(0)?,
            timestamp: row.get(1)?,
            status: row.get(2)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut entries = Vec::new();
    for row in rows {
        entries.push(row.map_err(|e| e.to_string())?);
    }
    Ok(entries)
}

pub fn db_cache_get(path: &str, key: &str, ttl_ms: Option<u64>) -> Result<Option<String>, String> {
    if !Path::new(path).exists() { return Ok(None); }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)",
        [],
    ).map_err(|e| e.to_string())?;
    
    let mut stmt = conn.prepare("SELECT response, timestamp FROM cache WHERE key = ?")
        .map_err(|e| e.to_string())?;
    
    let mut rows = stmt.query([key]).map_err(|e| e.to_string())?;
    
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let response: String = row.get(0).map_err(|e| e.to_string())?;
        let timestamp: i64 = row.get(1).map_err(|e| e.to_string())?;
        
        if let Some(ttl) = ttl_ms {
            if (Utc::now().timestamp_millis() - timestamp) > ttl as i64 {
                let _ = conn.execute("DELETE FROM cache WHERE key = ?", [key]);
                return Ok(None);
            }
        }
        return Ok(Some(response));
    }
    
    Ok(None)
}

pub fn db_cache_set(path: &str, key: &str, response: &str, max_entries: Option<u32>) -> Result<(), String> {
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, response TEXT, timestamp INTEGER)",
        [],
    ).map_err(|e| e.to_string())?;
    
    conn.execute(
        "INSERT OR REPLACE INTO cache(key, response, timestamp) VALUES(?, ?, ?)",
        params![key, response, Utc::now().timestamp_millis()],
    ).map_err(|e| e.to_string())?;
    
    if let Some(max) = max_entries {
        let count: u32 = conn.query_row("SELECT COUNT(*) FROM cache", [], |r| r.get(0)).map_err(|e| e.to_string())?;
        if count > max {
            let to_delete = count - max;
            conn.execute(
                "DELETE FROM cache WHERE key IN (SELECT key FROM cache ORDER BY timestamp ASC LIMIT ?)",
                [to_delete],
            ).map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as stdfs;

    // ── DNS lookup edge cases ────────────────────────────────────────────

    #[tokio::test]
    async fn test_dns_lookup_edge_cases() {
        // Non-existent domain
        let res = dns_lookup("non-existent-domain-123456789.com").await.unwrap();
        assert_eq!(res, false);
    }

    #[tokio::test]
    async fn test_rdap_lookup_edge_cases() {
        // Invalid domain
        let res = rdap_lookup("invalid..domain").await;
        assert!(res.is_err() || res.unwrap().contains("error"));
    }

    // ── History DB roundtrip ─────────────────────────────────────────────

    #[test]
    fn test_db_history_add_and_get_roundtrip() {
        let dir = std::env::temp_dir().join("wd_test_history_roundtrip");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("history.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        // Add entries
        db_history_add(&path_str, "example.com", "available").unwrap();
        db_history_add(&path_str, "test.org", "unavailable").unwrap();
        db_history_add(&path_str, "sample.net", "error").unwrap();

        // Get entries
        let entries = db_history_get(&path_str, 10).unwrap();
        assert_eq!(entries.len(), 3);

        // Most recent first
        assert_eq!(entries[0].domain, "sample.net");
        assert_eq!(entries[0].status, "error");
        assert_eq!(entries[1].domain, "test.org");
        assert_eq!(entries[2].domain, "example.com");

        // Timestamps should be reasonable
        for entry in &entries {
            assert!(entry.timestamp > 0);
        }

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_history_get_with_limit() {
        let dir = std::env::temp_dir().join("wd_test_history_limit");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("history.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        for i in 0..20 {
            db_history_add(&path_str, &format!("domain{}.com", i), "available").unwrap();
        }

        let entries = db_history_get(&path_str, 5).unwrap();
        assert_eq!(entries.len(), 5);

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_history_get_empty() {
        let dir = std::env::temp_dir().join("wd_test_history_empty");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("history.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        let entries = db_history_get(&path_str, 10).unwrap();
        assert!(entries.is_empty());

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_history_get_non_existent() {
        let res = db_history_get("non_existent_db.sqlite", 10).unwrap();
        assert!(res.is_empty());
    }

    // ── Cache DB roundtrip ───────────────────────────────────────────────

    #[test]
    fn test_db_cache_set_and_get_roundtrip() {
        let dir = std::env::temp_dir().join("wd_test_cache_roundtrip");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        db_cache_set(&path_str, "example.com", "whois data here", None).unwrap();

        let result = db_cache_get(&path_str, "example.com", None).unwrap();
        assert_eq!(result, Some("whois data here".to_string()));

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_cache_get_missing_key() {
        let dir = std::env::temp_dir().join("wd_test_cache_missing");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        db_cache_set(&path_str, "other.com", "data", None).unwrap();

        let result = db_cache_get(&path_str, "nonexistent.com", None).unwrap();
        assert!(result.is_none());

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_cache_get_non_existent() {
        let res = db_cache_get("non_existent_cache.sqlite", "key", None).unwrap();
        assert!(res.is_none());
    }

    #[test]
    fn test_db_cache_overwrite() {
        let dir = std::env::temp_dir().join("wd_test_cache_overwrite");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        db_cache_set(&path_str, "key", "value1", None).unwrap();
        db_cache_set(&path_str, "key", "value2", None).unwrap();

        let result = db_cache_get(&path_str, "key", None).unwrap();
        assert_eq!(result, Some("value2".to_string()));

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_cache_ttl_expired() {
        let dir = std::env::temp_dir().join("wd_test_cache_ttl");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        db_cache_set(&path_str, "key", "data", None).unwrap();

        // Request with TTL of 0ms → should be expired immediately
        let result = db_cache_get(&path_str, "key", Some(0)).unwrap();
        assert!(result.is_none());

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_cache_ttl_not_expired() {
        let dir = std::env::temp_dir().join("wd_test_cache_ttl_ok");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        db_cache_set(&path_str, "key", "data", None).unwrap();

        // Request with very long TTL → should still be present
        let result = db_cache_get(&path_str, "key", Some(60_000)).unwrap();
        assert_eq!(result, Some("data".to_string()));

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_cache_max_entries_eviction() {
        let dir = std::env::temp_dir().join("wd_test_cache_evict");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        // Add 5 entries with max 3
        for i in 0..5 {
            db_cache_set(
                &path_str,
                &format!("key{}", i),
                &format!("val{}", i),
                Some(3),
            ).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(10)); // Ensure distinct timestamps
        }

        // Only the 3 most recent should remain
        let conn = Connection::open(&db_path).unwrap();
        let count: u32 = conn.query_row("SELECT COUNT(*) FROM cache", [], |r| r.get(0)).unwrap();
        assert_eq!(count, 3);

        // Oldest entries should be evicted
        let result0 = db_cache_get(&path_str, "key0", None).unwrap();
        let result1 = db_cache_get(&path_str, "key1", None).unwrap();
        assert!(result0.is_none());
        assert!(result1.is_none());

        // Newest should remain
        let result4 = db_cache_get(&path_str, "key4", None).unwrap();
        assert_eq!(result4, Some("val4".to_string()));

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_cache_special_characters() {
        let dir = std::env::temp_dir().join("wd_test_cache_special");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        let key = "éxàmple.com";
        let value = "Registrar: GoDaddy 'LLC'\nStatus: \"ok\"\nUnicode: 日本語";
        db_cache_set(&path_str, key, value, None).unwrap();

        let result = db_cache_get(&path_str, key, None).unwrap();
        assert_eq!(result, Some(value.to_string()));

        let _ = stdfs::remove_dir_all(&dir);
    }

    #[test]
    fn test_db_cache_large_response() {
        let dir = std::env::temp_dir().join("wd_test_cache_large");
        let _ = stdfs::create_dir_all(&dir);
        let db_path = dir.join("cache.sqlite");
        let path_str = db_path.to_string_lossy().to_string();

        let large_value = "X".repeat(100_000);
        db_cache_set(&path_str, "large", &large_value, None).unwrap();

        let result = db_cache_get(&path_str, "large", None).unwrap();
        assert_eq!(result.unwrap().len(), 100_000);

        let _ = stdfs::remove_dir_all(&dir);
    }

    // ── HistoryEntry serialization ───────────────────────────────────────

    #[test]
    fn test_history_entry_serialization() {
        let entry = HistoryEntry {
            domain: "test.com".into(),
            timestamp: 1700000000000,
            status: "available".into(),
        };
        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"domain\":\"test.com\""));
        assert!(json.contains("\"timestamp\":1700000000000"));
        assert!(json.contains("\"status\":\"available\""));
    }

    #[test]
    fn test_history_entry_deserialization() {
        let json = r#"{"domain":"sample.org","timestamp":999,"status":"error"}"#;
        let entry: HistoryEntry = serde_json::from_str(json).unwrap();
        assert_eq!(entry.domain, "sample.org");
        assert_eq!(entry.timestamp, 999);
        assert_eq!(entry.status, "error");
    }
}