//! # wd-threat
//!
//! Domain threat intelligence overlay. Detects suspicious patterns in domain
//! names and WHOIS data, cross-references known blocklists, calculates risk
//! scores, and flags potential phishing/malware indicators.

pub mod blocklist;
pub mod indicator;
pub mod pattern;
pub mod risk;

pub use blocklist::{Blocklist, BlocklistEntry, BlocklistMatch};
pub use indicator::{ThreatCategory, ThreatIndicator, ThreatLevel};
pub use pattern::{PatternDetector, SuspiciousPattern};
pub use risk::{assess_domain, RiskAssessment, RiskScore};
