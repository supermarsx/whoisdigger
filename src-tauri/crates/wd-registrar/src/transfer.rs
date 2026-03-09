use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Status of a domain transfer.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TransferStatus {
    Pending,
    AuthCodeRequired,
    AuthCodeSubmitted,
    InProgress,
    AwaitingApproval,
    Completed,
    Failed,
    Cancelled,
}

/// A domain transfer request.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TransferRequest {
    pub domain: String,
    pub source_registrar: Option<String>,
    pub target_registrar: String,
    pub auth_code: Option<String>,
    pub status: TransferStatus,
    pub privacy: bool,
    pub auto_renew: bool,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
}

impl TransferRequest {
    pub fn new(domain: impl Into<String>, target_registrar: impl Into<String>) -> Self {
        Self {
            domain: domain.into(),
            source_registrar: None,
            target_registrar: target_registrar.into(),
            auth_code: None,
            status: TransferStatus::Pending,
            privacy: true,
            auto_renew: true,
            created_at: Utc::now(),
            completed_at: None,
            error: None,
        }
    }

    pub fn with_auth_code(mut self, code: impl Into<String>) -> Self {
        self.auth_code = Some(code.into());
        self.status = TransferStatus::AuthCodeSubmitted;
        self
    }

    pub fn with_source(mut self, registrar: impl Into<String>) -> Self {
        self.source_registrar = Some(registrar.into());
        self
    }

    pub fn is_terminal(&self) -> bool {
        matches!(
            self.status,
            TransferStatus::Completed | TransferStatus::Failed | TransferStatus::Cancelled
        )
    }
}

/// A batch of transfer requests.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TransferBatch {
    pub id: String,
    pub target_registrar: String,
    pub transfers: Vec<TransferRequest>,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub created_at: DateTime<Utc>,
}

impl TransferBatch {
    pub fn new(target_registrar: impl Into<String>, domains: Vec<String>) -> Self {
        let target = target_registrar.into();
        let transfers = domains
            .into_iter()
            .map(|d| TransferRequest::new(d, target.clone()))
            .collect();
        Self {
            id: format!("batch_{}", Utc::now().timestamp_millis()),
            target_registrar: target,
            transfers,
            created_at: Utc::now(),
        }
    }

    pub fn len(&self) -> usize {
        self.transfers.len()
    }
    pub fn is_empty(&self) -> bool {
        self.transfers.is_empty()
    }

    /// Count by status.
    pub fn count_by_status(&self, status: &TransferStatus) -> usize {
        self.transfers
            .iter()
            .filter(|t| t.status == *status)
            .count()
    }

    /// Transfers needing auth codes.
    pub fn needs_auth_code(&self) -> Vec<&TransferRequest> {
        self.transfers
            .iter()
            .filter(|t| {
                t.status == TransferStatus::AuthCodeRequired
                    || (t.status == TransferStatus::Pending && t.auth_code.is_none())
            })
            .collect()
    }

    /// Overall completion rate.
    pub fn completion_rate(&self) -> f64 {
        if self.transfers.is_empty() {
            return 0.0;
        }
        let completed = self.transfers.iter().filter(|t| t.is_terminal()).count();
        completed as f64 / self.transfers.len() as f64
    }

    /// Summary string.
    pub fn summary(&self) -> String {
        let completed = self.count_by_status(&TransferStatus::Completed);
        let failed = self.count_by_status(&TransferStatus::Failed);
        let pending = self.transfers.iter().filter(|t| !t.is_terminal()).count();
        format!(
            "{} transfers: {} completed, {} failed, {} pending",
            self.len(),
            completed,
            failed,
            pending
        )
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transfer_request() {
        let req = TransferRequest::new("example.com", "cloudflare");
        assert_eq!(req.status, TransferStatus::Pending);
        assert!(!req.is_terminal());
    }

    #[test]
    fn test_with_auth_code() {
        let req = TransferRequest::new("example.com", "cloudflare").with_auth_code("AUTH123");
        assert_eq!(req.status, TransferStatus::AuthCodeSubmitted);
    }

    #[test]
    fn test_terminal_states() {
        let mut req = TransferRequest::new("x.com", "cf");
        assert!(!req.is_terminal());
        req.status = TransferStatus::Completed;
        assert!(req.is_terminal());
        req.status = TransferStatus::Failed;
        assert!(req.is_terminal());
    }

    #[test]
    fn test_batch_creation() {
        let batch = TransferBatch::new("cloudflare", vec!["a.com".into(), "b.com".into()]);
        assert_eq!(batch.len(), 2);
        assert_eq!(batch.target_registrar, "cloudflare");
    }

    #[test]
    fn test_batch_needs_auth_code() {
        let batch = TransferBatch::new("cf", vec!["a.com".into(), "b.com".into()]);
        // All pending without auth codes
        assert_eq!(batch.needs_auth_code().len(), 2);
    }

    #[test]
    fn test_batch_completion_rate() {
        let mut batch = TransferBatch::new("cf", vec!["a.com".into(), "b.com".into()]);
        assert_eq!(batch.completion_rate(), 0.0);
        batch.transfers[0].status = TransferStatus::Completed;
        assert!((batch.completion_rate() - 0.5).abs() < 0.01);
    }

    #[test]
    fn test_batch_summary() {
        let batch = TransferBatch::new("cf", vec!["a.com".into()]);
        let s = batch.summary();
        assert!(s.contains("1 transfers"));
    }
}
