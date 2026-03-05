use serde::{Deserialize, Serialize};

/// Pre-built pipeline kinds.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PipelineKind {
    DomainAudit,
    PortfolioAnalysis,
    SecurityScan,
    BrandProtection,
    DropWatch,
    Custom,
}

impl std::fmt::Display for PipelineKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DomainAudit => write!(f, "Domain Audit"),
            Self::PortfolioAnalysis => write!(f, "Portfolio Analysis"),
            Self::SecurityScan => write!(f, "Security Scan"),
            Self::BrandProtection => write!(f, "Brand Protection"),
            Self::DropWatch => write!(f, "Drop Watch"),
            Self::Custom => write!(f, "Custom"),
        }
    }
}

/// A step in a pipeline.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PipelineStep {
    pub name: String,
    pub description: String,
    pub agent_prompt: String,
    pub required_tools: Vec<String>,
}

/// A pre-built pipeline that chains agent runs.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Pipeline {
    pub kind: PipelineKind,
    pub name: String,
    pub description: String,
    pub steps: Vec<PipelineStep>,
}

impl Pipeline {
    /// Domain audit pipeline.
    pub fn domain_audit(domain: &str) -> Self {
        Self {
            kind: PipelineKind::DomainAudit,
            name: format!("Domain Audit: {domain}"),
            description: format!("Comprehensive analysis of {domain}"),
            steps: vec![
                PipelineStep {
                    name: "WHOIS Lookup".into(),
                    description: format!("Retrieve WHOIS data for {domain}"),
                    agent_prompt: format!(
                        "Perform a WHOIS lookup for {domain} and extract key fields: \
                         registrant, registrar, creation date, expiry date, name servers."
                    ),
                    required_tools: vec!["whois_lookup".into(), "parse_whois".into()],
                },
                PipelineStep {
                    name: "DNS Analysis".into(),
                    description: format!("Resolve and analyse DNS records for {domain}"),
                    agent_prompt: format!(
                        "Resolve all DNS record types for {domain} (A, AAAA, MX, NS, TXT, CNAME). \
                         Identify the hosting provider and email configuration."
                    ),
                    required_tools: vec!["dns_lookup".into()],
                },
                PipelineStep {
                    name: "Security Assessment".into(),
                    description: format!("Check {domain} for security concerns"),
                    agent_prompt: format!(
                        "Assess {domain} for security risks: check registration age, \
                         privacy protection, and generate a small typosquat check."
                    ),
                    required_tools: vec!["threat_scan".into(), "generate_typosquats".into()],
                },
                PipelineStep {
                    name: "Summary Report".into(),
                    description: "Compile findings into a structured report".into(),
                    agent_prompt: "Summarise all findings from previous steps into a clear, \
                         structured report. Include: domain overview, DNS configuration, \
                         security assessment, and recommendations."
                        .into(),
                    required_tools: vec![],
                },
            ],
        }
    }

    /// Portfolio analysis pipeline.
    pub fn portfolio_analysis() -> Self {
        Self {
            kind: PipelineKind::PortfolioAnalysis,
            name: "Portfolio Analysis".into(),
            description: "Analyse a portfolio of domains for value and risk".into(),
            steps: vec![
                PipelineStep {
                    name: "Bulk Lookup".into(),
                    description: "WHOIS lookup for all domains in the portfolio".into(),
                    agent_prompt: "Perform bulk WHOIS lookups for all domains in the \
                         provided list. Extract registration and expiry dates."
                        .into(),
                    required_tools: vec!["bulk_whois".into()],
                },
                PipelineStep {
                    name: "Expiry Analysis".into(),
                    description: "Identify domains nearing expiry".into(),
                    agent_prompt: "Analyse all domains for expiry urgency. Flag any domains \
                         expiring within 30, 60, and 90 days."
                        .into(),
                    required_tools: vec!["check_expiry".into()],
                },
                PipelineStep {
                    name: "Portfolio Report".into(),
                    description: "Generate portfolio health report".into(),
                    agent_prompt: "Generate a portfolio health report including: total domains, \
                         registrar distribution, expiry timeline, and action items."
                        .into(),
                    required_tools: vec![],
                },
            ],
        }
    }

    /// Security scan pipeline.
    pub fn security_scan(domain: &str) -> Self {
        Self {
            kind: PipelineKind::SecurityScan,
            name: format!("Security Scan: {domain}"),
            description: format!("Comprehensive security scan for {domain}"),
            steps: vec![
                PipelineStep {
                    name: "Typosquat Generation".into(),
                    description: "Generate and check typosquat domains".into(),
                    agent_prompt: format!(
                        "Generate typosquat candidates for {domain}, including character \
                         swaps, missing characters, and common typos. Check availability."
                    ),
                    required_tools: vec!["generate_typosquats".into(), "bulk_whois".into()],
                },
                PipelineStep {
                    name: "Homoglyph Analysis".into(),
                    description: "Check for IDN homoglyph attacks".into(),
                    agent_prompt: format!(
                        "Analyse {domain} for potential homoglyph/IDN attacks. Identify \
                         Unicode characters that visually resemble the domain's characters."
                    ),
                    required_tools: vec!["homoglyph_check".into()],
                },
                PipelineStep {
                    name: "Threat Report".into(),
                    description: "Compile threat assessment".into(),
                    agent_prompt: "Compile all security findings into a threat assessment report \
                         with risk ratings and recommended defensive actions."
                        .into(),
                    required_tools: vec![],
                },
            ],
        }
    }

