use serde::{Deserialize, Serialize};

use crate::record::LookupSource;

/// Outcome of a fallback chain execution.
#[derive(Debug, Clone)]
pub enum FallbackOutcome {
    /// The source succeeded and returned data.
    Success(LookupSource),
    /// All sources in the chain failed.
    AllFailed(Vec<(LookupSource, String)>),
}

/// A prioritised chain of lookup sources with fallback.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FallbackChain {
    /// Ordered sources to try (first = primary).
    pub chain: Vec<FallbackEntry>,
}

/// An entry in the fallback chain.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FallbackEntry {
    pub source: LookupSource,
    /// Whether to skip this source on timeout (vs. retry).
    pub skip_on_timeout: bool,
    /// Maximum retries for this source.
    pub max_retries: u32,
    /// Timeout in milliseconds.
    pub timeout_ms: u64,
}

impl FallbackChain {
    /// Default chain: RDAP → WHOIS → DNS.
    pub fn default_chain() -> Self {
        Self {
            chain: vec![
                FallbackEntry {
                    source: LookupSource::Rdap,
                    skip_on_timeout: true,
                    max_retries: 1,
                    timeout_ms: 10_000,
                },
                FallbackEntry {
                    source: LookupSource::Whois,
                    skip_on_timeout: false,
                    max_retries: 2,
                    timeout_ms: 15_000,
                },
                FallbackEntry {
                    source: LookupSource::Dns,
                    skip_on_timeout: true,
                    max_retries: 1,
                    timeout_ms: 5_000,
                },
            ],
        }
    }

    /// WHOIS-first chain.
    pub fn whois_first() -> Self {
        Self {
            chain: vec![
                FallbackEntry {
                    source: LookupSource::Whois,
                    skip_on_timeout: false,
                    max_retries: 2,
                    timeout_ms: 15_000,
                },
                FallbackEntry {
                    source: LookupSource::Rdap,
                    skip_on_timeout: true,
                    max_retries: 1,
                    timeout_ms: 10_000,
                },
                FallbackEntry {
                    source: LookupSource::Dns,
                    skip_on_timeout: true,
                    max_retries: 1,
                    timeout_ms: 5_000,
                },
            ],
        }
    }

    /// DNS-only chain for availability checks.
    pub fn dns_only() -> Self {
        Self {
            chain: vec![FallbackEntry {
                source: LookupSource::Dns,
                skip_on_timeout: false,
                max_retries: 3,
                timeout_ms: 5_000,
            }],
        }
    }

    /// Custom chain from a list of sources.
    pub fn custom(sources: Vec<LookupSource>) -> Self {
        Self {
            chain: sources
                .into_iter()
                .map(|s| FallbackEntry {
                    source: s,
                    skip_on_timeout: true,
                    max_retries: 1,
                    timeout_ms: 10_000,
                })
                .collect(),
        }
    }

    /// Sources in order.
    pub fn sources(&self) -> Vec<&LookupSource> {
        self.chain.iter().map(|e| &e.source).collect()
    }

    pub fn len(&self) -> usize {
        self.chain.len()
    }
    pub fn is_empty(&self) -> bool {
        self.chain.is_empty()
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_chain_order() {
        let chain = FallbackChain::default_chain();
        let sources = chain.sources();
        assert_eq!(*sources[0], LookupSource::Rdap);
        assert_eq!(*sources[1], LookupSource::Whois);
        assert_eq!(*sources[2], LookupSource::Dns);
    }

    #[test]
    fn test_whois_first_chain() {
        let chain = FallbackChain::whois_first();
        assert_eq!(*chain.sources()[0], LookupSource::Whois);
    }

    #[test]
    fn test_dns_only_chain() {
        let chain = FallbackChain::dns_only();
        assert_eq!(chain.len(), 1);
        assert_eq!(*chain.sources()[0], LookupSource::Dns);
    }

    #[test]
    fn test_custom_chain() {
        let chain = FallbackChain::custom(vec![LookupSource::Dns, LookupSource::Whois]);
        assert_eq!(chain.len(), 2);
    }

    #[test]
    fn test_fallback_outcome_variants() {
        let success = FallbackOutcome::Success(LookupSource::Whois);
        match success {
            FallbackOutcome::Success(s) => assert_eq!(s, LookupSource::Whois),
            _ => panic!("Expected Success"),
        }
        let failed = FallbackOutcome::AllFailed(vec![(LookupSource::Whois, "timeout".into())]);
        match failed {
            FallbackOutcome::AllFailed(errs) => assert_eq!(errs.len(), 1),
            _ => panic!("Expected AllFailed"),
        }
    }
}
