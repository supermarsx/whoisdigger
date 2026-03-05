use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::record::{LookupSource, SourceRecord};

/// Confidence score for a fused result.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ConfidenceScore {
    pub overall: f64,
    pub field_scores: HashMap<String, FieldConfidence>,
}

/// Confidence detail for a single field.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FieldConfidence {
    /// How many sources provided this field.
    pub source_count: usize,
    /// Did they all agree?
    pub unanimous: bool,
    /// Computed confidence (0.0–1.0).
    pub score: f64,
}

/// Weight assigned to each lookup source for confidence calculation.
fn source_weight(source: &LookupSource) -> f64 {
    match source {
        LookupSource::Rdap => 1.0,    // structured data, highest reliability
        LookupSource::Whois => 0.8,   // text-based, well-established
        LookupSource::Dns => 0.7,     // authoritative for DNS records
        LookupSource::ReverseWhois => 0.5,
        LookupSource::Custom(_) => 0.4,
    }
}

/// Compute confidence scores from a set of source records for a domain.
pub fn compute_confidence(sources: &[SourceRecord]) -> ConfidenceScore {
    let successful: Vec<_> = sources.iter().filter(|s| s.success).collect();

    if successful.is_empty() {
        return ConfidenceScore { overall: 0.0, field_scores: HashMap::new() };
    }

    // Collect all field keys
    let mut all_keys: Vec<String> = successful.iter()
        .flat_map(|s| s.fields.keys().cloned())
        .collect();
    all_keys.sort();
    all_keys.dedup();

    let mut field_scores = HashMap::new();
    let mut total_field_confidence = 0.0;

    for key in &all_keys {
        // Gather values from each source
        let mut values: HashMap<String, Vec<&LookupSource>> = HashMap::new();
        for src in &successful {
            if let Some(val) = src.fields.get(key) {
                values.entry(val.to_lowercase()).or_default().push(&src.source);
            }
        }

        let source_count = values.values().map(|v| v.len()).sum::<usize>();
        let unanimous = values.len() <= 1;

        // Score based on agreement and source weights
        let total_weight: f64 = if values.is_empty() {
            0.0
        } else {
            // Find the majority value
            let max_group = values.values().max_by_key(|v| v.len()).unwrap();
            let agreement_ratio = max_group.len() as f64 / source_count.max(1) as f64;
            let avg_weight: f64 = max_group.iter().map(|s| source_weight(s)).sum::<f64>() / max_group.len() as f64;
            agreement_ratio * avg_weight
        };

        let score = total_weight.min(1.0);
        total_field_confidence += score;

        field_scores.insert(key.clone(), FieldConfidence {
            source_count,
            unanimous,
            score,
        });
    }

    let overall = if all_keys.is_empty() {
        0.0
    } else {
        // Overall combines field consensus + source diversity
        let field_avg = total_field_confidence / all_keys.len() as f64;
        let source_bonus = (successful.len() as f64 / 3.0).min(1.0) * 0.2;
        (field_avg + source_bonus).min(1.0)
    };

    ConfidenceScore { overall, field_scores }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_record(source: LookupSource, fields: Vec<(&str, &str)>) -> SourceRecord {
        let map = fields.into_iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
        SourceRecord::ok(source, "example.com", "raw", map, 100)
    }

    #[test]
    fn test_single_source_confidence() {
        let records = vec![
            make_record(LookupSource::Whois, vec![("registrar", "Example Inc")]),
        ];
        let score = compute_confidence(&records);
        assert!(score.overall > 0.0);
        assert!(score.field_scores.get("registrar").unwrap().score > 0.0);
    }

    #[test]
    fn test_multiple_sources_agreement() {
        let records = vec![
            make_record(LookupSource::Whois, vec![("registrar", "Example Inc")]),
            make_record(LookupSource::Rdap, vec![("registrar", "Example Inc")]),
        ];
        let score = compute_confidence(&records);
        let reg = score.field_scores.get("registrar").unwrap();
        assert!(reg.unanimous);
        assert!(reg.score > 0.5);
    }

    #[test]
    fn test_disagreement_lowers_confidence() {
        let records = vec![
            make_record(LookupSource::Whois, vec![("registrar", "A")]),
            make_record(LookupSource::Rdap, vec![("registrar", "B")]),
        ];
        let score = compute_confidence(&records);
        let reg = score.field_scores.get("registrar").unwrap();
        assert!(!reg.unanimous);
    }

    #[test]
    fn test_empty_sources() {
        let score = compute_confidence(&[]);
        assert_eq!(score.overall, 0.0);
    }

    #[test]
    fn test_failed_sources_excluded() {
        let records = vec![
            SourceRecord::err(LookupSource::Whois, "fail.com", "timeout", 5000),
        ];
        let score = compute_confidence(&records);
        assert_eq!(score.overall, 0.0);
    }

    #[test]
    fn test_source_weights() {
        assert!(source_weight(&LookupSource::Rdap) > source_weight(&LookupSource::Whois));
        assert!(source_weight(&LookupSource::Whois) > source_weight(&LookupSource::Dns));
    }
}
