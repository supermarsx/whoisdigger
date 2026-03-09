use crate::watchlist::{WatchEntry, WatchPriority};
use rusqlite::{params, Connection, Result as SqlResult};
use std::sync::Mutex;

/// SQLite-backed persistence for the watchlist.
pub struct ExpiryStore {
    conn: Mutex<Connection>,
}

impl ExpiryStore {
    pub fn open(path: &str) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        let store = Self {
            conn: Mutex::new(conn),
        };
        store.init_tables()?;
        Ok(store)
    }

    pub fn open_in_memory() -> SqlResult<Self> {
        let conn = Connection::open_in_memory()?;
        let store = Self {
            conn: Mutex::new(conn),
        };
        store.init_tables()?;
        Ok(store)
    }

    fn init_tables(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS watchlist (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                domain       TEXT NOT NULL UNIQUE,
                priority     TEXT NOT NULL DEFAULT 'medium',
                added_at     TEXT NOT NULL,
                last_checked TEXT,
                expiry_date  TEXT,
                registrar    TEXT,
                notify       INTEGER NOT NULL DEFAULT 1,
                notes        TEXT,
                active       INTEGER NOT NULL DEFAULT 1
            );
            CREATE INDEX IF NOT EXISTS idx_watch_domain ON watchlist(domain);
        ",
        )?;
        Ok(())
    }

    /// Insert or update a watch entry (upsert on domain).
    pub fn upsert(&self, entry: &WatchEntry) -> SqlResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO watchlist (domain, priority, added_at, last_checked, expiry_date,
                                    registrar, notify, notes, active)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)
             ON CONFLICT(domain) DO UPDATE SET
                priority=excluded.priority, last_checked=excluded.last_checked,
                expiry_date=excluded.expiry_date, registrar=excluded.registrar,
                notify=excluded.notify, notes=excluded.notes, active=excluded.active",
            params![
                entry.domain,
                format!("{:?}", entry.priority).to_lowercase(),
                entry.added_at.to_rfc3339(),
                entry.last_checked.map(|d| d.to_rfc3339()),
                entry.expiry_date.map(|d| d.to_rfc3339()),
                entry.registrar,
                entry.notify as i32,
                entry.notes,
                entry.active as i32,
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// Get all watch entries.
    pub fn get_all(&self) -> SqlResult<Vec<WatchEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, domain, priority, added_at, last_checked, expiry_date,
                    registrar, notify, notes, active
             FROM watchlist ORDER BY domain",
        )?;
        let rows = stmt.query_map([], |row| Ok(row_to_entry(row)))?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    /// Remove a domain from the watchlist.
    pub fn remove(&self, domain: &str) -> SqlResult<bool> {
        let conn = self.conn.lock().unwrap();
        let n = conn.execute("DELETE FROM watchlist WHERE domain = ?1", params![domain])?;
        Ok(n > 0)
    }

    /// Count entries.
    pub fn count(&self) -> SqlResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM watchlist", [], |r| r.get(0))
    }
}

fn row_to_entry(row: &rusqlite::Row) -> WatchEntry {
    let id: i64 = row.get_unwrap(0);
    let domain: String = row.get_unwrap(1);
    let priority_str: String = row.get_unwrap(2);
    let added_at_str: String = row.get_unwrap(3);
    let last_checked_str: Option<String> = row.get_unwrap(4);
    let expiry_str: Option<String> = row.get_unwrap(5);
    let registrar: Option<String> = row.get_unwrap(6);
    let notify: i32 = row.get_unwrap(7);
    let notes: Option<String> = row.get_unwrap(8);
    let active: i32 = row.get_unwrap(9);

    let priority = match priority_str.as_str() {
        "low" => WatchPriority::Low,
        "high" => WatchPriority::High,
        "critical" => WatchPriority::Critical,
        _ => WatchPriority::Medium,
    };

    WatchEntry {
        id: Some(id),
        domain,
        priority,
        added_at: chrono::DateTime::parse_from_rfc3339(&added_at_str)
            .map(|d| d.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()),
        last_checked: last_checked_str.and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(&s)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        }),
        expiry_date: expiry_str.and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(&s)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        }),
        registrar,
        notify: notify != 0,
        notes,
        active: active != 0,
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_upsert_and_get() {
        let store = ExpiryStore::open_in_memory().unwrap();
        let entry = WatchEntry::new("example.com").with_priority(WatchPriority::High);
        store.upsert(&entry).unwrap();
        let all = store.get_all().unwrap();
        assert_eq!(all.len(), 1);
        assert_eq!(all[0].domain, "example.com");
        assert_eq!(all[0].priority, WatchPriority::High);
    }

    #[test]
    fn test_store_upsert_update() {
        let store = ExpiryStore::open_in_memory().unwrap();
        store
            .upsert(&WatchEntry::new("x.com").with_priority(WatchPriority::Low))
            .unwrap();
        store
            .upsert(&WatchEntry::new("x.com").with_priority(WatchPriority::Critical))
            .unwrap();
        assert_eq!(store.count().unwrap(), 1);
        let all = store.get_all().unwrap();
        assert_eq!(all[0].priority, WatchPriority::Critical);
    }

    #[test]
    fn test_store_remove() {
        let store = ExpiryStore::open_in_memory().unwrap();
        store.upsert(&WatchEntry::new("a.com")).unwrap();
        assert!(store.remove("a.com").unwrap());
        assert!(!store.remove("a.com").unwrap());
        assert_eq!(store.count().unwrap(), 0);
    }
}
