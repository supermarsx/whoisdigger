use serde::{Deserialize, Serialize};

/// Configuration for the domain combinator.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CombinatorConfig {
    /// Base words to combine (e.g., ["cloud", "net", "fast"]).
    pub words: Vec<String>,
    /// Prefixes to prepend (e.g., ["get", "my", "go"]).
    #[serde(default)]
    pub prefixes: Vec<String>,
    /// Suffixes to append (e.g., ["hub", "lab", "io"]).
    #[serde(default)]
    pub suffixes: Vec<String>,
    /// TLDs to expand across (e.g., [".com", ".io", ".net"]).
    #[serde(default)]
    pub tlds: Vec<String>,
    /// Whether to include just-the-word + TLD (no prefix/suffix).
    #[serde(default = "default_true")]
    pub include_bare: bool,
    /// Separator between parts (default: none, could be "-").
    #[serde(default)]
    pub separator: String,
    /// Maximum domain label length (before TLD). Default 63 per RFC.
    #[serde(default = "default_max_len")]
    pub max_label_length: usize,
}

fn default_true() -> bool {
    true
}
fn default_max_len() -> usize {
    63
}

impl Default for CombinatorConfig {
    fn default() -> Self {
        Self {
            words: Vec::new(),
            prefixes: Vec::new(),
            suffixes: Vec::new(),
            tlds: vec![".com".into()],
            include_bare: true,
            separator: String::new(),
            max_label_length: 63,
        }
    }
}

/// Expand all combinations from config, returning domain labels (with TLD).
///
/// Generates:
/// - word + tld (if `include_bare`)
/// - prefix + sep + word + tld
/// - word + sep + suffix + tld
/// - prefix + sep + word + sep + suffix + tld
/// - word1 + sep + word2 + tld (pairwise)
pub fn expand_combinations(config: &CombinatorConfig) -> Vec<String> {
    let mut results = Vec::new();
    let sep = &config.separator;

    for tld in &config.tlds {
        let tld = normalize_tld(tld);

        for word in &config.words {
            // Bare word
            if config.include_bare {
                push_if_valid(
                    &mut results,
                    format!("{word}{tld}"),
                    config.max_label_length,
                );
            }

            // Prefix + word
            for prefix in &config.prefixes {
                push_if_valid(
                    &mut results,
                    format!("{prefix}{sep}{word}{tld}"),
                    config.max_label_length,
                );
            }

            // Word + suffix
            for suffix in &config.suffixes {
                push_if_valid(
                    &mut results,
                    format!("{word}{sep}{suffix}{tld}"),
                    config.max_label_length,
                );
            }

            // Prefix + word + suffix
            for prefix in &config.prefixes {
                for suffix in &config.suffixes {
                    push_if_valid(
                        &mut results,
                        format!("{prefix}{sep}{word}{sep}{suffix}{tld}"),
                        config.max_label_length,
                    );
                }
            }
        }

        // Pairwise word combinations
        for (i, w1) in config.words.iter().enumerate() {
            for w2 in config.words.iter().skip(i + 1) {
                push_if_valid(
                    &mut results,
                    format!("{w1}{sep}{w2}{tld}"),
                    config.max_label_length,
                );
                push_if_valid(
                    &mut results,
                    format!("{w2}{sep}{w1}{tld}"),
                    config.max_label_length,
                );
            }
        }
    }

    // Dedup while preserving order
    let mut seen = std::collections::HashSet::new();
    results.retain(|d| seen.insert(d.clone()));
    results
}

fn normalize_tld(tld: &str) -> String {
    if tld.starts_with('.') {
        tld.to_string()
    } else {
        format!(".{tld}")
    }
}

fn push_if_valid(out: &mut Vec<String>, domain: String, max_label: usize) {
    // Extract the label part (everything before the first dot)
    if let Some(dot_pos) = domain.find('.') {
        let label = &domain[..dot_pos];
        if !label.is_empty() && label.len() <= max_label {
            out.push(domain.to_lowercase());
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bare_word_only() {
        let config = CombinatorConfig {
            words: vec!["cloud".into()],
            tlds: vec![".com".into()],
            ..Default::default()
        };
        let results = expand_combinations(&config);
        assert!(results.contains(&"cloud.com".to_string()));
    }

    #[test]
    fn test_prefix_combinations() {
        let config = CombinatorConfig {
            words: vec!["app".into()],
            prefixes: vec!["get".into(), "my".into()],
            tlds: vec![".com".into()],
            ..Default::default()
        };
        let results = expand_combinations(&config);
        assert!(results.contains(&"getapp.com".to_string()));
        assert!(results.contains(&"myapp.com".to_string()));
    }

    #[test]
    fn test_suffix_combinations() {
        let config = CombinatorConfig {
            words: vec!["cloud".into()],
            suffixes: vec!["hub".into(), "lab".into()],
            tlds: vec![".io".into()],
            ..Default::default()
        };
        let results = expand_combinations(&config);
        assert!(results.contains(&"cloudhub.io".to_string()));
        assert!(results.contains(&"cloudlab.io".to_string()));
    }

    #[test]
    fn test_separator() {
        let config = CombinatorConfig {
            words: vec!["fast".into()],
            prefixes: vec!["go".into()],
            separator: "-".into(),
            tlds: vec![".com".into()],
            ..Default::default()
        };
        let results = expand_combinations(&config);
        assert!(results.contains(&"go-fast.com".to_string()));
    }

    #[test]
    fn test_multi_tld() {
        let config = CombinatorConfig {
            words: vec!["test".into()],
            tlds: vec![".com".into(), ".io".into(), ".net".into()],
            ..Default::default()
        };
        let results = expand_combinations(&config);
        assert!(results.contains(&"test.com".to_string()));
        assert!(results.contains(&"test.io".to_string()));
        assert!(results.contains(&"test.net".to_string()));
    }

    #[test]
    fn test_pairwise() {
        let config = CombinatorConfig {
            words: vec!["fire".into(), "wall".into()],
            tlds: vec![".com".into()],
            ..Default::default()
        };
        let results = expand_combinations(&config);
        assert!(results.contains(&"firewall.com".to_string()));
        assert!(results.contains(&"wallfire.com".to_string()));
    }

    #[test]
    fn test_deduplication() {
        let config = CombinatorConfig {
            words: vec!["x".into()],
            prefixes: vec!["x".into()],
            separator: "".into(),
            tlds: vec![".com".into()],
            include_bare: true,
            max_label_length: 63,
            ..Default::default()
        };
        let results = expand_combinations(&config);
        // "xx.com" should appear only once
        let count = results.iter().filter(|d| *d == "xx.com").count();
        assert_eq!(count, 1);
    }

    #[test]
    fn test_max_label_filter() {
        let config = CombinatorConfig {
            words: vec!["a".repeat(60)],
            prefixes: vec!["pre".into()],
            tlds: vec![".com".into()],
            max_label_length: 63,
            ..Default::default()
        };
        let results = expand_combinations(&config);
        // bare "aaa...aaa.com" (60 chars) should be included
        assert!(results.iter().any(|d| d.starts_with(&"a".repeat(60))));
        // "pre" + 60 chars = 63, which is exactly at limit
        assert!(results.iter().any(|d| d.starts_with("pre")));
    }
}
