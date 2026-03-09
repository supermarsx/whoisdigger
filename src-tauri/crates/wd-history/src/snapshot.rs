use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Protocol that produced a record.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum LookupProtocol {
    Whois,
    Rdap,
    Dns,
}

impl std::fmt::Display for LookupProtocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Whois => write!(f, "whois"),
            Self::Rdap => write!(f, "rdap"),
            Self::Dns => write!(f, "dns"),
        }
    }
}

/// A point-in-time record of a domain's WHOIS / RDAP data.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Snapshot {
    /// Unique snapshot identifier (UUID-style or auto-increment).
    pub id: Option<i64>,
    /// The domain name this snapshot belongs to.
    pub domain: String,
    /// Which protocol produced this snapshot.
    pub protocol: LookupProtocol,
    /// When the snapshot was captured (wall-clock).
    pub captured_at: DateTime<Utc>,
    /// Raw WHOIS / RDAP text response.
    pub raw_response: String,
    /// Parsed key-value fields extracted from the raw response.
    /// Keys are normalised (lowercased, trimmed).
    pub fields: HashMap<String, String>,
    /// Registrar name (extracted convenience field).
    pub registrar: Option<String>,
    /// Nameservers at time of capture.
    pub nameservers: Vec<String>,
    /// Domain status codes (e.g. `clientDeleteProhibited`).
    pub status_codes: Vec<String>,
    /// Registration date if parseable.
    pub created_date: Option<DateTime<Utc>>,
    /// Expiry date if parseable.
    pub expiry_date: Option<DateTime<Utc>>,
    /// Last updated date if parseable.
    pub updated_date: Option<DateTime<Utc>>,
    /// Optional tags for user-level categorisation.
    #[serde(default)]
    pub tags: Vec<String>,
}

impl Snapshot {
    /// Create a minimal snapshot.
    pub fn new(
        domain: impl Into<String>,
        protocol: LookupProtocol,
        raw: impl Into<String>,
    ) -> Self {
        Self {
            id: None,
            domain: domain.into(),
            protocol,
            captured_at: Utc::now(),
            raw_response: raw.into(),
            fields: HashMap::new(),
            registrar: None,
            nameservers: Vec::new(),
            status_codes: Vec::new(),
            created_date: None,
            expiry_date: None,
            updated_date: None,
            tags: Vec::new(),
        }
    }

    /// Set a parsed field.
    pub fn with_field(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.fields.insert(key.into().to_lowercase(), value.into());
        self
    }

    /// Set registrar.
    pub fn with_registrar(mut self, registrar: impl Into<String>) -> Self {
        self.registrar = Some(registrar.into());
        self
    }

    /// Set nameservers.
    pub fn with_nameservers(mut self, ns: Vec<String>) -> Self {
        self.nameservers = ns;
        self
    }

    /// Set status codes.
    pub fn with_status_codes(mut self, codes: Vec<String>) -> Self {
        self.status_codes = codes;
        self
    }

    /// Set expiry date.
    pub fn with_expiry(mut self, dt: DateTime<Utc>) -> Self {
        self.expiry_date = Some(dt);
        self
    }

    /// Get a field value by normalised key.
    pub fn get_field(&self, key: &str) -> Option<&str> {
        self.fields.get(&key.to_lowercase()).map(|s| s.as_str())
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_snapshot_new() {
        let snap = Snapshot::new("example.com", LookupProtocol::Whois, "raw text");
        assert_eq!(snap.domain, "example.com");
        assert_eq!(snap.protocol, LookupProtocol::Whois);
        assert_eq!(snap.raw_response, "raw text");
        assert!(snap.fields.is_empty());
    }

    #[test]
    fn test_snapshot_with_fields() {
        let snap = Snapshot::new("test.io", LookupProtocol::Rdap, "")
            .with_field("Registrar", "Example Inc")
            .with_registrar("Example Inc")
            .with_nameservers(vec!["ns1.example.com".into(), "ns2.example.com".into()])
            .with_status_codes(vec!["clientDeleteProhibited".into()]);
        assert_eq!(snap.get_field("registrar"), Some("Example Inc"));
        assert_eq!(snap.registrar.as_deref(), Some("Example Inc"));
        assert_eq!(snap.nameservers.len(), 2);
        assert_eq!(snap.status_codes.len(), 1);
    }

    #[test]
    fn test_protocol_display() {
        assert_eq!(LookupProtocol::Whois.to_string(), "whois");
        assert_eq!(LookupProtocol::Rdap.to_string(), "rdap");
        assert_eq!(LookupProtocol::Dns.to_string(), "dns");
    }

    #[test]
    fn test_snapshot_serialization_roundtrip() {
        let snap = Snapshot::new("x.com", LookupProtocol::Whois, "raw").with_field("key", "value");
        let json = serde_json::to_string(&snap).unwrap();
        let deser: Snapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(deser.domain, "x.com");
        assert_eq!(deser.get_field("key"), Some("value"));
    }
}
