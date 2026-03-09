use serde::{Deserialize, Serialize};

/// Backoff strategy.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BackoffStrategy {
    /// Fixed delay.
    Fixed,
    /// Exponential: delay * 2^attempt.
    Exponential,
    /// Exponential with random jitter added.
    ExponentialJitter,
    /// Linear: delay * attempt.
    Linear,
}

/// Configuration for backoff behaviour.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BackoffConfig {
    pub strategy: BackoffStrategy,
    /// Base delay in milliseconds.
    pub base_delay_ms: u64,
    /// Maximum delay cap in milliseconds.
    pub max_delay_ms: u64,
    /// Maximum number of retries before giving up.
    pub max_retries: u32,
    /// Jitter factor (0.0 – 1.0) for ExponentialJitter.
    pub jitter_factor: f64,
}

impl Default for BackoffConfig {
    fn default() -> Self {
        Self {
            strategy: BackoffStrategy::ExponentialJitter,
            base_delay_ms: 1000,
            max_delay_ms: 60_000,
            max_retries: 10,
            jitter_factor: 0.3,
        }
    }
}

impl BackoffConfig {
    /// Compute the delay for a given attempt (0-indexed).
    pub fn delay_for_attempt(&self, attempt: u32) -> u64 {
        if attempt >= self.max_retries {
            return self.max_delay_ms;
        }

        let delay = match self.strategy {
            BackoffStrategy::Fixed => self.base_delay_ms,
            BackoffStrategy::Linear => self.base_delay_ms * (attempt as u64 + 1),
            BackoffStrategy::Exponential => self.base_delay_ms * 2u64.pow(attempt.min(20)),
            BackoffStrategy::ExponentialJitter => {
                let base = self.base_delay_ms * 2u64.pow(attempt.min(20));
                let jitter = (base as f64 * self.jitter_factor * pseudo_random(attempt)) as u64;
                base + jitter
            }
        };

        delay.min(self.max_delay_ms)
    }

    /// Check if we should still retry.
    pub fn should_retry(&self, attempt: u32) -> bool {
        attempt < self.max_retries
    }
}

/// Simple deterministic pseudo-random for jitter (no external deps needed).
fn pseudo_random(seed: u32) -> f64 {
    let x = seed.wrapping_mul(2654435761);
    (x % 1000) as f64 / 1000.0
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fixed_backoff() {
        let config = BackoffConfig {
            strategy: BackoffStrategy::Fixed,
            base_delay_ms: 500,
            max_delay_ms: 60_000,
            max_retries: 5,
            jitter_factor: 0.0,
        };
        assert_eq!(config.delay_for_attempt(0), 500);
        assert_eq!(config.delay_for_attempt(3), 500);
    }

    #[test]
    fn test_linear_backoff() {
        let config = BackoffConfig {
            strategy: BackoffStrategy::Linear,
            base_delay_ms: 1000,
            max_delay_ms: 60_000,
            max_retries: 10,
            jitter_factor: 0.0,
        };
        assert_eq!(config.delay_for_attempt(0), 1000);
        assert_eq!(config.delay_for_attempt(2), 3000);
    }

    #[test]
    fn test_exponential_backoff() {
        let config = BackoffConfig {
            strategy: BackoffStrategy::Exponential,
            base_delay_ms: 1000,
            max_delay_ms: 60_000,
            max_retries: 10,
            jitter_factor: 0.0,
        };
        assert_eq!(config.delay_for_attempt(0), 1000);
        assert_eq!(config.delay_for_attempt(1), 2000);
        assert_eq!(config.delay_for_attempt(2), 4000);
        assert_eq!(config.delay_for_attempt(3), 8000);
    }

    #[test]
    fn test_max_delay_cap() {
        let config = BackoffConfig {
            strategy: BackoffStrategy::Exponential,
            base_delay_ms: 1000,
            max_delay_ms: 5000,
            max_retries: 20,
            jitter_factor: 0.0,
        };
        assert_eq!(config.delay_for_attempt(10), 5000);
    }

    #[test]
    fn test_should_retry() {
        let config = BackoffConfig {
            max_retries: 3,
            ..Default::default()
        };
        assert!(config.should_retry(0));
        assert!(config.should_retry(2));
        assert!(!config.should_retry(3));
    }

    #[test]
    fn test_exponential_jitter_varies() {
        let config = BackoffConfig::default();
        let d0 = config.delay_for_attempt(0);
        let d1 = config.delay_for_attempt(1);
        // Should differ due to jitter
        assert!(d1 > d0);
    }

    #[test]
    fn test_max_retries_returns_max_delay() {
        let config = BackoffConfig {
            max_retries: 5,
            max_delay_ms: 30_000,
            ..Default::default()
        };
        assert_eq!(config.delay_for_attempt(5), 30_000);
    }
}
