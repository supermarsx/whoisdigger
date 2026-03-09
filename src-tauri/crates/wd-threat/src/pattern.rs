use serde::{Deserialize, Serialize};

use crate::indicator::{ThreatCategory, ThreatIndicator, ThreatLevel};

/// A suspicious pattern that was detected.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SuspiciousPattern {
    pub name: String,
    pub description: String,
    pub matched: bool,
}

/// Detects suspicious patterns in domain names and WHOIS data.
#[derive(Debug)]
pub struct PatternDetector {
    /// High-value brands to check for squatting.
    brands: Vec<String>,
    /// Suspicious TLDs.
    suspicious_tlds: Vec<String>,
    /// Known privacy/proxy registrars.
    privacy_registrars: Vec<String>,
}

impl PatternDetector {
    pub fn new() -> Self {
        Self {
            brands: default_brands(),
            suspicious_tlds: default_suspicious_tlds(),
            privacy_registrars: default_privacy_registrars(),
        }
    }

    pub fn add_brand(&mut self, brand: impl Into<String>) {
        self.brands.push(brand.into().to_lowercase());
    }

    /// Analyse a domain name for suspicious patterns.
    pub fn analyse_domain(&self, domain: &str) -> Vec<ThreatIndicator> {
        let mut indicators = vec![];
        let lower = domain.to_lowercase();
        let labels: Vec<&str> = lower.split('.').collect();
        let tld = labels.last().copied().unwrap_or("");
        let sld = if labels.len() >= 2 {
            labels[labels.len() - 2]
        } else {
            ""
        };

        // DGA detection (high entropy, random-looking)
        if is_dga_like(sld) {
            indicators.push(
                ThreatIndicator::new(
                    ThreatCategory::DgaDomain,
                    ThreatLevel::High,
                    "Domain appears to be algorithmically generated (DGA)",
                )
                .with_evidence(format!("Label '{}' has high entropy", sld))
                .with_confidence(0.7),
            );
        }

        // Brand impersonation / typosquatting
        for brand in &self.brands {
            if sld.contains(brand.as_str()) && sld != brand.as_str() {
                indicators.push(
                    ThreatIndicator::new(
                        ThreatCategory::BrandImpersonation,
                        ThreatLevel::High,
                        format!("Domain contains brand name '{}'", brand),
                    )
                    .with_evidence(format!("SLD '{}' contains '{}'", sld, brand)),
                );
            }
            // Levenshtein-like check: off-by-one
            if sld.len() == brand.len() && edit_distance(sld, brand) <= 2 && sld != brand.as_str() {
                indicators.push(
                    ThreatIndicator::new(
                        ThreatCategory::Typosquat,
                        ThreatLevel::Medium,
                        format!("Domain is similar to '{}'", brand),
                    )
                    .with_evidence(format!(
                        "Edit distance of {} from '{}'",
                        edit_distance(sld, brand),
                        brand
                    )),
                );
            }
        }

        // Suspicious TLD
        if self.suspicious_tlds.contains(&tld.to_string()) {
            indicators.push(ThreatIndicator::new(
                ThreatCategory::Phishing,
                ThreatLevel::Low,
                format!("Uses suspicious TLD '.{}'", tld),
            ));
        }

        // Excessive hyphens (common in phishing)
        let hyphen_count = sld.matches('-').count();
        if hyphen_count >= 3 {
            indicators.push(
                ThreatIndicator::new(
                    ThreatCategory::Phishing,
                    ThreatLevel::Medium,
                    format!("Domain has {} hyphens, common in phishing", hyphen_count),
                )
                .with_confidence(0.6),
            );
        }

        // Very long domain
        if sld.len() > 30 {
            indicators.push(ThreatIndicator::new(
                ThreatCategory::Phishing,
                ThreatLevel::Low,
                format!("Unusually long domain label ({} chars)", sld.len()),
            ));
        }

        // Homoglyph detection (mixed scripts or look-alike chars)
        if contains_homoglyphs(sld) {
            indicators.push(ThreatIndicator::new(
                ThreatCategory::Homoglyph,
                ThreatLevel::High,
                "Domain contains potential homoglyph characters",
            ));
        }

        // Excessive subdomains (fast-flux indicator)
        if labels.len() > 4 {
            indicators.push(
                ThreatIndicator::new(
                    ThreatCategory::FastFlux,
                    ThreatLevel::Low,
                    format!("Domain has {} subdomain levels", labels.len() - 2),
                )
                .with_confidence(0.4),
            );
        }

        indicators
    }