    /// Brand protection pipeline.
    pub fn brand_protection(brand: &str) -> Self {
        Self {
            kind: PipelineKind::BrandProtection,
            name: format!("Brand Protection: {brand}"),
            description: format!("Monitor and protect the {brand} brand"),
            steps: vec![
                PipelineStep {
                    name: "Brand Domain Generation".into(),
                    description: "Generate domains that could infringe the brand".into(),
                    agent_prompt: format!(
                        "Generate domain names that could be used to impersonate the '{brand}' brand. \
                         Include typosquats, homoglyphs, and common TLD variations."
                    ),
                    required_tools: vec!["generate_domains".into(), "generate_typosquats".into()],
                },
                PipelineStep {
                    name: "Registration Check".into(),
                    description: "Check which infringing domains are registered".into(),
                    agent_prompt: "Check which of the generated domains are currently registered. \
                         For registered domains, retrieve WHOIS data."
                        .into(),
                    required_tools: vec!["bulk_whois".into()],
                },
                PipelineStep {
                    name: "Enforcement Report".into(),
                    description: "Generate brand protection report".into(),
                    agent_prompt: "Produce a brand protection report including: list of infringing \
                         domains, registrant analysis, risk assessment, and recommended actions \
                         (UDRP, takedown, defensive registration)."
                        .into(),
                    required_tools: vec![],
                },
            ],
        }
    }

    /// Drop watch pipeline.
    pub fn drop_watch() -> Self {
        Self {
            kind: PipelineKind::DropWatch,
            name: "Drop Watch".into(),
            description: "Monitor domains approaching expiry for drop-catching".into(),
            steps: vec![
                PipelineStep {
                    name: "Expiry Scan".into(),
                    description: "Scan domains for upcoming expiry".into(),
                    agent_prompt: "Scan the provided domain list for expiry dates. \
                         Identify domains expiring within the next 30 days."
                        .into(),
                    required_tools: vec!["bulk_whois".into(), "check_expiry".into()],
                },
                PipelineStep {
                    name: "Value Assessment".into(),
                    description: "Assess potential value of expiring domains".into(),
                    agent_prompt: "Assess the potential value of domains approaching expiry. \
                         Consider domain length, keywords, TLD, and search potential."
                        .into(),
                    required_tools: vec!["domain_stats".into()],
                },
                PipelineStep {
                    name: "Drop Watch Report".into(),
                    description: "Generate drop-catching report".into(),
                    agent_prompt: "Generate a drop-watching report with: domains sorted by \
                         expiry date, estimated value, and recommended catch priorities."
                        .into(),
                    required_tools: vec![],
                },
            ],
        }
    }

    /// List all available pipeline kinds with descriptions.
    pub fn catalog() -> Vec<(PipelineKind, &'static str, &'static str)> {
        vec![
            (
                PipelineKind::DomainAudit,
                "Domain Audit",
                "Comprehensive WHOIS, DNS, and security analysis for a single domain",
            ),
            (
                PipelineKind::PortfolioAnalysis,
                "Portfolio Analysis",
                "Bulk analysis and health check for a domain portfolio",
            ),
            (
                PipelineKind::SecurityScan,
                "Security Scan",
                "Typosquat and homoglyph threat detection",
            ),
            (
                PipelineKind::BrandProtection,
                "Brand Protection",
                "Monitor and identify brand-infringing domains",
            ),
            (
                PipelineKind::DropWatch,
                "Drop Watch",
                "Monitor expiring domains for drop-catching opportunities",
            ),
        ]
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_domain_audit_pipeline() {
        let p = Pipeline::domain_audit("example.com");
        assert_eq!(p.kind, PipelineKind::DomainAudit);
        assert!(p.steps.len() >= 3);
        assert!(p.name.contains("example.com"));
    }

    #[test]
    fn test_portfolio_pipeline() {
        let p = Pipeline::portfolio_analysis();
        assert_eq!(p.kind, PipelineKind::PortfolioAnalysis);
        assert!(p.steps.len() >= 2);
    }

    #[test]
    fn test_security_scan_pipeline() {
        let p = Pipeline::security_scan("test.com");
        assert!(p.steps.iter().any(|s| s.required_tools.contains(&"generate_typosquats".to_string())));
    }

    #[test]
    fn test_brand_protection_pipeline() {
        let p = Pipeline::brand_protection("MyBrand");
        assert!(p.name.contains("MyBrand"));
        assert!(p.steps.len() >= 3);
    }

    #[test]
    fn test_drop_watch_pipeline() {
        let p = Pipeline::drop_watch();
        assert_eq!(p.kind, PipelineKind::DropWatch);
    }

    #[test]
    fn test_catalog() {
        let catalog = Pipeline::catalog();
        assert_eq!(catalog.len(), 5);
    }

    #[test]
    fn test_pipeline_kind_display() {
        assert_eq!(PipelineKind::DomainAudit.to_string(), "Domain Audit");
        assert_eq!(PipelineKind::DropWatch.to_string(), "Drop Watch");
    }

    #[test]
    fn test_pipeline_steps_have_prompts() {
        let p = Pipeline::domain_audit("x.com");
        for step in &p.steps {
            assert!(!step.name.is_empty());
            assert!(!step.agent_prompt.is_empty());
        }
    }
}
