use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A registrar provider.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Registrar {
    pub id: String,
    pub name: String,
    pub website: String,
    pub api_url: Option<String>,
    pub capabilities: Vec<RegistrarCapability>,
    /// Whether this registrar has an official API.
    pub has_api: bool,
    /// Whether we support direct purchase flow.
    pub purchase_supported: bool,
    /// Affiliate program ID.
    pub affiliate_id: Option<String>,
}

/// Capabilities that a registrar may support.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RegistrarCapability {
    Registration,
    Transfer,
    Renewal,
    DnsManagement,
    WhoisPrivacy,
    BulkOperations,
    ApiAccess,
    AutoRenew,
    DnsSec,
    EmailForwarding,
    UrlForwarding,
}

/// Registry of known registrars.
#[derive(Debug, Default)]
pub struct RegistrarRegistry {
    registrars: HashMap<String, Registrar>,
}

impl RegistrarRegistry {
    pub fn new() -> Self {
        Self {
            registrars: HashMap::new(),
        }
    }

    /// Load built-in registrar profiles.
    pub fn with_defaults() -> Self {
        let mut reg = Self::new();
        for r in builtin_registrars() {
            reg.add(r);
        }
        reg
    }

    pub fn add(&mut self, registrar: Registrar) {
        self.registrars.insert(registrar.id.clone(), registrar);
    }

    pub fn get(&self, id: &str) -> Option<&Registrar> {
        self.registrars.get(id)
    }

    pub fn list(&self) -> Vec<&Registrar> {
        self.registrars.values().collect()
    }

    /// Registrars supporting a specific capability.
    pub fn with_capability(&self, cap: &RegistrarCapability) -> Vec<&Registrar> {
        self.registrars
            .values()
            .filter(|r| r.capabilities.contains(cap))
            .collect()
    }

    /// Registrars with API access.
    pub fn with_api(&self) -> Vec<&Registrar> {
        self.registrars.values().filter(|r| r.has_api).collect()
    }

    pub fn len(&self) -> usize {
        self.registrars.len()
    }
    pub fn is_empty(&self) -> bool {
        self.registrars.is_empty()
    }
}

fn builtin_registrars() -> Vec<Registrar> {
    vec![
        Registrar {
            id: "namecheap".into(),
            name: "Namecheap".into(),
            website: "https://www.namecheap.com".into(),
            api_url: Some("https://api.namecheap.com/xml.response".into()),
            capabilities: vec![
                RegistrarCapability::Registration,
                RegistrarCapability::Transfer,
                RegistrarCapability::Renewal,
                RegistrarCapability::DnsManagement,
                RegistrarCapability::WhoisPrivacy,
                RegistrarCapability::BulkOperations,
                RegistrarCapability::ApiAccess,
                RegistrarCapability::AutoRenew,
            ],
            has_api: true,
            purchase_supported: true,
            affiliate_id: None,
        },
        Registrar {
            id: "cloudflare".into(),
            name: "Cloudflare Registrar".into(),
            website: "https://www.cloudflare.com/products/registrar/".into(),
            api_url: Some("https://api.cloudflare.com/client/v4/".into()),
            capabilities: vec![
                RegistrarCapability::Registration,
                RegistrarCapability::Transfer,
                RegistrarCapability::DnsManagement,
                RegistrarCapability::DnsSec,
                RegistrarCapability::ApiAccess,
                RegistrarCapability::AutoRenew,
            ],
            has_api: true,
            purchase_supported: true,
            affiliate_id: None,
        },
        Registrar {
            id: "godaddy".into(),
            name: "GoDaddy".into(),
            website: "https://www.godaddy.com".into(),
            api_url: Some("https://api.godaddy.com/v1/".into()),
            capabilities: vec![
                RegistrarCapability::Registration,
                RegistrarCapability::Transfer,
                RegistrarCapability::Renewal,
                RegistrarCapability::DnsManagement,
                RegistrarCapability::WhoisPrivacy,
                RegistrarCapability::BulkOperations,
                RegistrarCapability::ApiAccess,
                RegistrarCapability::AutoRenew,
                RegistrarCapability::EmailForwarding,
                RegistrarCapability::UrlForwarding,
            ],
            has_api: true,
            purchase_supported: true,
            affiliate_id: None,
        },
        Registrar {
            id: "porkbun".into(),
            name: "Porkbun".into(),
            website: "https://porkbun.com".into(),
            api_url: Some("https://api.porkbun.com/api/json/v3/".into()),
            capabilities: vec![
                RegistrarCapability::Registration,
                RegistrarCapability::Transfer,
                RegistrarCapability::Renewal,
                RegistrarCapability::DnsManagement,
                RegistrarCapability::WhoisPrivacy,
                RegistrarCapability::ApiAccess,
                RegistrarCapability::AutoRenew,
                RegistrarCapability::DnsSec,
            ],
            has_api: true,
            purchase_supported: true,
            affiliate_id: None,
        },
        Registrar {
            id: "dynadot".into(),
            name: "Dynadot".into(),
            website: "https://www.dynadot.com".into(),
            api_url: Some("https://api.dynadot.com/api3.xml".into()),
            capabilities: vec![
                RegistrarCapability::Registration,
                RegistrarCapability::Transfer,
                RegistrarCapability::Renewal,
                RegistrarCapability::DnsManagement,
                RegistrarCapability::ApiAccess,
                RegistrarCapability::BulkOperations,
            ],
            has_api: true,
            purchase_supported: true,
            affiliate_id: None,
        },
        Registrar {
            id: "gandi".into(),
            name: "Gandi".into(),
            website: "https://www.gandi.net".into(),
            api_url: Some("https://api.gandi.net/v5/".into()),
            capabilities: vec![
                RegistrarCapability::Registration,
                RegistrarCapability::Transfer,
                RegistrarCapability::Renewal,
                RegistrarCapability::DnsManagement,
                RegistrarCapability::WhoisPrivacy,
                RegistrarCapability::ApiAccess,
                RegistrarCapability::EmailForwarding,
            ],
            has_api: true,
            purchase_supported: true,
            affiliate_id: None,
        },
        Registrar {
            id: "google".into(),
            name: "Google Domains (Squarespace)".into(),
            website: "https://domains.squarespace.com".into(),
            api_url: None,
            capabilities: vec![
                RegistrarCapability::Registration,
                RegistrarCapability::Transfer,
                RegistrarCapability::DnsManagement,
                RegistrarCapability::WhoisPrivacy,
                RegistrarCapability::AutoRenew,
            ],
            has_api: false,
            purchase_supported: false,
            affiliate_id: None,
        },
    ]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_registrars() {
        let reg = RegistrarRegistry::with_defaults();
        assert!(reg.len() >= 7);
    }

    #[test]
    fn test_get_registrar() {
        let reg = RegistrarRegistry::with_defaults();
        let nc = reg.get("namecheap").unwrap();
        assert_eq!(nc.name, "Namecheap");
        assert!(nc.has_api);
    }

    #[test]
    fn test_with_api() {
        let reg = RegistrarRegistry::with_defaults();
        let api_regs = reg.with_api();
        assert!(api_regs.len() >= 5);
    }

    #[test]
    fn test_with_capability() {
        let reg = RegistrarRegistry::with_defaults();
        let bulk = reg.with_capability(&RegistrarCapability::BulkOperations);
        assert!(bulk.len() >= 2);
    }
}
