use std::collections::HashMap;

use crate::confidence::{compute_confidence, FieldConfidence};
use crate::record::{FusedField, FusedRecord, LookupSource, SourceRecord};
use serde::{Deserialize, Serialize};

/// How to pick the winning value when sources disagree.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MergeStrategy {
    /// Prefer the value from the highest-weighted source.
    HighestWeight,
    /// Prefer the value chosen by the majority of sources.
    Majority,
    /// Prefer the most recent record.
    MostRecent,
    /// Use a fixed source priority order.
    Priority(Vec<LookupSource>),
}

impl Default for MergeStrategy {
    fn default() -> Self {
        MergeStrategy::HighestWeight
    }
}

/// Merge multiple source records into a single fused record.
pub fn merge_records(
    domain: &str,
    sources: Vec<SourceRecord>,
    strategy: &MergeStrategy,
) -> FusedRecord {
    let confidence = compute_confidence(&sources);
    let successful: Vec<&SourceRecord> = sources.iter().filter(|s| s.success).collect();

    // Collect all field keys
    let mut all_keys: Vec<String> = successful
        .iter()
        .flat_map(|s| s.fields.keys().cloned())
        .collect();
    all_keys.sort();
    all_keys.dedup();

    let mut fields = HashMap::new();

    for key in &all_keys {
        // Gather (value, source, timestamp) tuples
        let mut entries: Vec<(&str, &LookupSource, &chrono::DateTime<chrono::Utc>)> = vec![];
        for src in &successful {
            if let Some(val) = src.fields.get(key) {
                entries.push((val.as_str(), &src.source, &src.timestamp));
            }
        }

        if entries.is_empty() {
            continue;
        }

        let chosen_value = pick_value(&entries, strategy);
        let providers: Vec<LookupSource> = entries.iter().map(|(_, s, _)| (*s).clone()).collect();

        // Check consensus
        let unique_values: std::collections::HashSet<String> =
            entries.iter().map(|(v, _, _)| v.to_lowercase()).collect();
        let consensus = unique_values.len() <= 1;

        let field_conf = confidence
            .field_scores
            .get(key)
            .cloned()
            .unwrap_or(FieldConfidence {
                source_count: 0,
                unanimous: false,
                score: 0.0,
            });

        fields.insert(
            key.clone(),
            FusedField {
                value: chosen_value.to_string(),
                provided_by: providers,
                confidence: field_conf.score,
                consensus,
            },
        );
    }

    FusedRecord {
        domain: domain.to_string(),
        fields,
        source_count: successful.len(),
        overall_confidence: confidence.overall,
        sources,
        fused_at: chrono::Utc::now(),
    }
}

fn pick_value<'a>(
    entries: &[(&'a str, &LookupSource, &chrono::DateTime<chrono::Utc>)],
    strategy: &MergeStrategy,
) -> &'a str {
    match strategy {
        MergeStrategy::HighestWeight => entries
            .iter()
            .max_by(|a, b| {
                source_weight_f(a.1)
                    .partial_cmp(&source_weight_f(b.1))
                    .unwrap()
            })
            .map(|(v, _, _)| *v)
            .unwrap_or(""),
        MergeStrategy::Majority => {
            let mut counts: HashMap<&str, usize> = HashMap::new();
            for (val, _, _) in entries {
                *counts.entry(*val).or_default() += 1;
            }
            counts
                .into_iter()
                .max_by_key(|(_, c)| *c)
                .map(|(v, _)| v)
                .unwrap_or("")
        }
        MergeStrategy::MostRecent => entries
            .iter()
            .max_by_key(|(_, _, ts)| *ts)
            .map(|(v, _, _)| *v)
            .unwrap_or(""),
        MergeStrategy::Priority(order) => {
            for src in order {
                if let Some(entry) = entries.iter().find(|(_, s, _)| *s == src) {
                    return entry.0;
                }
            }
            entries.first().map(|(v, _, _)| *v).unwrap_or("")
        }
    }
}

