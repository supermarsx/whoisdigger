use serde::{Deserialize, Serialize};

/// The kind of persona that drives the chat's behaviour.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PersonaKind {
    DomainExpert,
    WhoisAnalyst,
    SecurityResearcher,
    DomainInvestor,
    DnsEngineer,
    BrandProtection,
    GeneralAssistant,
    Custom(String),
}

impl Default for PersonaKind {
    fn default() -> Self {
        Self::GeneralAssistant
    }
}

impl std::fmt::Display for PersonaKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DomainExpert => write!(f, "Domain Expert"),
            Self::WhoisAnalyst => write!(f, "WHOIS Analyst"),
            Self::SecurityResearcher => write!(f, "Security Researcher"),
            Self::DomainInvestor => write!(f, "Domain Investor"),
            Self::DnsEngineer => write!(f, "DNS Engineer"),
            Self::BrandProtection => write!(f, "Brand Protection"),
            Self::GeneralAssistant => write!(f, "General Assistant"),
            Self::Custom(name) => write!(f, "Custom ({name})"),
        }
    }
}

/// A fully-described persona, combining kind, display info, and optional icon.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Persona {
    pub kind: PersonaKind,
    pub name: String,
    pub description: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

impl Persona {
    /// Build a persona with default metadata from its kind.
    pub fn from_kind(kind: PersonaKind) -> Self {
        let (name, description, icon): (&str, &str, &str) = match &kind {
            PersonaKind::DomainExpert => (
                "Domain Expert",
                "Deep knowledge of DNS, registrars, and domain lifecycle",
                "🌐",
            ),
            PersonaKind::WhoisAnalyst => (
                "WHOIS Analyst",
                "Parses and interprets WHOIS records",
                "🔍",
            ),
            PersonaKind::SecurityResearcher => (
                "Security Researcher",
                "Threat analysis, phishing detection, DGA identification",
                "🛡️",
            ),
            PersonaKind::DomainInvestor => (
                "Domain Investor",
                "Domain valuation, aftermarket trends, portfolio advice",
                "💰",
            ),
            PersonaKind::DnsEngineer => (
                "DNS Engineer",
                "DNS protocols, record types, troubleshooting",
                "⚙️",
            ),
            PersonaKind::BrandProtection => (
                "Brand Protection",
                "Cybersquatting detection, UDRP, defensive registration",
                "🏷️",
            ),
            PersonaKind::GeneralAssistant => (
                "General Assistant",
                "General-purpose domain intelligence helper",
                "🤖",
            ),
            PersonaKind::Custom(s) => {
                let name = format!("Custom ({s})");
                return Self {
                    kind,
                    name,
                    description: "User-defined persona".to_string(),
                    icon: Some("✨".to_string()),
                };
            }
        };
        Self {
            kind,
            name: name.to_string(),
            description: description.to_string(),
            icon: Some(icon.to_string()),
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_persona_from_kind() {
        let p = Persona::from_kind(PersonaKind::DomainExpert);
        assert_eq!(p.name, "Domain Expert");
        assert!(p.icon.is_some());
    }

    #[test]
    fn test_persona_custom() {
        let p = Persona::from_kind(PersonaKind::Custom("pirate mode".into()));
        assert!(p.name.contains("pirate mode"));
    }

    #[test]
    fn test_persona_kind_display() {
        assert_eq!(PersonaKind::WhoisAnalyst.to_string(), "WHOIS Analyst");
        assert_eq!(
            PersonaKind::Custom("x".into()).to_string(),
            "Custom (x)"
        );
    }

    #[test]
    fn test_persona_kind_default() {
        assert_eq!(PersonaKind::default(), PersonaKind::GeneralAssistant);
    }

    #[test]
    fn test_persona_serde() {
        let p = Persona::from_kind(PersonaKind::DnsEngineer);
        let j = serde_json::to_string(&p).unwrap();
        let p2: Persona = serde_json::from_str(&j).unwrap();
        assert_eq!(p2.kind, PersonaKind::DnsEngineer);
    }

    #[test]
    fn test_all_kinds_produce_persona() {
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
            let p = Persona::from_kind(k);
            assert!(!p.name.is_empty());
            assert!(!p.description.is_empty());
        }
    }
}
