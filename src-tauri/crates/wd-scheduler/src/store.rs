use rusqlite::{params, Connection};
use std::sync::Mutex;

use crate::job::{Job, JobStatus};

/// SQLite-backed persistent store for scheduled jobs.
pub struct SchedulerStore {
    conn: Mutex<Connection>,
}

impl SchedulerStore {
    pub fn open(path: &str) -> Result<Self, rusqlite::Error> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn in_memory() -> Result<Self, rusqlite::Error> {
        let conn = Connection::open_in_memory()?;
        conn.execute(
            "CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )",
            [],
        )?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Upsert a job.
    pub fn save(&self, job: &Job) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let data = serde_json::to_string(job).unwrap_or_default();
        let status = serde_json::to_string(&job.status).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO jobs (id, data, status, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![job.id, data, status, job.created_at.timestamp()],
        )?;
        Ok(())
    }

    /// Get a job by ID.
    pub fn get(&self, id: &str) -> Result<Option<Job>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT data FROM jobs WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let data: String = row.get(0)?;
            Ok(serde_json::from_str(&data).ok())
        } else {
            Ok(None)
        }
    }

    /// Get all jobs.
    pub fn get_all(&self) -> Result<Vec<Job>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT data FROM jobs ORDER BY created_at DESC")?;
        let jobs = stmt
            .query_map([], |row| {
                let data: String = row.get(0)?;
                Ok(data)
            })?
            .filter_map(|r| r.ok())
            .filter_map(|data| serde_json::from_str(&data).ok())
            .collect();
        Ok(jobs)
    }

    /// Get active jobs that may be due.
    pub fn get_active(&self) -> Result<Vec<Job>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let status = serde_json::to_string(&JobStatus::Active).unwrap_or_default();
        let mut stmt = conn.prepare("SELECT data FROM jobs WHERE status = ?1")?;
        let jobs = stmt
            .query_map(params![status], |row| {
                let data: String = row.get(0)?;
                Ok(data)
            })?
            .filter_map(|r| r.ok())
            .filter_map(|data| serde_json::from_str(&data).ok())
            .collect();
        Ok(jobs)
    }

    /// Delete a job.
    pub fn delete(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let count = conn.execute("DELETE FROM jobs WHERE id = ?1", params![id])?;
        Ok(count > 0)
    }

    /// Count all jobs.
    pub fn count(&self) -> Result<usize, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM jobs", [], |row| row.get(0))
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schedule::Schedule;

    fn make_job(name: &str) -> Job {
        Job::new(name, vec!["example.com".into()], Schedule::every_hours(1))
    }

    #[test]
    fn test_save_and_get() {
        let store = SchedulerStore::in_memory().unwrap();
        let job = make_job("test");
        let id = job.id.clone();
        store.save(&job).unwrap();
        let loaded = store.get(&id).unwrap().unwrap();
        assert_eq!(loaded.name, "test");
    }

    #[test]
    fn test_get_all() {
        let store = SchedulerStore::in_memory().unwrap();
        store.save(&make_job("a")).unwrap();
        store.save(&make_job("b")).unwrap();
        assert_eq!(store.get_all().unwrap().len(), 2);
    }

    #[test]
    fn test_delete() {
        let store = SchedulerStore::in_memory().unwrap();
        let job = make_job("del");
        let id = job.id.clone();
        store.save(&job).unwrap();
        assert!(store.delete(&id).unwrap());
        assert!(store.get(&id).unwrap().is_none());
    }

    #[test]
    fn test_count() {
        let store = SchedulerStore::in_memory().unwrap();
        assert_eq!(store.count().unwrap(), 0);
        store.save(&make_job("x")).unwrap();
        assert_eq!(store.count().unwrap(), 1);
    }
}
