use serde::{Deserialize, Serialize};
use std::collections::HashSet;

use crate::indicator::{ThreatCategory, ThreatIndicator, ThreatLevel};

/// A threat intelligence blocklist.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Blocklist {
    pub name: String,
    pub description: Option<String>,
    pub source_url: Option<String>,
    pub category: ThreatCategory,
    /// The domains on this blocklist.
    entries: HashSet<String>,
    /// When the blocklist was last updated.
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// A single blocklist entry.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BlocklistEntry {
    pub domain: String,
    pub category: ThreatCategory,
    pub source: String,
    pub added_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Result of checking a domain against blocklists.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BlocklistMatch {
    pub domain: String,
    pub matched_lists: Vec<String>,
    pub indicators: Vec<ThreatIndicator>,
}

impl Blocklist {
    pub fn new(name: impl Into<String>, category: ThreatCategory) -> Self {
        Self {
            name: name.into(),
            description: None,
            source_url: None,
            category,
            entries: HashSet::new(),
            updated_at: None,
        }
    }

    /// Parse a newline-delimited blocklist (common format).
    pub fn from_text(name: impl Into<String>, category: ThreatCategory, text: &str) -> Self {
        let entries = text.lines()
            .map(|l| l.trim().to_lowercase())
            .filter(|l| !l.is_empty() && !l.starts_with('#'))
            .collect();
        Self {
            name: name.into(),
            description: None,
            source_url: None,
            category,
            entries,
            updated_at: Some(chrono::Utc::now()),
        }
    }

    pub fn add(&mut self, domain: impl Into<String>) {
        self.entries.insert(domain.into().to_lowercase());
    }

    pub fn contains(&self, domain: &str) -> bool {
        self.entries.contains(&domain.to_lowercase())
    }

    /// Check if any parent domain is on the list.
    pub fn contains_parent(&self, domain: &str) -> bool {
        let lower = domain.to_lowercase();
        let parts: Vec<&str> = lower.split('.').collect();
        for i in 0..parts.len().saturating_sub(1) {
            let parent = parts[i..].join(".");
            if self.entries.contains(&parent) {
                return true;
            }
        }
        false
    }

    pub fn len(&self) -> usize { self.entries.len() }
    pub fn is_empty(&self) -> bool { self.entries.is_empty() }
}

/// Check a domain against multiple blocklists.
pub fn check_blocklists(domain: &str, blocklists: &[Blocklist]) -> BlocklistMatch {
    let mut matched_lists = vec![];
    let mut indicators = vec![];

    for list in blocklists {
        if list.contains(domain) || list.contains_parent(domain) {
            matched_lists.push(list.name.clone());
            indicators.push(
                ThreatIndicator::new(
                    ThreatCategory::BlocklistMatch,
                    ThreatLevel::High,
                    format!("Domain found on blocklist '{}'", list.name),
                ).with_evidence(format!("Category: {:?}", list.category))
                .with_confidence(0.95)
            );
        }
    }

    BlocklistMatch { domain: domain.to_string(), matched_lists, indicators }
}

/// Well-known public blocklist sources.
pub fn known_blocklist_urls() -> Vec<(&'static str, &'static str, ThreatCategory)> {
    vec![
        ("URLhaus", "https://urlhaus.abuse.ch/downloads/text/", ThreatCategory::Malware),
        ("PhishTank", "https://data.phishtank.com/data/online-valid.csv", ThreatCategory::Phishing),
        ("OpenPhish", "https://openphish.com/feed.txt", ThreatCategory::Phishing),
        ("Spamhaus DBL", "https://www.spamhaus.org/drop/drop.txt", ThreatCategory::Spam),
        ("MalwareDomainList", "https://www.malwaredomainlist.com/hostslist/hosts.txt", ThreatCategory::Malware),
        ("Abuse.ch Feodo", "https://feodotracker.abuse.ch/downloads/ipblocklist.txt", ThreatCategory::BotnetC2),
    ]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blocklist_creation() {
        let list = Blocklist::new("test", ThreatCategory::Malware);
        assert!(list.is_empty());
    }

    #[test]
    fn test_from_text() {
        let text = "evil.com\n# comment\nbad.org\nevil.com"; // duplicate
        let list = Blocklist::from_text("test", ThreatCategory::Malware, text);
        assert_eq!(list.len(), 2);
        assert!(list.contains("evil.com"));
        assert!(list.contains("bad.org"));
    }

    #[test]
    fn test_case_insensitive() {
        let mut list = Blocklist::new("test", ThreatCategory::Phishing);
        list.add("Evil.COM");
        assert!(list.contains("evil.com"));
        assert!(list.contains("EVIL.COM"));
    }

    #[test]
    fn test_parent_domain_check() {
        let mut list = Blocklist::new("test", ThreatCategory::Malware);
        list.add("evil.com");
        assert!(list.contains_parent("sub.evil.com"));
        assert!(list.contains_parent("deep.sub.evil.com"));
        assert!(!list.contains_parent("notevil.com"));
    }

    #[test]
    fn test_check_blocklists() {
        let mut list = Blocklist::new("malware", ThreatCategory::Malware);
        list.add("bad-domain.com");
        let result = check_blocklists("bad-domain.com", &[list]);
        assert_eq!(result.matched_lists.len(), 1);
        assert!(result.indicators.iter().any(|i| i.category == ThreatCategory::BlocklistMatch));
    }

    #[test]
    fn test_clean_domain_no_match() {
        let list = Blocklist::from_text("test", ThreatCategory::Malware, "evil.com\nbad.org");
        let result = check_blocklists("good-domain.com", &[list]);
        assert!(result.matched_lists.is_empty());
    }

    #[test]
    fn test_known_urls() {
        let urls = known_blocklist_urls();
        assert!(urls.len() >= 5);
    }
}
