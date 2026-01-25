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

    #[test]
    fn test_db_history_get_non_existent() {
        let res = db_history_get("non_existent_db.sqlite", 10).unwrap();
        assert!(res.is_empty());
    }

    #[test]
    fn test_db_cache_get_non_existent() {
        let res = db_cache_get("non_existent_cache.sqlite", "key", None).unwrap();
        assert!(res.is_none());
    }
}