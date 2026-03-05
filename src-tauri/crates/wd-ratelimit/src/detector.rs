use serde::{Deserialize, Serialize};

/// Signals that indicate a WHOIS server is rate-limiting.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RateLimitSignal {
    /// Response contains explicit rate limit message.
    ExplicitMessage,
    /// Connection was refused/timed out.
    ConnectionRefused,
    /// Empty or truncated response.
    EmptyResponse,
    /// Response latency is significantly higher than baseline.
    HighLatency,
    /// HTTP 429 (for RDAP).
    Http429,
    /// Captcha / challenge detected.
    CaptchaChallenge,
}

/// Pattern-based rate limit detector.
#[derive(Debug)]
pub struct RateLimitDetector {
    patterns: Vec<String>,
    latency_threshold_ms: u64,
}

impl RateLimitDetector {
    pub fn new() -> Self {
        Self {
            patterns: builtin_patterns(),
            latency_threshold_ms: 10_000,
        }
    }

    pub fn with_latency_threshold(mut self, ms: u64) -> Self {
        self.latency_threshold_ms = ms;
        self
    }

    pub fn add_pattern(&mut self, pattern: impl Into<String>) {
        self.patterns.push(pattern.into().to_lowercase());
    }

    /// Analyse a WHOIS response for rate-limiting signals.
    pub fn detect(&self, response: &str, latency_ms: u64, http_status: Option<u16>) -> Vec<RateLimitSignal> {
        let mut signals = Vec::new();
        let lower = response.to_lowercase();

        // Check for known rate limit text patterns
        if self.patterns.iter().any(|p| lower.contains(p)) {
            signals.push(RateLimitSignal::ExplicitMessage);
        }

        // Empty response
        if response.trim().is_empty() {
            signals.push(RateLimitSignal::EmptyResponse);
        }

        // High latency
        if latency_ms > self.latency_threshold_ms {
            signals.push(RateLimitSignal::HighLatency);
        }

        // HTTP 429
        if http_status == Some(429) {
            signals.push(RateLimitSignal::Http429);
        }

        // Captcha patterns
        if lower.contains("captcha") || lower.contains("challenge") || lower.contains("verify you are human") {
            signals.push(RateLimitSignal::CaptchaChallenge);
        }

        signals
    }

    /// Quick check: is this response rate-limited?
    pub fn is_rate_limited(&self, response: &str, latency_ms: u64, http_status: Option<u16>) -> bool {
        !self.detect(response, latency_ms, http_status).is_empty()
    }
}

impl Default for RateLimitDetector {
    fn default() -> Self { Self::new() }
}

/// Built-in patterns that indicate rate limiting in WHOIS responses.
fn builtin_patterns() -> Vec<String> {
    vec![
        "rate limit".into(),
        "too many queries".into(),
        "query rate exceeded".into(),
        "please try again later".into(),
        "quota exceeded".into(),
        "connection limit".into(),
        "too many connections".into(),
        "exceeded maximum".into(),
        "temporarily blocked".into(),
        "request limit".into(),
        "try again in".into(),
        "access denied".into(),
        "your access has been restricted".into(),
        "whois limit".into(),
        "lookup limit".into(),
    ]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_explicit_message() {
        let d = RateLimitDetector::new();
        let signals = d.detect("Error: rate limit exceeded for 1.2.3.4", 100, None);
        assert!(signals.contains(&RateLimitSignal::ExplicitMessage));
    }

    #[test]
    fn test_detect_empty_response() {
        let d = RateLimitDetector::new();
        let signals = d.detect("", 100, None);
        assert!(signals.contains(&RateLimitSignal::EmptyResponse));
    }

    #[test]
    fn test_detect_high_latency() {
        let d = RateLimitDetector::new().with_latency_threshold(5000);
        let signals = d.detect("normal response", 6000, None);
        assert!(signals.contains(&RateLimitSignal::HighLatency));
    }

    #[test]
    fn test_detect_http_429() {
        let d = RateLimitDetector::new();
        let signals = d.detect("", 100, Some(429));
        assert!(signals.contains(&RateLimitSignal::Http429));
    }

    #[test]
    fn test_detect_captcha() {
        let d = RateLimitDetector::new();
        let signals = d.detect("Please complete the captcha to continue", 100, None);
        assert!(signals.contains(&RateLimitSignal::CaptchaChallenge));
    }

    #[test]
    fn test_no_false_positive() {
        let d = RateLimitDetector::new();
        let signals = d.detect("Domain Name: example.com\nRegistrar: Example Inc", 200, Some(200));
        assert!(signals.is_empty());
    }

    #[test]
    fn test_is_rate_limited_shortcut() {
        let d = RateLimitDetector::new();
        assert!(d.is_rate_limited("Too many queries from your IP", 100, None));
        assert!(!d.is_rate_limited("Normal WHOIS response", 100, None));
    }

    #[test]
    fn test_custom_pattern() {
        let mut d = RateLimitDetector::new();
        d.add_pattern("custom_block_message");
        assert!(d.is_rate_limited("Error: CUSTOM_BLOCK_MESSAGE detected", 100, None));
    }
}
