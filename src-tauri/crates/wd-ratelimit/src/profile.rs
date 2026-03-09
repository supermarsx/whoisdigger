use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Rate limit profile for a specific WHOIS/RDAP server.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ServerProfile {
    /// The WHOIS server hostname (e.g., "whois.verisign-grs.com").
    pub server: String,
    /// Maximum requests per minute.
    pub max_rpm: u32,
    /// Recommended minimum delay between requests in milliseconds.
    pub min_delay_ms: u64,
    /// How many consecutive rate limit hits before backing off.
    pub backoff_threshold: u32,
    /// Whether this server is known to be strict.
    pub strict: bool,
    /// Optional TLD this profile applies to.
    pub tld: Option<String>,
    /// Notes about the server's behaviour.
    pub notes: Option<String>,
}

impl ServerProfile {
    pub fn new(server: impl Into<String>, max_rpm: u32, min_delay_ms: u64) -> Self {
        Self {
            server: server.into(),
            max_rpm,
            min_delay_ms,
            backoff_threshold: 3,
            strict: false,
            tld: None,
            notes: None,
        }
    }

    pub fn strict(mut self) -> Self {
        self.strict = true;
        self
    }

    pub fn with_tld(mut self, tld: impl Into<String>) -> Self {
        self.tld = Some(tld.into());
        self
    }
}

/// Registry of known WHOIS server profiles.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ServerRegistry {
    profiles: HashMap<String, ServerProfile>,
}

impl ServerRegistry {
    pub fn new() -> Self {
        Self {
            profiles: HashMap::new(),
        }
    }

    /// Load the built-in set of known server profiles.
    pub fn with_defaults() -> Self {
        let mut reg = Self::new();
        for profile in builtin_profiles() {
            reg.add(profile);
        }
        reg
    }

    /// Add or update a profile.
    pub fn add(&mut self, profile: ServerProfile) {
        self.profiles.insert(profile.server.to_lowercase(), profile);
    }

    /// Get a profile by server hostname.
    pub fn get(&self, server: &str) -> Option<&ServerProfile> {
        self.profiles.get(&server.to_lowercase())
    }

    /// Get profile for a TLD (looks up by TLD field).
    pub fn get_by_tld(&self, tld: &str) -> Option<&ServerProfile> {
        let tld_lower = tld.to_lowercase().trim_start_matches('.').to_string();
        self.profiles
            .values()
            .find(|p| p.tld.as_deref().map(|t| t.trim_start_matches('.')) == Some(&tld_lower))
    }

    /// Get the recommended delay for a server in ms.
    pub fn recommended_delay(&self, server: &str) -> u64 {
        self.get(server).map(|p| p.min_delay_ms).unwrap_or(1000)
    }

    /// List all servers.
    pub fn list_servers(&self) -> Vec<&str> {
        self.profiles.keys().map(|s| s.as_str()).collect()
    }

    pub fn len(&self) -> usize {
        self.profiles.len()
    }
    pub fn is_empty(&self) -> bool {
        self.profiles.is_empty()
    }
}

/// Built-in profiles for well-known WHOIS servers.
fn builtin_profiles() -> Vec<ServerProfile> {
    vec![
        ServerProfile::new("whois.verisign-grs.com", 60, 1000).with_tld("com"),
        ServerProfile::new("whois.nic.io", 30, 2000)
            .with_tld("io")
            .strict(),
        ServerProfile::new("whois.nic.me", 30, 2000).with_tld("me"),
        ServerProfile::new("whois.donuts.co", 30, 2000),
        ServerProfile::new("whois.nic.cc", 30, 2000).with_tld("cc"),
        ServerProfile::new("whois.nic.tv", 30, 2000).with_tld("tv"),
        ServerProfile::new("whois.afilias.net", 60, 1000).with_tld("info"),
        ServerProfile::new("whois.nic.ai", 20, 3000)
            .with_tld("ai")
            .strict(),
        ServerProfile::new("whois.nic.co", 30, 2000).with_tld("co"),
        ServerProfile::new("whois.pir.org", 60, 1000).with_tld("org"),
        ServerProfile::new("whois.educause.edu", 10, 6000)
            .with_tld("edu")
            .strict(),
        ServerProfile::new("whois.ripe.net", 60, 1000),
        ServerProfile::new("whois.arin.net", 30, 2000),
        ServerProfile::new("whois.apnic.net", 30, 2000),
        ServerProfile::new("whois.uniregistry.net", 10, 6000).strict(),
        ServerProfile::new("whois.nic.dev", 30, 2000).with_tld("dev"),
        ServerProfile::new("whois.nic.app", 30, 2000).with_tld("app"),
    ]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_profiles_loaded() {
        let reg = ServerRegistry::with_defaults();
        assert!(reg.len() >= 15);
        assert!(reg.get("whois.verisign-grs.com").is_some());
    }

    #[test]
    fn test_get_by_tld() {
        let reg = ServerRegistry::with_defaults();
        let profile = reg.get_by_tld("com").unwrap();
        assert_eq!(profile.server, "whois.verisign-grs.com");
    }

    #[test]
    fn test_get_by_tld_with_dot() {
        let reg = ServerRegistry::with_defaults();
        assert!(reg.get_by_tld(".io").is_some());
    }

    #[test]
    fn test_recommended_delay() {
        let reg = ServerRegistry::with_defaults();
        assert_eq!(reg.recommended_delay("whois.verisign-grs.com"), 1000);
        assert_eq!(reg.recommended_delay("unknown.server"), 1000); // default
    }

    #[test]
    fn test_add_custom_profile() {
        let mut reg = ServerRegistry::new();
        reg.add(ServerProfile::new("custom.whois.com", 10, 5000));
        assert_eq!(reg.get("custom.whois.com").unwrap().max_rpm, 10);
    }

    #[test]
    fn test_strict_servers() {
        let reg = ServerRegistry::with_defaults();
        let io = reg.get("whois.nic.io").unwrap();
        assert!(io.strict);
        let com = reg.get("whois.verisign-grs.com").unwrap();
        assert!(!com.strict);
    }
}
