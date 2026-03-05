use serde::{Deserialize, Serialize};
use thiserror::Error;

/// All errors produced by the LLM layer.
#[derive(Error, Debug, Serialize, Deserialize, Clone)]
pub enum LlmError {
    #[error("authentication failed: {0}")]
    Auth(String),

    #[error("rate limited — retry after {retry_after_secs:?}s: {message}")]
    RateLimit {
        message: String,
        retry_after_secs: Option<u64>,
    },

    #[error("context window exceeded: {used} tokens used, max {max}")]
    ContextOverflow { used: usize, max: usize },

    #[error("provider returned HTTP {status}: {body}")]
    Http { status: u16, body: String },

    #[error("network error: {0}")]
    Network(String),

    #[error("stream parse error: {0}")]
    StreamParse(String),

    #[error("invalid tool call: {0}")]
    InvalidToolCall(String),

    #[error("unsupported feature: {0}")]
    Unsupported(String),

    #[error("timeout after {secs}s")]
    Timeout { secs: u64 },

    #[error("provider not found: {0}")]
    ProviderNotFound(String),

    #[error("configuration error: {0}")]
    Config(String),

    #[error("{0}")]
    Other(String),
}

impl From<String> for LlmError {
    fn from(s: String) -> Self {
        Self::Other(s)
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let e = LlmError::Auth("bad key".into());
        assert!(e.to_string().contains("bad key"));
    }

    #[test]
    fn test_rate_limit_display() {
        let e = LlmError::RateLimit {
            message: "slow down".into(),
            retry_after_secs: Some(30),
        };
        let s = e.to_string();
        assert!(s.contains("slow down"));
        assert!(s.contains("30"));
    }

    #[test]
    fn test_context_overflow() {
        let e = LlmError::ContextOverflow {
            used: 200_000,
            max: 128_000,
        };
        assert!(e.to_string().contains("200000"));
    }

    #[test]
    fn test_from_string() {
        let e: LlmError = "oops".to_string().into();
        assert!(matches!(e, LlmError::Other(_)));
    }

    #[test]
    fn test_error_serialize_roundtrip() {
        let e = LlmError::Http {
            status: 429,
            body: "too many".into(),
        };
        let json = serde_json::to_string(&e).unwrap();
        let e2: LlmError = serde_json::from_str(&json).unwrap();
        assert!(e2.to_string().contains("429"));
    }
}
