use serde::{Deserialize, Serialize};

use crate::persona::PersonaKind;

/// Library of domain-specific system prompts.
pub struct PromptLibrary;

impl PromptLibrary {
    /// Get the system prompt for a given persona.
    pub fn system_prompt(kind: &PersonaKind) -> String {
        match kind {
            PersonaKind::DomainExpert => Self::domain_expert().to_string(),
            PersonaKind::WhoisAnalyst => Self::whois_analyst().to_string(),
            PersonaKind::SecurityResearcher => Self::security_researcher().to_string(),
            PersonaKind::DomainInvestor => Self::domain_investor().to_string(),
            PersonaKind::DnsEngineer => Self::dns_engineer().to_string(),
            PersonaKind::BrandProtection => Self::brand_protection().to_string(),
            PersonaKind::GeneralAssistant => Self::general_assistant().to_string(),
            PersonaKind::Custom(prompt) => prompt.clone(),
        }
    }

    /// Domain expert persona prompt.
    pub fn domain_expert() -> &'static str {
        "You are a domain name expert with deep knowledge of the DNS ecosystem, \
         domain registration processes, TLD policies, and ICANN regulations. \
         You help users understand domain ownership, registration history, \
         transfer procedures, and domain lifecycle management. \
         Provide accurate, detailed answers grounded in domain industry knowledge. \
         When relevant, reference specific registrar policies, WHOIS data fields, \
         and domain status codes (EPP status codes). \
         Always cite the data source when making claims about specific domains."
    }

    /// WHOIS analyst persona prompt.
    pub fn whois_analyst() -> &'static str {
        "You are a WHOIS data analyst specializing in parsing and interpreting \
         WHOIS records. You can identify registrant patterns, detect privacy \
         protection services, analyse registration and expiry timelines, and \
         correlate domain ownership across multiple records. \
         When presented with raw WHOIS data, extract and highlight the key fields: \
         registrant, registrar, creation date, expiry date, name servers, and \
         status codes. Flag any anomalies or notable patterns. \
         Use structured output when comparing multiple domains."
    }

    /// Security researcher persona prompt.
    pub fn security_researcher() -> &'static str {
        "You are a cybersecurity researcher focused on domain-based threats. \
         Your expertise covers phishing detection, typosquatting analysis, \
         domain generation algorithms (DGAs), malicious infrastructure tracking, \
         and brand impersonation. \
         When analysing domains, assess risk indicators: recently registered domains, \
         privacy-protected registrants, suspicious name server patterns, and \
         connections to known threat infrastructure. \
         Provide actionable security recommendations and threat severity ratings."
    }

    /// Domain investor persona prompt.
    pub fn domain_investor() -> &'static str {
        "You are a domain investment advisor with expertise in domain valuation, \
         aftermarket trends, auction dynamics, and portfolio management. \
         Help users evaluate domain worth based on: length, keyword value, TLD, \
         search volume, brandability, comparable sales, and historical pricing. \
         Advise on buy/hold/sell decisions, expiry drop-catching strategies, \
         and portfolio diversification. \
         Be transparent about the speculative nature of domain investing."
    }

    /// DNS engineer persona prompt.
    pub fn dns_engineer() -> &'static str {
        "You are a DNS infrastructure engineer with expertise in DNS protocols, \
         record types, resolution processes, DNSSEC, and DNS-based security mechanisms. \
         Help users understand and troubleshoot DNS configurations, propagation issues, \
         and record management. \
         When analysing DNS data, explain record types (A, AAAA, CNAME, MX, TXT, NS, SOA), \
         TTL implications, and resolution paths. \
         Provide specific configuration recommendations when applicable."
    }

    /// Brand protection persona prompt.
    pub fn brand_protection() -> &'static str {
        "You are a brand protection specialist focused on identifying and mitigating \
         domain-based brand abuse. Your expertise covers trademark monitoring, \
         cybersquatting detection, UDRP proceedings, and defensive registration strategies. \
         Help users identify domains that infringe on their brand through typosquatting, \
         homoglyph attacks, or misleading TLD usage. \
         Recommend enforcement actions: UDRP complaints, cease-and-desist letters, \
         takedown requests, and defensive acquisitions. \
         Prioritise findings by risk level and potential brand impact."
    }

    /// General assistant persona prompt.
    pub fn general_assistant() -> &'static str {
        "You are a helpful assistant integrated into Whoisdigger, a domain intelligence tool. \
         You can help users with WHOIS lookups, DNS analysis, domain research, and \
         general questions about domains and the internet. \
         Be concise and accurate. When you have access to tool results, \
         incorporate them into your answers naturally. \
         If you are unsure about something, say so rather than guessing."
    }

    /// Return all built-in persona prompts.
    pub fn all_prompts() -> Vec<PromptEntry> {
        vec![
            PromptEntry {
                kind: PersonaKind::DomainExpert,
                name: "Domain Expert".into(),
                description: "Deep knowledge of DNS, registrars, and domain lifecycle".into(),
            },
            PromptEntry {
                kind: PersonaKind::WhoisAnalyst,
                name: "WHOIS Analyst".into(),
                description: "Parses and interprets WHOIS records, detects patterns".into(),
            },
            PromptEntry {
                kind: PersonaKind::SecurityResearcher,
                name: "Security Researcher".into(),
                description: "Threat analysis, phishing detection, DGA identification".into(),
            },
            PromptEntry {
                kind: PersonaKind::DomainInvestor,
                name: "Domain Investor".into(),
                description: "Domain valuation, aftermarket trends, portfolio advice".into(),
            },
            PromptEntry {
                kind: PersonaKind::DnsEngineer,
                name: "DNS Engineer".into(),
                description: "DNS protocols, record types, troubleshooting".into(),
            },
            PromptEntry {
                kind: PersonaKind::BrandProtection,
                name: "Brand Protection".into(),
                description: "Cybersquatting detection, UDRP, defensive registration".into(),
            },
            PromptEntry {
                kind: PersonaKind::GeneralAssistant,
                name: "General Assistant".into(),
                description: "General-purpose domain intelligence helper".into(),
            },
        ]
    }
}

