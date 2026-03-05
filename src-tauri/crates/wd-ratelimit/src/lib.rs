//! # wd-ratelimit
//!
//! Smart WHOIS/RDAP rate limiting with per-server profiles,
//! adaptive throttling, and backoff strategies.
//!
//! ## Modules
//!
//! - **profile** – per-server rate limit profiles
//! - **throttle** – adaptive throttle engine with token bucket
//! - **backoff** – exponential backoff and jitter strategies
//! - **detector** – automatic rate-limit detection from response patterns

pub mod backoff;
pub mod detector;
pub mod profile;
pub mod throttle;

pub use backoff::{BackoffConfig, BackoffStrategy};
pub use detector::{RateLimitDetector, RateLimitSignal};
pub use profile::{ServerProfile, ServerRegistry};
pub use throttle::{ThrottleDecision, ThrottleEngine};