    /// Analyse WHOIS data for suspicious indicators.
    pub fn analyse_whois(
        &self,
        registrar: Option<&str>,
        created_days_ago: Option<i64>,
    ) -> Vec<ThreatIndicator> {
        let mut indicators = vec![];

        // Privacy proxy registrar
        if let Some(reg) = registrar {
            let reg_lower = reg.to_lowercase();
            if self
                .privacy_registrars
                .iter()
                .any(|p| reg_lower.contains(p))
            {
                indicators.push(
                    ThreatIndicator::new(
                        ThreatCategory::PrivacyProxy,
                        ThreatLevel::Low,
                        "Domain uses a privacy/proxy registrar",
                    )
                    .with_evidence(reg.to_string()),
                );
            }
        }

        // Recently registered
        if let Some(days) = created_days_ago {
            if days < 30 {
                indicators.push(
                    ThreatIndicator::new(
                        ThreatCategory::RecentlyRegistered,
                        ThreatLevel::Medium,
                        format!("Domain registered {} days ago", days),
                    )
                    .with_confidence(0.6),
                );
            } else if days < 90 {
                indicators.push(
                    ThreatIndicator::new(
                        ThreatCategory::RecentlyRegistered,
                        ThreatLevel::Low,
                        format!("Domain registered {} days ago", days),
                    )
                    .with_confidence(0.4),
                );
            }
        }

        indicators
    }
}

impl Default for PatternDetector {
    fn default() -> Self {
        Self::new()
    }
}

/// Simple DGA detection based on consonant/vowel ratio and entropy.
fn is_dga_like(label: &str) -> bool {
    if label.len() < 8 {
        return false;
    }

    let vowels = label.chars().filter(|c| "aeiou".contains(*c)).count();
    let consonants = label
        .chars()
        .filter(|c| c.is_ascii_alphabetic() && !"aeiou".contains(*c))
        .count();

    if consonants == 0 {
        return false;
    }
    let ratio = vowels as f64 / consonants as f64;

    // Too few or too many vowels is suspicious
    if ratio < 0.1 || (label.len() > 12 && has_high_entropy(label)) {
        return true;
    }

    // Check for alternating digit-letter patterns (common in DGA)
    let digit_count = label.chars().filter(|c| c.is_ascii_digit()).count();
    let alpha_count = label.chars().filter(|c| c.is_ascii_alphabetic()).count();
    if digit_count > 0 && alpha_count > 0 && label.len() > 10 {
        let mixed_ratio = digit_count.min(alpha_count) as f64 / digit_count.max(alpha_count) as f64;
        if mixed_ratio > 0.3 {
            return true;
        }
    }

    false
}

/// Simple Shannon entropy check.
fn has_high_entropy(s: &str) -> bool {
    let mut freq = [0u32; 256];
    for b in s.bytes() {
        freq[b as usize] += 1;
    }
    let len = s.len() as f64;
    let entropy: f64 = freq
        .iter()
        .filter(|&&f| f > 0)
        .map(|&f| {
            let p = f as f64 / len;
            -p * p.log2()
        })
        .sum();
    entropy > 3.5
}

/// Check for common homoglyph substitutions.
fn contains_homoglyphs(label: &str) -> bool {
    // Check for mixed digits that look like letters: 0→o, 1→l, 5→s, 3→e
    let suspicious_digits: &[char] = &['0', '1', '5', '3'];
    let has_alpha = label.chars().any(|c| c.is_ascii_alphabetic());
    let has_suspicious_digit = label.chars().any(|c| suspicious_digits.contains(&c));
    if has_alpha && has_suspicious_digit {
        return true;
    }
    // xn-- IDN prefix (potential punycode homoglyph)
    if label.starts_with("xn--") {
        return true;
    }
    false
}