fn source_weight_f(source: &LookupSource) -> f64 {
    match source {
        LookupSource::Rdap => 1.0,
        LookupSource::Whois => 0.8,
        LookupSource::Dns => 0.7,
        LookupSource::ReverseWhois => 0.5,
        LookupSource::Custom(_) => 0.4,
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn rec(source: LookupSource, fields: Vec<(&str, &str)>) -> SourceRecord {
        let map = fields
            .into_iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        SourceRecord::ok(source, "example.com", "raw", map, 100)
    }

    #[test]
    fn test_merge_single_source() {
        let sources = vec![rec(LookupSource::Whois, vec![("registrar", "A")])];
        let fused = merge_records("example.com", sources, &MergeStrategy::HighestWeight);
        assert_eq!(fused.get("registrar"), Some("A"));
        assert_eq!(fused.source_count, 1);
    }

    #[test]
    fn test_merge_highest_weight() {
        let sources = vec![
            rec(LookupSource::Whois, vec![("registrar", "A")]),
            rec(LookupSource::Rdap, vec![("registrar", "B")]),
        ];
        let fused = merge_records("example.com", sources, &MergeStrategy::HighestWeight);
        // RDAP has higher weight → "B"
        assert_eq!(fused.get("registrar"), Some("B"));
    }

    #[test]
    fn test_merge_majority() {
        let sources = vec![
            rec(LookupSource::Whois, vec![("registrar", "A")]),
            rec(LookupSource::Rdap, vec![("registrar", "A")]),
            rec(LookupSource::Dns, vec![("registrar", "B")]),
        ];
        let fused = merge_records("example.com", sources, &MergeStrategy::Majority);
        assert_eq!(fused.get("registrar"), Some("A"));
    }

    #[test]
    fn test_merge_priority() {
        let strat = MergeStrategy::Priority(vec![LookupSource::Dns, LookupSource::Whois]);
        let sources = vec![
            rec(LookupSource::Whois, vec![("ns", "whois-ns")]),
            rec(LookupSource::Dns, vec![("ns", "dns-ns")]),
        ];
        let fused = merge_records("example.com", sources, &strat);
        assert_eq!(fused.get("ns"), Some("dns-ns"));
    }

    #[test]
    fn test_consensus_detection() {
        let sources = vec![
            rec(LookupSource::Whois, vec![("registrar", "Same")]),
            rec(LookupSource::Rdap, vec![("registrar", "Same")]),
        ];
        let fused = merge_records("example.com", sources, &MergeStrategy::HighestWeight);
        assert!(fused.fields.get("registrar").unwrap().consensus);
    }

    #[test]
    fn test_no_consensus() {
        let sources = vec![
            rec(LookupSource::Whois, vec![("registrar", "A")]),
            rec(LookupSource::Rdap, vec![("registrar", "B")]),
        ];
        let fused = merge_records("example.com", sources, &MergeStrategy::HighestWeight);
        assert!(!fused.fields.get("registrar").unwrap().consensus);
    }

    #[test]
    fn test_merge_disjoint_fields() {
        let sources = vec![
            rec(LookupSource::Whois, vec![("registrar", "A")]),
            rec(LookupSource::Dns, vec![("nameserver", "ns1.example.com")]),
        ];
        let fused = merge_records("example.com", sources, &MergeStrategy::HighestWeight);
        assert_eq!(fused.get("registrar"), Some("A"));
        assert_eq!(fused.get("nameserver"), Some("ns1.example.com"));
        assert!(fused.fields.get("registrar").unwrap().consensus);
    }

    #[test]
    fn test_failed_sources_excluded() {
        let sources = vec![
            rec(LookupSource::Whois, vec![("registrar", "A")]),
            SourceRecord::err(LookupSource::Rdap, "example.com", "timeout", 5000),
        ];
        let fused = merge_records("example.com", sources, &MergeStrategy::HighestWeight);
        assert_eq!(fused.source_count, 1);
        assert_eq!(fused.sources.len(), 2); // all kept for provenance
    }
}
