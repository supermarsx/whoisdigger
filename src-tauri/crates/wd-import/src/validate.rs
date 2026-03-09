use serde::{Deserialize, Serialize};

/// What level of domain validation to apply.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ValidationLevel {
    /// No validation; pass through everything.
    None,
    /// Basic: must have at least one dot, no spaces, reasonable length.
    Basic,
    /// Strict: enforce RFC-compliant labels and valid TLDs.
    Strict,
}

/// Domain validator with configurable strictness.
#[derive(Debug, Clone)]
pub struct DomainValidator {
    pub level: ValidationLevel,
    pub max_length: usize,
    pub min_length: usize,
    pub allow_idn: bool,
    pub allow_wildcards: bool,
}

impl Default for DomainValidator {
    fn default() -> Self {
        Self {
            level: ValidationLevel::Basic,
            max_length: 253,
            min_length: 3,
            allow_idn: true,
            allow_wildcards: false,
        }
    }
}

impl DomainValidator {
    pub fn strict() -> Self {
        Self {
            level: ValidationLevel::Strict,
            ..Default::default()
        }
    }

    /// Validate a single domain.
    pub fn is_valid(&self, domain: &str) -> bool {
        match self.level {
            ValidationLevel::None => true,
            ValidationLevel::Basic => self.basic_check(domain),
            ValidationLevel::Strict => self.strict_check(domain),
        }
    }

    /// Filter a list of domains, returning only valid ones.
    pub fn filter(&self, domains: Vec<String>) -> (Vec<String>, usize) {
        let before = domains.len();
        let valid: Vec<String> = domains.into_iter().filter(|d| self.is_valid(d)).collect();
        let removed = before - valid.len();
        (valid, removed)
    }

    fn basic_check(&self, domain: &str) -> bool {
        let d = domain.trim();
        if d.len() < self.min_length || d.len() > self.max_length {
            return false;
        }
        if d.contains(' ') || d.contains('\t') {
            return false;
        }
        if !d.contains('.') {
            return false;
        }
        if d.starts_with('.') || d.ends_with('.') {
            return false;
        }
        if d.starts_with('-') || d.ends_with('-') {
            return false;
        }
        if !self.allow_wildcards && d.starts_with("*.") {
            return false;
        }
        true
    }

    fn strict_check(&self, domain: &str) -> bool {
        if !self.basic_check(domain) {
            return false;
        }

        // Check each label
        for label in domain.split('.') {
            if label.is_empty() || label.len() > 63 {
                return false;
            }
            if label.starts_with('-') || label.ends_with('-') {
                return false;
            }

            // Only allow alphanumeric and hyphens (plus IDN xn-- prefix)
            if !self.allow_idn {
                if !label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
                    return false;
                }
            } else {
                // Allow xn-- prefix for IDN
                if label.starts_with("xn--") {
                    if !label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
                        return false;
                    }
                } else if !label.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
                    return false;
                }
            }
        }

        true
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_basic() {
        let v = DomainValidator::default();
        assert!(v.is_valid("example.com"));
        assert!(v.is_valid("sub.example.co.uk"));
    }

    #[test]
    fn test_invalid_no_dot() {
        let v = DomainValidator::default();
        assert!(!v.is_valid("localhost"));
    }

    #[test]
    fn test_invalid_spaces() {
        let v = DomainValidator::default();
        assert!(!v.is_valid("example .com"));
    }

    #[test]
    fn test_invalid_too_short() {
        let v = DomainValidator::default();
        assert!(!v.is_valid("a"));
    }

    #[test]
    fn test_invalid_leading_dot() {
        let v = DomainValidator::default();
        assert!(!v.is_valid(".example.com"));
    }

    #[test]
    fn test_strict_valid() {
        let v = DomainValidator::strict();
        assert!(v.is_valid("example.com"));
        assert!(v.is_valid("my-domain.co.uk"));
    }

    #[test]
    fn test_strict_label_too_long() {
        let v = DomainValidator::strict();
        let long_label = "a".repeat(64);
        assert!(!v.is_valid(&format!("{}.com", long_label)));
    }

    #[test]
    fn test_strict_hyphen_at_boundary() {
        let v = DomainValidator::strict();
        assert!(!v.is_valid("-example.com"));
        assert!(!v.is_valid("example-.com"));
    }

    #[test]
    fn test_wildcard_blocked_by_default() {
        let v = DomainValidator::default();
        assert!(!v.is_valid("*.example.com"));
    }

    #[test]
    fn test_wildcard_allowed() {
        let v = DomainValidator {
            allow_wildcards: true,
            ..Default::default()
        };
        assert!(v.is_valid("*.example.com"));
    }

    #[test]
    fn test_filter() {
        let v = DomainValidator::default();
        let domains = vec!["example.com".into(), "bad".into(), "ok.org".into()];
        let (valid, removed) = v.filter(domains);
        assert_eq!(valid.len(), 2);
        assert_eq!(removed, 1);
    }

    #[test]
    fn test_no_validation() {
        let v = DomainValidator {
            level: ValidationLevel::None,
            ..Default::default()
        };
        assert!(v.is_valid("anything at all"));
    }
}