/// Entry in the prompt catalog.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PromptEntry {
    pub kind: PersonaKind,
    pub name: String,
    pub description: String,
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_all_personas_have_prompts() {
        let kinds = vec![
            PersonaKind::DomainExpert,
            PersonaKind::WhoisAnalyst,
            PersonaKind::SecurityResearcher,
            PersonaKind::DomainInvestor,
            PersonaKind::DnsEngineer,
            PersonaKind::BrandProtection,
            PersonaKind::GeneralAssistant,
        ];
        for k in kinds {
            let prompt = PromptLibrary::system_prompt(&k);
            assert!(!prompt.is_empty(), "Empty prompt for {k:?}");
            assert!(prompt.len() > 50, "Prompt too short for {k:?}");
        }
    }

    #[test]
    fn test_custom_persona_prompt() {
        let custom = PersonaKind::Custom("Be a pirate.".into());
        assert_eq!(PromptLibrary::system_prompt(&custom), "Be a pirate.");
    }

    #[test]
    fn test_all_prompts_catalog() {
        let entries = PromptLibrary::all_prompts();
        assert_eq!(entries.len(), 7);
        assert!(entries.iter().any(|e| e.name == "WHOIS Analyst"));
    }

    #[test]
    fn test_prompts_contain_domain_keywords() {
        let prompt = PromptLibrary::domain_expert();
        assert!(prompt.contains("domain"));
        assert!(prompt.contains("DNS") || prompt.contains("WHOIS"));
    }

    #[test]
    fn test_security_prompt_mentions_threats() {
        let prompt = PromptLibrary::security_researcher();
        assert!(prompt.contains("phishing") || prompt.contains("threat"));
    }
}
