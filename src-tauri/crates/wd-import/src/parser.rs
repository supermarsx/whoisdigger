use std::collections::HashSet;

use crate::format::ImportFormat;
use crate::stats::ImportStats;

/// Result of parsing an import.
#[derive(Debug, Clone)]
pub struct ImportResult {
    pub domains: Vec<String>,
    pub stats: ImportStats,
}

/// Parse raw content into a list of domain names.
pub fn parse_import(content: &str, format: &ImportFormat) -> ImportResult {
    let format = match format {
        ImportFormat::Auto => ImportFormat::detect(content),
        other => other.clone(),
    };

    let raw_domains = match &format {
        ImportFormat::NewlineDelimited => parse_newline(content),
        ImportFormat::Csv { domain_column } => parse_csv(content, *domain_column),
        ImportFormat::JsonArray => parse_json_array(content),
        ImportFormat::JsonObjects { domain_key } => parse_json_objects(content, domain_key),
        ImportFormat::ZoneFile => parse_zone_file(content),
        ImportFormat::CtLog => parse_ct_log(content),
        ImportFormat::SpaceSeparated => parse_space_separated(content),
        ImportFormat::CommaSeparated => parse_comma_separated(content),
        ImportFormat::Auto => parse_newline(content), // fallback
    };

    let total_parsed = raw_domains.len();

    // Normalise: lowercase, trim, remove trailing dots
    let normalised: Vec<String> = raw_domains
        .into_iter()
        .map(|d| d.trim().to_lowercase().trim_end_matches('.').to_string())
        .filter(|d| !d.is_empty())
        .collect();

    // Deduplicate preserving order
    let mut seen = HashSet::new();
    let deduped: Vec<String> = normalised
        .into_iter()
        .filter(|d| seen.insert(d.clone()))
        .collect();

    let duplicates_removed = total_parsed - deduped.len();

    let stats = ImportStats {
        total_lines: content.lines().count(),
        total_parsed,
        valid: deduped.len(),
        duplicates_removed,
        invalid_removed: 0, // validation happens later in validate module
    };

    ImportResult {
        domains: deduped,
        stats,
    }
}

fn parse_newline(content: &str) -> Vec<String> {
    content
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty() && !l.starts_with('#'))
        .collect()
}

fn parse_csv(content: &str, domain_column: usize) -> Vec<String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .from_reader(content.as_bytes());

    let mut domains = vec![];
    for result in reader.records() {
        if let Ok(record) = result {
            if let Some(val) = record.get(domain_column) {
                let trimmed = val.trim().to_string();
                if !trimmed.is_empty() {
                    domains.push(trimmed);
                }
            }
        }
    }
    domains
}

fn parse_json_array(content: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(content.trim()).unwrap_or_default()
}

fn parse_json_objects(content: &str, domain_key: &str) -> Vec<String> {
    let arr: Vec<serde_json::Value> = serde_json::from_str(content.trim()).unwrap_or_default();
    arr.into_iter()
        .filter_map(|v| v.get(domain_key)?.as_str().map(|s| s.to_string()))
        .collect()
}

fn parse_zone_file(content: &str) -> Vec<String> {
    // Extract domain names from zone file records
    // Format: name TTL class type rdata
    let mut domains = vec![];
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with(';') || line.starts_with('$') {
            continue;
        }
        // Take the first field as the domain name
        if let Some(first) = line.split_whitespace().next() {
            let domain = first.trim_end_matches('.');
            if domain.contains('.') || !domain.contains('@') {
                domains.push(domain.to_string());
            }
        }
    }
    domains
}

fn parse_ct_log(content: &str) -> Vec<String> {
    // CT logs often return JSON with dns_names / common_name fields
    if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(content.trim()) {
        let mut domains = vec![];
        for entry in arr {
            // Try dns_names array first
            if let Some(names) = entry.get("dns_names").and_then(|v| v.as_array()) {
                for name in names {
                    if let Some(s) = name.as_str() {
                        // Skip wildcards
                        let clean = s.trim_start_matches("*.");
                        domains.push(clean.to_string());
                    }
                }
            }
            // Fallback to common_name
            if let Some(cn) = entry.get("common_name").and_then(|v| v.as_str()) {
                let clean = cn.trim_start_matches("*.");
                domains.push(clean.to_string());
            }
        }
        domains
    } else {
        // Newline-delimited CT log entries
        parse_newline(content)
    }
}

fn parse_space_separated(content: &str) -> Vec<String> {
    content
        .split_whitespace()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

fn parse_comma_separated(content: &str) -> Vec<String> {
    content
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_newline() {
        let r = parse_import(
            "example.com\nexample.org\n\n# comment\nexample.net",
            &ImportFormat::NewlineDelimited,
        );
        assert_eq!(r.domains, vec!["example.com", "example.org", "example.net"]);
    }

    #[test]
    fn test_parse_csv() {
        let csv = "domain,status\nexample.com,active\nexample.org,expired";
        let r = parse_import(csv, &ImportFormat::Csv { domain_column: 0 });
        assert_eq!(r.domains, vec!["example.com", "example.org"]);
    }

    #[test]
    fn test_parse_json_array() {
        let json = r#"["example.com", "example.org"]"#;
        let r = parse_import(json, &ImportFormat::JsonArray);
        assert_eq!(r.domains, vec!["example.com", "example.org"]);
    }

    #[test]
    fn test_parse_json_objects() {
        let json = r#"[{"domain": "example.com"}, {"domain": "test.org"}]"#;
        let r = parse_import(
            json,
            &ImportFormat::JsonObjects {
                domain_key: "domain".into(),
            },
        );
        assert_eq!(r.domains, vec!["example.com", "test.org"]);
    }

    #[test]
    fn test_deduplication() {
        let r = parse_import(
            "example.com\nExample.COM\nexample.com",
            &ImportFormat::NewlineDelimited,
        );
        assert_eq!(r.domains.len(), 1);
        assert_eq!(r.stats.duplicates_removed, 2);
    }

    #[test]
    fn test_trailing_dot_removal() {
        let r = parse_import(
            "example.com.\nexample.org.",
            &ImportFormat::NewlineDelimited,
        );
        assert_eq!(r.domains, vec!["example.com", "example.org"]);
    }

    #[test]
    fn test_parse_comma_separated() {
        let r = parse_import("a.com, b.com, c.com", &ImportFormat::CommaSeparated);
        assert_eq!(r.domains, vec!["a.com", "b.com", "c.com"]);
    }

    #[test]
    fn test_parse_space_separated() {
        let r = parse_import("a.com b.com\tc.com", &ImportFormat::SpaceSeparated);
        assert_eq!(r.domains, vec!["a.com", "b.com", "c.com"]);
    }

    #[test]
    fn test_parse_zone_file() {
        let zone = "; comment\n$ORIGIN example.com.\nns1.example.com. 3600 IN A 1.2.3.4\nns2.example.com. 3600 IN A 5.6.7.8";
        let r = parse_import(zone, &ImportFormat::ZoneFile);
        assert!(r.domains.contains(&"ns1.example.com".to_string()));
        assert!(r.domains.contains(&"ns2.example.com".to_string()));
    }

    #[test]
    fn test_parse_ct_log() {
        let ct =
            r#"[{"dns_names": ["example.com", "*.example.com"], "common_name": "example.com"}]"#;
        let r = parse_import(ct, &ImportFormat::CtLog);
        assert!(r.domains.contains(&"example.com".to_string()));
    }

    #[test]
    fn test_auto_detect() {
        let r = parse_import("a.com\nb.com", &ImportFormat::Auto);
        assert_eq!(r.domains.len(), 2);
    }
}
