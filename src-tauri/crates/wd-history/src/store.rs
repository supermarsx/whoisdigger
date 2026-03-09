use crate::snapshot::{LookupProtocol, Snapshot};
use rusqlite::{params, Connection, Result as SqlResult};
use std::sync::Mutex;

/// Persistent SQLite store for history snapshots.
pub struct HistoryStore {
    conn: Mutex<Connection>,
}

impl HistoryStore {
    /// Open or create a history database at the given path.
    pub fn open(path: &str) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        let store = Self {
            conn: Mutex::new(conn),
        };
        store.init_tables()?;
        Ok(store)
    }

    /// Open an in-memory store (for tests).
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
            CREATE TABLE IF NOT EXISTS snapshots (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                domain        TEXT NOT NULL,
                protocol      TEXT NOT NULL,
                captured_at   TEXT NOT NULL,
                raw_response  TEXT NOT NULL,
                fields_json   TEXT NOT NULL DEFAULT '{}',
                registrar     TEXT,
                nameservers   TEXT NOT NULL DEFAULT '[]',
                status_codes  TEXT NOT NULL DEFAULT '[]',
                created_date  TEXT,
                expiry_date   TEXT,
                updated_date  TEXT,
                tags_json     TEXT NOT NULL DEFAULT '[]'
            );
            CREATE INDEX IF NOT EXISTS idx_snap_domain ON snapshots(domain);
            CREATE INDEX IF NOT EXISTS idx_snap_captured ON snapshots(captured_at);
        ",
        )?;
        Ok(())
    }

    /// Insert a snapshot and return its assigned id.
    pub fn insert(&self, snap: &Snapshot) -> SqlResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO snapshots (domain, protocol, captured_at, raw_response,
             fields_json, registrar, nameservers, status_codes, created_date,
             expiry_date, updated_date, tags_json)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![
                snap.domain,
                snap.protocol.to_string(),
                snap.captured_at.to_rfc3339(),
                snap.raw_response,
                serde_json::to_string(&snap.fields).unwrap_or_default(),
                snap.registrar,
                serde_json::to_string(&snap.nameservers).unwrap_or_default(),
                serde_json::to_string(&snap.status_codes).unwrap_or_default(),
                snap.created_date.map(|d| d.to_rfc3339()),
                snap.expiry_date.map(|d| d.to_rfc3339()),
                snap.updated_date.map(|d| d.to_rfc3339()),
                serde_json::to_string(&snap.tags).unwrap_or_default(),
            ],
        )?;
        Ok(conn.last_insert_rowid())
    }

    /// Retrieve all snapshots for a domain, oldest first.
    pub fn get_domain_snapshots(&self, domain: &str) -> SqlResult<Vec<Snapshot>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, domain, protocol, captured_at, raw_response, fields_json,
                    registrar, nameservers, status_codes, created_date, expiry_date,
                    updated_date, tags_json
             FROM snapshots WHERE domain = ?1 ORDER BY captured_at ASC",
        )?;
        let rows = stmt.query_map(params![domain], |row| Ok(row_to_snapshot(row)))?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    /// List all distinct domains that have at least one snapshot.
    pub fn list_domains(&self) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT DISTINCT domain FROM snapshots ORDER BY domain")?;
        let rows = stmt.query_map([], |row| row.get(0))?;
        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }

    /// Count total snapshots in the store.
    pub fn count(&self) -> SqlResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM snapshots", [], |r| r.get(0))
    }

    /// Delete all snapshots for a domain.
    pub fn delete_domain(&self, domain: &str) -> SqlResult<usize> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM snapshots WHERE domain = ?1", params![domain])
    }

    /// Delete all snapshots.
    pub fn clear(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM snapshots", [])?;
        Ok(())
    }
}

fn row_to_snapshot(row: &rusqlite::Row) -> Snapshot {
    let id: i64 = row.get_unwrap(0);
    let domain: String = row.get_unwrap(1);
    let protocol_str: String = row.get_unwrap(2);
    let captured_at_str: String = row.get_unwrap(3);
    let raw_response: String = row.get_unwrap(4);
    let fields_json: String = row.get_unwrap(5);
    let registrar: Option<String> = row.get_unwrap(6);
    let ns_json: String = row.get_unwrap(7);
    let sc_json: String = row.get_unwrap(8);
    let created_str: Option<String> = row.get_unwrap(9);
    let expiry_str: Option<String> = row.get_unwrap(10);
    let updated_str: Option<String> = row.get_unwrap(11);
    let tags_json: String = row.get_unwrap(12);

    let protocol = match protocol_str.as_str() {
        "rdap" => LookupProtocol::Rdap,
        "dns" => LookupProtocol::Dns,
        _ => LookupProtocol::Whois,
    };

    Snapshot {
        id: Some(id),
        domain,
        protocol,
        captured_at: chrono::DateTime::parse_from_rfc3339(&captured_at_str)
            .map(|d| d.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now()),
        raw_response,
        fields: serde_json::from_str(&fields_json).unwrap_or_default(),
        registrar,
        nameservers: serde_json::from_str(&ns_json).unwrap_or_default(),
        status_codes: serde_json::from_str(&sc_json).unwrap_or_default(),
        created_date: created_str.and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(&s)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        }),
        expiry_date: expiry_str.and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(&s)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        }),
        updated_date: updated_str.and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(&s)
                .ok()
                .map(|d| d.with_timezone(&chrono::Utc))
        }),
        tags: serde_json::from_str(&tags_json).unwrap_or_default(),
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_insert_and_retrieve() {
        let store = HistoryStore::open_in_memory().unwrap();
        let snap = Snapshot::new("t.com", LookupProtocol::Whois, "raw").with_registrar("TestCo");
        let id = store.insert(&snap).unwrap();
        assert!(id > 0);
        let list = store.get_domain_snapshots("t.com").unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].registrar.as_deref(), Some("TestCo"));
    }

    #[test]
    fn test_store_list_domains() {
        let store = HistoryStore::open_in_memory().unwrap();
        store
            .insert(&Snapshot::new("a.com", LookupProtocol::Whois, ""))
            .unwrap();
        store
            .insert(&Snapshot::new("b.com", LookupProtocol::Rdap, ""))
            .unwrap();
        store
            .insert(&Snapshot::new("a.com", LookupProtocol::Whois, ""))
            .unwrap();
        let domains = store.list_domains().unwrap();
        assert_eq!(domains, vec!["a.com", "b.com"]);
    }

    #[test]
    fn test_store_count_and_clear() {
        let store = HistoryStore::open_in_memory().unwrap();
        store
            .insert(&Snapshot::new("x.com", LookupProtocol::Whois, ""))
            .unwrap();
        store
            .insert(&Snapshot::new("y.com", LookupProtocol::Whois, ""))
            .unwrap();
        assert_eq!(store.count().unwrap(), 2);
        store.clear().unwrap();
        assert_eq!(store.count().unwrap(), 0);
    }

    #[test]
    fn test_store_delete_domain() {
        let store = HistoryStore::open_in_memory().unwrap();
        store
            .insert(&Snapshot::new("x.com", LookupProtocol::Whois, ""))
            .unwrap();
        store
            .insert(&Snapshot::new("x.com", LookupProtocol::Whois, ""))
            .unwrap();
        store
            .insert(&Snapshot::new("y.com", LookupProtocol::Whois, ""))
            .unwrap();
        let deleted = store.delete_domain("x.com").unwrap();
        assert_eq!(deleted, 2);
        assert_eq!(store.count().unwrap(), 1);
    }
}
