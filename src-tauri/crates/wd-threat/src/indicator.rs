use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Threat severity level.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum ThreatLevel {
    None,
    Low,
    Medium,
    High,
    Critical,
}

/// Category of threat.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ThreatCategory {
    Phishing,
    Malware,
    Spam,
    BotnetC2,
    DomainSquatting,
    Typosquat,
    Homoglyph,
    BrandImpersonation,
    DgaDomain,
    SuspiciousRegistrar,
    PrivacyProxy,
    BulkRegistration,
    FastFlux,
    RecentlyRegistered,
    ExpiringSoon,
    BlocklistMatch,
    Custom(String),
}

/// A single threat indicator for a domain.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ThreatIndicator {
    pub category: ThreatCategory,
    pub level: ThreatLevel,
    pub description: String,
    /// Evidence or context.
    pub evidence: Option<String>,
    /// Confidence (0.0–1.0) for this indicator.
    pub confidence: f64,
    /// When this indicator was detected.
    #[serde(with = "chrono::serde::ts_seconds")]
    pub detected_at: DateTime<Utc>,
}

impl ThreatIndicator {
    pub fn new(
        category: ThreatCategory,
        level: ThreatLevel,
        description: impl Into<String>,
    ) -> Self {
        Self {
            category,
            level,
            description: description.into(),
            evidence: None,
            confidence: 0.8,
            detected_at: Utc::now(),
        }
    }

    pub fn with_evidence(mut self, evidence: impl Into<String>) -> Self {
        self.evidence = Some(evidence.into());
        self
    }

    pub fn with_confidence(mut self, confidence: f64) -> Self {
        self.confidence = confidence.clamp(0.0, 1.0);
        self
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_threat_level_ordering() {
        assert!(ThreatLevel::Critical > ThreatLevel::High);
        assert!(ThreatLevel::High > ThreatLevel::Medium);
        assert!(ThreatLevel::Low > ThreatLevel::None);
    }

    #[test]
    fn test_indicator_creation() {
        let ind = ThreatIndicator::new(
            ThreatCategory::Phishing,
            ThreatLevel::High,
            "Looks like a phishing domain",
        );
        assert_eq!(ind.level, ThreatLevel::High);
        assert_eq!(ind.confidence, 0.8);
    }

    #[test]
    fn test_with_evidence() {
        let ind = ThreatIndicator::new(ThreatCategory::Typosquat, ThreatLevel::Medium, "desc")
            .with_evidence("Similar to 'google.com'");
        assert_eq!(ind.evidence.as_deref(), Some("Similar to 'google.com'"));
    }

    #[test]
    fn test_confidence_clamping() {
        let ind =
            ThreatIndicator::new(ThreatCategory::Spam, ThreatLevel::Low, "x").with_confidence(1.5);
        assert_eq!(ind.confidence, 1.0);
    }
}
