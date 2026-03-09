use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// The protocol source of a lookup.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum LookupSource {
    Whois,
    Rdap,
    Dns,
    ReverseWhois,
    Custom(String),
}

impl std::fmt::Display for LookupSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LookupSource::Whois => write!(f, "WHOIS"),
            LookupSource::Rdap => write!(f, "RDAP"),
            LookupSource::Dns => write!(f, "DNS"),
            LookupSource::ReverseWhois => write!(f, "ReverseWHOIS"),
            LookupSource::Custom(s) => write!(f, "{}", s),
        }
    }
}

/// A single record from one source.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SourceRecord {
    pub source: LookupSource,
    pub domain: String,
    pub raw: String,
    pub fields: HashMap<String, String>,
    pub success: bool,
    pub error: Option<String>,
    pub latency_ms: u64,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl SourceRecord {
    /// Create a successful source record.
    pub fn ok(
        source: LookupSource,
        domain: impl Into<String>,
        raw: impl Into<String>,
        fields: HashMap<String, String>,
        latency_ms: u64,
    ) -> Self {
        Self {
            source,
            domain: domain.into(),
            raw: raw.into(),
            fields,
            success: true,
            error: None,
            latency_ms,
            timestamp: chrono::Utc::now(),
        }
    }

    /// Create an error source record.
    pub fn err(
        source: LookupSource,
        domain: impl Into<String>,
        error: impl Into<String>,
        latency_ms: u64,
    ) -> Self {
        Self {
            source,
            domain: domain.into(),
            raw: String::new(),
            fields: HashMap::new(),
            success: false,
            error: Some(error.into()),
            latency_ms,
            timestamp: chrono::Utc::now(),
        }
    }
}

/// Fused record combining multiple source records into one unified view.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FusedRecord {
    pub domain: String,
    /// Merged fields with source attribution.
    pub fields: HashMap<String, FusedField>,
    /// All individual source records.
    pub sources: Vec<SourceRecord>,
    /// Overall confidence (0.0–1.0).
    pub overall_confidence: f64,
    /// Number of successful sources.
    pub source_count: usize,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub fused_at: chrono::DateTime<chrono::Utc>,
}

/// A single field value with provenance tracking.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FusedField {
    /// The resolved value.
    pub value: String,
    /// Which source(s) provided this value.
    pub provided_by: Vec<LookupSource>,
    /// Confidence for this specific field (0.0–1.0).
    pub confidence: f64,
    /// Whether multiple sources agreed on this value.
    pub consensus: bool,
}

impl FusedRecord {
    /// Get the resolved value for a field.
    pub fn get(&self, key: &str) -> Option<&str> {
        self.fields.get(key).map(|f| f.value.as_str())
    }

    /// Fields where sources disagreed.
    pub fn conflicts(&self) -> Vec<(&str, &FusedField)> {
        self.fields
            .iter()
            .filter(|(_, f)| !f.consensus && f.provided_by.len() > 1)
            .map(|(k, f)| (k.as_str(), f))
            .collect()
    }

    /// Fields with high confidence (>= threshold).
    pub fn high_confidence_fields(&self, threshold: f64) -> Vec<(&str, &FusedField)> {
        self.fields
            .iter()
            .filter(|(_, f)| f.confidence >= threshold)
            .map(|(k, f)| (k.as_str(), f))
            .collect()
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_source_record(source: LookupSource) -> SourceRecord {
        let mut fields = HashMap::new();
        fields.insert("registrar".into(), "Example Inc".into());
        SourceRecord::ok(source, "example.com", "raw data", fields, 100)
    }

    #[test]
    fn test_source_record_creation() {
        let rec = sample_source_record(LookupSource::Whois);
        assert!(rec.success);
        assert_eq!(rec.domain, "example.com");
    }

    #[test]
    fn test_error_record() {
        let rec = SourceRecord::err(LookupSource::Rdap, "fail.com", "timeout", 5000);
        assert!(!rec.success);
        assert_eq!(rec.error.as_deref(), Some("timeout"));
    }

    #[test]
    fn test_fused_record_get() {
        let mut fields = HashMap::new();
        fields.insert(
            "registrar".into(),
            FusedField {
                value: "Example Inc".into(),
                provided_by: vec![LookupSource::Whois, LookupSource::Rdap],
                confidence: 1.0,
                consensus: true,
            },
        );
        let fused = FusedRecord {
            domain: "example.com".into(),
            fields,
            sources: vec![],
            overall_confidence: 0.9,
            source_count: 2,
            fused_at: chrono::Utc::now(),
        };
        assert_eq!(fused.get("registrar"), Some("Example Inc"));
        assert_eq!(fused.get("missing"), None);
    }

    #[test]
    fn test_conflicts() {
        let mut fields = HashMap::new();
        fields.insert(
            "registrar".into(),
            FusedField {
                value: "A".into(),
                provided_by: vec![LookupSource::Whois, LookupSource::Rdap],
                confidence: 0.5,
                consensus: false,
            },
        );
        fields.insert(
            "nameserver".into(),
            FusedField {
                value: "ns1.example.com".into(),
                provided_by: vec![LookupSource::Dns],
                confidence: 1.0,
                consensus: true,
            },
        );
        let fused = FusedRecord {
            domain: "example.com".into(),
            fields,
            sources: vec![],
            overall_confidence: 0.75,
            source_count: 2,
            fused_at: chrono::Utc::now(),
        };
        let conflicts = fused.conflicts();
        assert_eq!(conflicts.len(), 1);
        assert_eq!(conflicts[0].0, "registrar");
    }

    #[test]
    fn test_high_confidence_fields() {
        let mut fields = HashMap::new();
        fields.insert(
            "a".into(),
            FusedField {
                value: "v".into(),
                provided_by: vec![],
                confidence: 0.9,
                consensus: true,
            },
        );
        fields.insert(
            "b".into(),
            FusedField {
                value: "v".into(),
                provided_by: vec![],
                confidence: 0.3,
                consensus: true,
            },
        );
        let fused = FusedRecord {
            domain: "t.com".into(),
            fields,
            sources: vec![],
            overall_confidence: 0.6,
            source_count: 1,
            fused_at: chrono::Utc::now(),
        };
        assert_eq!(fused.high_confidence_fields(0.8).len(), 1);
    }

    #[test]
    fn test_lookup_source_display() {
        assert_eq!(format!("{}", LookupSource::Whois), "WHOIS");
        assert_eq!(format!("{}", LookupSource::Custom("CT".into())), "CT");
    }
}
