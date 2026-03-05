use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::profile::ServerProfile;

/// Decision returned by the throttle engine.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ThrottleDecision {
    /// Proceed immediately.
    Allow,
    /// Wait this many milliseconds before proceeding.
    Wait(u64),
    /// Do not send — server is in backoff.
    Deny { reason: String, retry_after_ms: u64 },
}

/// Per-server token bucket state.
struct BucketState {
    tokens: f64,
    last_refill: Instant,
    max_tokens: f64,
    refill_rate: f64, // tokens per second
    consecutive_rate_limits: u32,
    backoff_until: Option<Instant>,
}

impl BucketState {
    fn new(profile: &ServerProfile) -> Self {
        let max_tokens = profile.max_rpm as f64;
        let refill_rate = profile.max_rpm as f64 / 60.0;
        Self {
            tokens: max_tokens,
            last_refill: Instant::now(),
            max_tokens,
            refill_rate,
            consecutive_rate_limits: 0,
            backoff_until: None,
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        self.tokens = (self.tokens + elapsed * self.refill_rate).min(self.max_tokens);
        self.last_refill = now;
    }

    fn try_consume(&mut self, delay_ms: u64) -> ThrottleDecision {
        self.refill();

        // Check if in backoff
        if let Some(until) = self.backoff_until {
            if Instant::now() < until {
                let remaining = until.duration_since(Instant::now()).as_millis() as u64;
                return ThrottleDecision::Deny {
                    reason: "Server in backoff".into(),
                    retry_after_ms: remaining,
                };
            }
            self.backoff_until = None;
            self.consecutive_rate_limits = 0;
        }

        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            if delay_ms > 0 {
                ThrottleDecision::Wait(delay_ms)
            } else {
                ThrottleDecision::Allow
            }
        } else {
            let wait = ((1.0 - self.tokens) / self.refill_rate * 1000.0) as u64;
            ThrottleDecision::Wait(wait.max(delay_ms))
        }
    }

    fn report_rate_limit(&mut self, backoff_threshold: u32) {
        self.consecutive_rate_limits += 1;
        if self.consecutive_rate_limits >= backoff_threshold {
            // Exponential backoff: 2^n seconds, bounded to 300s
            let secs = (2u64.pow(self.consecutive_rate_limits.min(8))).min(300);
            self.backoff_until = Some(Instant::now() + Duration::from_secs(secs));
            self.tokens = 0.0;
        }
    }

    fn report_success(&mut self) {
        self.consecutive_rate_limits = 0;
    }
}

/// Adaptive throttle engine across multiple WHOIS servers.
pub struct ThrottleEngine {
    buckets: Mutex<HashMap<String, BucketState>>,
    default_rpm: u32,
    default_delay_ms: u64,
}

impl ThrottleEngine {
    pub fn new(default_rpm: u32, default_delay_ms: u64) -> Self {
        Self {
            buckets: Mutex::new(HashMap::new()),
            default_rpm,
            default_delay_ms,
        }
    }

    /// Check whether a request to `server` should proceed.
    pub fn check(&self, server: &str, profile: Option<&ServerProfile>) -> ThrottleDecision {
        let mut buckets = self.buckets.lock().unwrap();
        let key = server.to_lowercase();
        let delay = profile.map(|p| p.min_delay_ms).unwrap_or(self.default_delay_ms);

        let bucket = buckets.entry(key).or_insert_with(|| {
            if let Some(p) = profile {
                BucketState::new(p)
            } else {
                BucketState::new(&ServerProfile::new(server, self.default_rpm, self.default_delay_ms))
            }
        });

        bucket.try_consume(delay)
    }

    /// Report that a request to `server` was rate-limited.
    pub fn report_rate_limit(&self, server: &str) {
        let mut buckets = self.buckets.lock().unwrap();
        if let Some(bucket) = buckets.get_mut(&server.to_lowercase()) {
            bucket.report_rate_limit(3);
        }
    }

    /// Report that a request to `server` succeeded.
    pub fn report_success(&self, server: &str) {
        let mut buckets = self.buckets.lock().unwrap();
        if let Some(bucket) = buckets.get_mut(&server.to_lowercase()) {
            bucket.report_success();
        }
    }

    /// Reset all tracked state.
    pub fn reset(&self) {
        self.buckets.lock().unwrap().clear();
    }

    /// Number of servers being tracked.
    pub fn tracked_servers(&self) -> usize {
        self.buckets.lock().unwrap().len()
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_first_request_allowed() {
        let engine = ThrottleEngine::new(60, 0);
        let profile = ServerProfile::new("test.com", 60, 0);
        let decision = engine.check("test.com", Some(&profile));
        assert_eq!(decision, ThrottleDecision::Allow);
    }

    #[test]
    fn test_delay_with_profile() {
        let engine = ThrottleEngine::new(60, 0);
        let profile = ServerProfile::new("slow.com", 60, 2000);
        let decision = engine.check("slow.com", Some(&profile));
        assert_eq!(decision, ThrottleDecision::Wait(2000));
    }

    #[test]
    fn test_default_profile_used() {
        let engine = ThrottleEngine::new(60, 500);
        let decision = engine.check("unknown.server", None);
        assert_eq!(decision, ThrottleDecision::Wait(500));
    }

    #[test]
    fn test_report_rate_limit_backoff() {
        let engine = ThrottleEngine::new(60, 0);
        let profile = ServerProfile::new("strict.com", 60, 0);
        engine.check("strict.com", Some(&profile)); // init bucket
        // Report 3 consecutive rate limits → should trigger backoff
        engine.report_rate_limit("strict.com");
        engine.report_rate_limit("strict.com");
        engine.report_rate_limit("strict.com");

        let decision = engine.check("strict.com", Some(&profile));
        match decision {
            ThrottleDecision::Deny { .. } => {} // expected
            other => panic!("Expected Deny, got {:?}", other),
        }
    }

    #[test]
    fn test_success_resets_rate_limit_count() {
        let engine = ThrottleEngine::new(60, 0);
        let profile = ServerProfile::new("s.com", 60, 0);
        engine.check("s.com", Some(&profile));
        engine.report_rate_limit("s.com");
        engine.report_rate_limit("s.com");
        engine.report_success("s.com");
        // Should still be under threshold
        let decision = engine.check("s.com", Some(&profile));
        assert_ne!(
            matches!(decision, ThrottleDecision::Deny { .. }),
            true
        );
    }

    #[test]
    fn test_reset_clears_state() {
        let engine = ThrottleEngine::new(60, 0);
        engine.check("a.com", None);
        engine.check("b.com", None);
        assert_eq!(engine.tracked_servers(), 2);
        engine.reset();
        assert_eq!(engine.tracked_servers(), 0);
    }

    #[test]
    fn test_case_insensitive() {
        let engine = ThrottleEngine::new(60, 0);
        engine.check("Test.COM", None);
        engine.check("test.com", None);
        assert_eq!(engine.tracked_servers(), 1);
    }
}
