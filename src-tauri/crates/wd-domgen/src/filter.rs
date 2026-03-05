use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Configuration for domain filtering.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FilterConfig {
    /// Minimum label length (before TLD).
    pub min_length: usize,
    /// Maximum label length.
    pub max_length: usize,
    /// Only allow ASCII alphanumeric + hyphens.
    pub ascii_only: bool,
    /// Blocklist of exact domain labels to exclude.
    #[serde(default)]
    pub blocklist: Vec<String>,
    /// Block domains containing any of these substrings.
    #[serde(default)]
    pub blocked_substrings: Vec<String>,
    /// Remove duplicates.
    #[serde(default = "default_true")]
    pub dedup: bool,
}

fn default_true() -> bool { true }

impl Default for FilterConfig {
    fn default() -> Self {
        Self {
            min_length: 1,
            max_length: 63,
            ascii_only: true,
            blocklist: Vec::new(),
            blocked_substrings: Vec::new(),
            dedup: true,
        }
    }
}

/// Domain filter engine.
pub struct DomainFilter {
    config: FilterConfig,
    blocklist_set: HashSet<String>,
}

impl DomainFilter {
    pub fn new(config: FilterConfig) -> Self {
        let blocklist_set: HashSet<String> = config.blocklist.iter()
            .map(|s| s.to_lowercase())
            .collect();
        Self { config, blocklist_set }
    }

    /// Filter a list of domains, returning only those that pass all checks.
    pub fn filter(&self, domains: &[String]) -> Vec<String> {
        let mut out = Vec::new();
        let mut seen = HashSet::new();

        for domain in domains {
            let lower = domain.to_lowercase();
            let label = extract_label(&lower);

            if self.config.dedup && !seen.insert(lower.clone()) {
                continue;
            }

            if label.len() < self.config.min_length || label.len() > self.config.max_length {
                continue;
            }

            if self.config.ascii_only && !is_valid_domain_label(label) {
                continue;
            }

            if self.blocklist_set.contains(label) {
                continue;
            }

            if self.config.blocked_substrings.iter().any(|sub| label.contains(sub.as_str())) {
                continue;
            }

            out.push(lower);
        }

        out
    }

    /// Count how many domains would pass.
    pub fn count_passing(&self, domains: &[String]) -> usize {
        self.filter(domains).len()
    }
}

/// Extract the label (part before the first dot).
fn extract_label(domain: &str) -> &str {
    domain.split('.').next().unwrap_or(domain)
}

/// Check if a label is valid DNS (ASCII alphanumeric + hyphens, no leading/trailing hyphen).
fn is_valid_domain_label(label: &str) -> bool {
    !label.is_empty()
        && label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
        && !label.starts_with('-')
        && !label.ends_with('-')
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_filter() {
        let f = DomainFilter::new(FilterConfig::default());
        let input = vec!["good.com".into(), "ok.io".into()];
        assert_eq!(f.filter(&input).len(), 2);
    }

    #[test]
    fn test_min_length_filter() {
        let config = FilterConfig { min_length: 4, ..Default::default() };
        let f = DomainFilter::new(config);
        let input = vec!["ab.com".into(), "abcd.com".into()];
        let result = f.filter(&input);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], "abcd.com");
    }

    #[test]
    fn test_blocklist() {
        let config = FilterConfig {
            blocklist: vec!["blocked".into()],
            ..Default::default()
        };
        let f = DomainFilter::new(config);
        let input = vec!["blocked.com".into(), "fine.com".into()];
        let result = f.filter(&input);
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_blocked_substring() {
        let config = FilterConfig {
            blocked_substrings: vec!["bad".into()],
            ..Default::default()
        };
        let f = DomainFilter::new(config);
        let input = vec!["mybadsite.com".into(), "goodsite.com".into()];
        assert_eq!(f.filter(&input).len(), 1);
    }

    #[test]
    fn test_dedup() {
        let f = DomainFilter::new(FilterConfig::default());
        let input = vec!["dup.com".into(), "DUP.com".into(), "unique.com".into()];
        assert_eq!(f.filter(&input).len(), 2);
    }

    #[test]
    fn test_ascii_only_rejects_unicode() {
        let f = DomainFilter::new(FilterConfig { ascii_only: true, ..Default::default() });
        let input = vec!["日本語.com".into(), "ascii.com".into()];
        assert_eq!(f.filter(&input).len(), 1);
    }

    #[test]
    fn test_hyphen_label_validation() {
        let f = DomainFilter::new(FilterConfig::default());
        let input = vec![
            "good-domain.com".into(),
            "-bad.com".into(),
            "bad-.com".into(),
        ];
        assert_eq!(f.filter(&input).len(), 1);
    }

    #[test]
    fn test_count_passing() {
        let f = DomainFilter::new(FilterConfig::default());
        let input = vec!["a.com".into(), "b.com".into()];
        assert_eq!(f.count_passing(&input), 2);
    }
}
