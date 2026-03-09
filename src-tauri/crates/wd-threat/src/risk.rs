use serde::{Deserialize, Serialize};

use crate::indicator::{ThreatIndicator, ThreatLevel};
use crate::pattern::PatternDetector;

/// Risk score for a domain (0–100).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RiskScore {
    /// Overall risk score (0 = safe, 100 = critical).
    pub score: u32,
    /// Risk level derived from score.
    pub level: ThreatLevel,
    /// Individual indicators contributing to the score.
    pub indicators: Vec<ThreatIndicator>,
    /// Short explanation.
    pub summary: String,
}

/// Full risk assessment for a domain.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RiskAssessment {
    pub domain: String,
    pub risk: RiskScore,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub assessed_at: chrono::DateTime<chrono::Utc>,
}

/// Compute risk assessment for a domain.
pub fn assess_domain(
    domain: &str,
    registrar: Option<&str>,
    created_days_ago: Option<i64>,
    blocklist_hits: &[ThreatIndicator],
) -> RiskAssessment {
    let detector = PatternDetector::new();
    let mut indicators = detector.analyse_domain(domain);
    indicators.extend(detector.analyse_whois(registrar, created_days_ago));
    indicators.extend(blocklist_hits.iter().cloned());

    let score = compute_score(&indicators);
    let level = score_to_level(score);
    let summary = build_summary(domain, score, &indicators);

    RiskAssessment {
        domain: domain.to_string(),
        risk: RiskScore {
            score,
            level,
            indicators,
            summary,
        },
        assessed_at: chrono::Utc::now(),
    }
}

fn compute_score(indicators: &[ThreatIndicator]) -> u32 {
    if indicators.is_empty() {
        return 0;
    }

    let total: f64 = indicators
        .iter()
        .map(|i| {
            let base = match i.level {
                ThreatLevel::None => 0.0,
                ThreatLevel::Low => 10.0,
                ThreatLevel::Medium => 25.0,
                ThreatLevel::High => 45.0,
                ThreatLevel::Critical => 70.0,
            };
            base * i.confidence
        })
        .sum();

    (total as u32).min(100)
}

fn score_to_level(score: u32) -> ThreatLevel {
    match score {
        0..=10 => ThreatLevel::None,
        11..=30 => ThreatLevel::Low,
        31..=55 => ThreatLevel::Medium,
        56..=80 => ThreatLevel::High,
        _ => ThreatLevel::Critical,
    }
}

fn build_summary(domain: &str, score: u32, indicators: &[ThreatIndicator]) -> String {
    if indicators.is_empty() {
        return format!("{}: No threats detected (score: 0/100)", domain);
    }
    let top_categories: Vec<String> = indicators
        .iter()
        .take(3)
        .map(|i| format!("{:?}", i.category))
        .collect();
    format!(
        "{}: Risk score {}/100 — {}",
        domain,
        score,
        top_categories.join(", ")
    )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_domain_low_risk() {
        let assessment = assess_domain("example.com", None, Some(365), &[]);
        assert!(assessment.risk.score <= 10);
    }

    #[test]
    fn test_suspicious_domain_higher_risk() {
        let assessment = assess_domain("google-login-secure.tk", None, Some(5), &[]);
        assert!(assessment.risk.score > 20);
    }

    #[test]
    fn test_score_to_level() {
        assert_eq!(score_to_level(0), ThreatLevel::None);
        assert_eq!(score_to_level(15), ThreatLevel::Low);
        assert_eq!(score_to_level(40), ThreatLevel::Medium);
        assert_eq!(score_to_level(60), ThreatLevel::High);
        assert_eq!(score_to_level(90), ThreatLevel::Critical);
    }

    #[test]
    fn test_blocklist_hits_increase_score() {
        use crate::indicator::ThreatCategory;
        let hits = vec![ThreatIndicator::new(
            ThreatCategory::Malware,
            ThreatLevel::Critical,
            "On malware blocklist",
        )];
        let assessment = assess_domain("evil.com", None, None, &hits);
        assert!(assessment.risk.score > 50);
    }

    #[test]
    fn test_summary_includes_domain() {
        let assessment = assess_domain("test.com", None, None, &[]);
        assert!(assessment.risk.summary.contains("test.com"));
    }
}
