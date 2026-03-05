//! # wd-threat
//!
//! Domain threat intelligence overlay. Detects suspicious patterns in domain
//! names and WHOIS data, cross-references known blocklists, calculates risk
//! scores, and flags potential phishing/malware indicators.

pub mod indicator;
pub mod pattern;
pub mod risk;
pub mod blocklist;

pub use indicator::{ThreatIndicator, ThreatCategory, ThreatLevel};
pub use pattern::{PatternDetector, SuspiciousPattern};
pub use risk::{RiskScore, RiskAssessment, assess_domain};
pub use blocklist::{Blocklist, BlocklistEntry, BlocklistMatch};
