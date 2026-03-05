use rusqlite::{params, Connection, Result as SqlResult};
use serde_json;

use crate::session::{ChatSession, SessionStatus};

/// SQLite-backed persistence for chat sessions.
pub struct ChatStore {
    conn: Connection,
}

impl ChatStore {
    /// Open (or create) a SQLite database at the given path.
    pub fn open(path: &str) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        let store = Self { conn };
        store.init_tables()?;
        Ok(store)
    }

    /// Create an in-memory store (useful for tests).
    pub fn in_memory() -> SqlResult<Self> {
        let conn = Connection::open_in_memory()?;
        let store = Self { conn };
        store.init_tables()?;
        Ok(store)
    }

    fn init_tables(&self) -> SqlResult<()> {
        self.conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sessions (
                id          TEXT PRIMARY KEY,
                title       TEXT NOT NULL,
                status      TEXT NOT NULL DEFAULT 'active',
                data        TEXT NOT NULL,
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
            CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);",
        )?;
        Ok(())
    }

    /// Save or update a session.
    pub fn save(&self, session: &ChatSession) -> SqlResult<()> {
        let data = serde_json::to_string(session).unwrap_or_default();
        let status = match session.status {
            SessionStatus::Active => "active",
            SessionStatus::Archived => "archived",
            SessionStatus::Deleted => "deleted",
        };
        self.conn.execute(
            "INSERT INTO sessions (id, title, status, data, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                status = excluded.status,
                data = excluded.data,
                updated_at = excluded.updated_at",
            params![
                session.id,
                session.title,
                status,
                data,
                session.created_at.to_rfc3339(),
                session.updated_at.to_rfc3339(),
            ],
        )?;
        Ok(())
    }

    /// Load a session by ID.
    pub fn load(&self, id: &str) -> SqlResult<Option<ChatSession>> {
        let mut stmt = self.conn.prepare("SELECT data FROM sessions WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let data: String = row.get(0)?;
            let session: ChatSession = serde_json::from_str(&data).unwrap();
            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    /// List sessions by status, ordered by most recently updated.
    pub fn list_by_status(&self, status: &str, limit: usize) -> SqlResult<Vec<ChatSession>> {
        let mut stmt = self.conn.prepare(
            "SELECT data FROM sessions WHERE status = ?1 ORDER BY updated_at DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![status, limit as i64], |row| {
            let data: String = row.get(0)?;
            Ok(data)
        })?;

        let mut sessions = Vec::new();
        for row in rows {
            let data = row?;
            if let Ok(s) = serde_json::from_str::<ChatSession>(&data) {
                sessions.push(s);
            }
        }
        Ok(sessions)
    }

    /// List all active sessions.
    pub fn list_active(&self, limit: usize) -> SqlResult<Vec<ChatSession>> {
        self.list_by_status("active", limit)
    }

    /// List archived sessions.
    pub fn list_archived(&self, limit: usize) -> SqlResult<Vec<ChatSession>> {
        self.list_by_status("archived", limit)
    }

    /// Delete a session permanently.
    pub fn delete(&self, id: &str) -> SqlResult<bool> {
        let changed = self
            .conn
            .execute("DELETE FROM sessions WHERE id = ?1", params![id])?;
        Ok(changed > 0)
    }

    /// Search sessions by title (case-insensitive LIKE).
    pub fn search_by_title(&self, query: &str, limit: usize) -> SqlResult<Vec<ChatSession>> {
        let pattern = format!("%{query}%");
        let mut stmt = self.conn.prepare(
            "SELECT data FROM sessions WHERE title LIKE ?1 AND status != 'deleted' ORDER BY updated_at DESC LIMIT ?2",
        )?;
        let rows = stmt.query_map(params![pattern, limit as i64], |row| {
            let data: String = row.get(0)?;
            Ok(data)
        })?;
        let mut sessions = Vec::new();
        for row in rows {
            let data = row?;
            if let Ok(s) = serde_json::from_str::<ChatSession>(&data) {
                sessions.push(s);
            }
        }
        Ok(sessions)
    }

    /// Count sessions by status.
    pub fn count_by_status(&self, status: &str) -> SqlResult<usize> {
        let mut stmt = self
            .conn
            .prepare("SELECT COUNT(*) FROM sessions WHERE status = ?1")?;
        let count: i64 = stmt.query_row(params![status], |row| row.get(0))?;
        Ok(count as usize)
    }

    /// Count all non-deleted sessions.
    pub fn count_all(&self) -> SqlResult<usize> {
        let mut stmt = self
            .conn
            .prepare("SELECT COUNT(*) FROM sessions WHERE status != 'deleted'")?;
        let count: i64 = stmt.query_row([], |row| row.get(0))?;
        Ok(count as usize)
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persona::PersonaKind;

    fn make_session(title: &str) -> ChatSession {
        let mut s = ChatSession::new(PersonaKind::DomainExpert, Some(title));
        s.add_user_message("test message");
        s
    }

    #[test]
    fn test_save_and_load() {
        let store = ChatStore::in_memory().unwrap();
        let s = make_session("My Session");
        store.save(&s).unwrap();
        let loaded = store.load(&s.id).unwrap().unwrap();
        assert_eq!(loaded.title, "My Session");
        assert_eq!(loaded.messages.len(), 1);
    }

    #[test]
    fn test_load_missing() {
        let store = ChatStore::in_memory().unwrap();
        assert!(store.load("nope").unwrap().is_none());
    }

    #[test]
    fn test_list_active() {
        let store = ChatStore::in_memory().unwrap();
        store.save(&make_session("A")).unwrap();
        store.save(&make_session("B")).unwrap();
        let list = store.list_active(10).unwrap();
        assert_eq!(list.len(), 2);
    }

    #[test]
    fn test_list_archived() {
        let store = ChatStore::in_memory().unwrap();
        let mut s = make_session("Old");
        s.archive();
        store.save(&s).unwrap();
        assert_eq!(store.list_archived(10).unwrap().len(), 1);
        assert_eq!(store.list_active(10).unwrap().len(), 0);
    }

    #[test]
    fn test_delete() {
        let store = ChatStore::in_memory().unwrap();
        let s = make_session("Del");
        store.save(&s).unwrap();
        assert!(store.delete(&s.id).unwrap());
        assert!(store.load(&s.id).unwrap().is_none());
        assert!(!store.delete("nope").unwrap());
    }

    #[test]
    fn test_search_by_title() {
        let store = ChatStore::in_memory().unwrap();
        store.save(&make_session("Whois Query")).unwrap();
        store.save(&make_session("DNS Analysis")).unwrap();
        let results = store.search_by_title("whois", 10).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Whois Query");
    }

    #[test]
    fn test_count() {
        let store = ChatStore::in_memory().unwrap();
        store.save(&make_session("A")).unwrap();
        store.save(&make_session("B")).unwrap();
        assert_eq!(store.count_by_status("active").unwrap(), 2);
        assert_eq!(store.count_all().unwrap(), 2);
    }

    #[test]
    fn test_upsert() {
        let store = ChatStore::in_memory().unwrap();
        let mut s = make_session("V1");
        store.save(&s).unwrap();
        s.title = "V2".to_string();
        store.save(&s).unwrap();
        let loaded = store.load(&s.id).unwrap().unwrap();
        assert_eq!(loaded.title, "V2");
        assert_eq!(store.count_all().unwrap(), 1);
    }
}