/// Levenshtein edit distance.
fn edit_distance(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let m = a_chars.len();
    let n = b_chars.len();
    let mut dp = vec![vec![0usize; n + 1]; m + 1];
    for i in 0..=m {
        dp[i][0] = i;
    }
    for j in 0..=n {
        dp[0][j] = j;
    }
    for i in 1..=m {
        for j in 1..=n {
            let cost = if a_chars[i - 1] == b_chars[j - 1] {
                0
            } else {
                1
            };
            dp[i][j] = (dp[i - 1][j] + 1)
                .min(dp[i][j - 1] + 1)
                .min(dp[i - 1][j - 1] + cost);
        }
    }
    dp[m][n]
}

fn default_brands() -> Vec<String> {
    vec![
        "google",
        "facebook",
        "apple",
        "microsoft",
        "amazon",
        "paypal",
        "netflix",
        "twitter",
        "instagram",
        "linkedin",
        "github",
        "dropbox",
        "chase",
        "wellsfargo",
        "bankofamerica",
        "citi",
        "hsbc",
        "coinbase",
        "binance",
        "kraken",
        "metamask",
        "opensea",
    ]
    .into_iter()
    .map(|s| s.to_string())
    .collect()
}

fn default_suspicious_tlds() -> Vec<String> {
    vec![
        "tk",
        "ml",
        "ga",
        "cf",
        "gq",
        "xyz",
        "top",
        "work",
        "click",
        "loan",
        "bid",
        "download",
        "racing",
        "stream",
        "win",
        "date",
        "review",
        "accountant",
        "science",
        "party",
        "faith",
    ]
    .into_iter()
    .map(|s| s.to_string())
    .collect()
}

fn default_privacy_registrars() -> Vec<String> {
    vec![
        "whoisguard",
        "privacyprotect",
        "contactprivacy",
        "domainsbyproxy",
        "withheldforprivacy",
        "redacted for privacy",
        "identity protection",
    ]
    .into_iter()
    .map(|s| s.to_string())
    .collect()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_brand_impersonation() {
        let d = PatternDetector::new();
        let indicators = d.analyse_domain("google-login-secure.com");
        assert!(indicators
            .iter()
            .any(|i| i.category == ThreatCategory::BrandImpersonation));
    }

    #[test]
    fn test_detect_excessive_hyphens() {
        let d = PatternDetector::new();
        let indicators = d.analyse_domain("a-b-c-d-e.com");
        assert!(indicators
            .iter()
            .any(|i| matches!(i.category, ThreatCategory::Phishing)));
    }

    #[test]
    fn test_detect_suspicious_tld() {
        let d = PatternDetector::new();
        let indicators = d.analyse_domain("example.tk");
        assert!(indicators
            .iter()
            .any(|i| matches!(i.category, ThreatCategory::Phishing)));
    }

    #[test]
    fn test_clean_domain() {
        let d = PatternDetector::new();
        let indicators = d.analyse_domain("example.com");
        assert!(indicators.is_empty());
    }

    #[test]
    fn test_recent_registration() {
        let d = PatternDetector::new();
        let indicators = d.analyse_whois(None, Some(5));
        assert!(indicators
            .iter()
            .any(|i| i.category == ThreatCategory::RecentlyRegistered));
    }

    #[test]
    fn test_privacy_proxy() {
        let d = PatternDetector::new();
        let indicators = d.analyse_whois(Some("WhoisGuard Protected"), None);
        assert!(indicators
            .iter()
            .any(|i| i.category == ThreatCategory::PrivacyProxy));
    }

    #[test]
    fn test_edit_distance() {
        assert_eq!(edit_distance("google", "googl3"), 1);
        assert_eq!(edit_distance("apple", "apple"), 0);
        assert_eq!(edit_distance("abc", "xyz"), 3);
    }

    #[test]
    fn test_dga_detection() {
        assert!(is_dga_like("xjqvkrlmwnpts"));
        assert!(!is_dga_like("google"));
    }

    #[test]
    fn test_homoglyph_detection() {
        assert!(contains_homoglyphs("g00gle")); // contains 0 and o-like
        assert!(contains_homoglyphs("xn--exmple-cua"));
        assert!(!contains_homoglyphs("google"));
    }

    #[test]
    fn test_add_custom_brand() {
        let mut d = PatternDetector::new();
        d.add_brand("mybrand");
        let indicators = d.analyse_domain("mybrand-login.com");
        assert!(indicators
            .iter()
            .any(|i| i.category == ThreatCategory::BrandImpersonation));
    }
}
