use serde::{Deserialize, Serialize};
use std::net::IpAddr;

// ─── ProxyInfo ───────────────────────────────────────────────────────────────

/// Parsed proxy endpoint, ready for use in network requests.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProxyInfo {
    pub ipaddress: String,
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auth: Option<ProxyAuth>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct ProxyAuth {
    pub username: String,
    pub password: String,
}

impl ProxyInfo {
    /// Produce a key string like `1.2.3.4:8080` or `[::1]:8080`.
    pub fn key(&self) -> String {
        if self.ipaddress.contains(':') {
            format!("[{}]:{}", self.ipaddress, self.port)
        } else {
            format!("{}:{}", self.ipaddress, self.port)
        }
    }

    /// Format as a SOCKS5/HTTP proxy URL.
    pub fn to_url(&self, scheme: &str) -> String {
        if let Some(ref auth) = self.auth {
            format!(
                "{}://{}:{}@{}",
                scheme,
                auth.username,
                auth.password,
                self.key()
            )
        } else {
            format!("{}://{}", scheme, self.key())
        }
    }
}

// ─── Proxy Settings ──────────────────────────────────────────────────────────

/// Mirrors the frontend proxy settings structure.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ProxySettings {
    pub enable: bool,
    #[serde(default)]
    pub mode: ProxyMode,
    #[serde(default)]
    pub multimode: ProxyMultiMode,
    /// Single proxy string (used when `mode == "single"`).
    pub single: Option<String>,
    /// Proxy list (used when `mode == "multi"`).
    #[serde(default)]
    pub list: Vec<ProxyEntry>,
    /// Default username for proxies without inline auth.
    pub username: Option<String>,
    /// Default password for proxies without inline auth.
    pub password: Option<String>,
    /// Maximum consecutive failures before skipping a proxy.
    pub retries: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyMode {
    #[default]
    Single,
    Multi,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProxyMultiMode {
    #[default]
    Ascending,
    Descending,
    Random,
}

/// A proxy list entry — either a plain string or an object with auth.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(untagged)]
pub enum ProxyEntry {
    Plain(String),
    WithAuth {
        proxy: String,
        username: Option<String>,
        password: Option<String>,
    },
}

// ─── Proxy Parsing ───────────────────────────────────────────────────────────

/// Parse a proxy entry into a `ProxyInfo`.  Supports formats:
/// - `ip:port`
/// - `user:pass@ip:port`
/// - `[ipv6]:port`
/// - `user:pass@[ipv6]:port`
pub fn parse_proxy_entry(
    entry: &ProxyEntry,
    default_user: Option<&str>,
    default_pass: Option<&str>,
) -> Option<ProxyInfo> {
    let (host_port, auth_user, auth_pass) = match entry {
        ProxyEntry::Plain(s) => (s.as_str(), default_user, default_pass),
        ProxyEntry::WithAuth {
            proxy,
            username,
            password,
        } => (
            proxy.as_str(),
            username.as_deref().or(default_user),
            password.as_deref().or(default_pass),
        ),
    };

    let (host_port, user, pass) = if host_port.contains('@') {
        let parts: Vec<&str> = host_port.splitn(2, '@').collect();
        let auth_parts: Vec<&str> = parts[0].splitn(2, ':').collect();
        if auth_parts.len() == 2 {
            (parts[1], Some(auth_parts[0]), Some(auth_parts[1]))
        } else {
            (parts[1], auth_user, auth_pass)
        }
    } else {
        (host_port, auth_user, auth_pass)
    };

    let (ip, port_str) = if host_port.starts_with('[') {
        let end = host_port.find(']')?;
        let ip = &host_port[1..end];
        let rest = &host_port[end + 1..];
        if !rest.starts_with(':') {
            return None;
        }
        (ip, &rest[1..])
    } else {
        let parts: Vec<&str> = host_port.splitn(2, ':').collect();
        if parts.len() != 2 {
            return None;
        }
        (parts[0], parts[1])
    };

    let port: u16 = port_str.parse().ok()?;
    if port == 0 {
        return None;
    }

    // Validate IP address
    ip.parse::<IpAddr>().ok()?;

    let auth = match (user, pass) {
        (Some(u), Some(p)) if !u.is_empty() && !p.is_empty() => Some(ProxyAuth {
            username: u.to_string(),
            password: p.to_string(),
        }),
        _ => None,
    };

    Some(ProxyInfo {
        ipaddress: ip.to_string(),
        port,
        auth,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_plain_ipv4() {
        let entry = ProxyEntry::Plain("1.2.3.4:8080".into());
        let info = parse_proxy_entry(&entry, None, None).unwrap();
        assert_eq!(info.ipaddress, "1.2.3.4");
        assert_eq!(info.port, 8080);
        assert!(info.auth.is_none());
    }

    #[test]
    fn test_parse_plain_ipv6() {
        let entry = ProxyEntry::Plain("[::1]:443".into());
        let info = parse_proxy_entry(&entry, None, None).unwrap();
        assert_eq!(info.ipaddress, "::1");
        assert_eq!(info.port, 443);
    }

    #[test]
    fn test_parse_with_inline_auth() {
        let entry = ProxyEntry::Plain("user:pass@10.0.0.1:3128".into());
        let info = parse_proxy_entry(&entry, None, None).unwrap();
        assert_eq!(info.ipaddress, "10.0.0.1");
        assert_eq!(info.port, 3128);
        assert_eq!(info.auth.as_ref().unwrap().username, "user");
        assert_eq!(info.auth.as_ref().unwrap().password, "pass");
    }

    #[test]
    fn test_parse_with_default_auth() {
        let entry = ProxyEntry::Plain("10.0.0.1:3128".into());
        let info = parse_proxy_entry(&entry, Some("admin"), Some("secret")).unwrap();
        assert_eq!(info.auth.as_ref().unwrap().username, "admin");
    }

    #[test]
    fn test_parse_with_auth_entry() {
        let entry = ProxyEntry::WithAuth {
            proxy: "10.0.0.1:3128".into(),
            username: Some("user".into()),
            password: Some("pass".into()),
        };
        let info = parse_proxy_entry(&entry, None, None).unwrap();
        assert_eq!(info.auth.as_ref().unwrap().username, "user");
    }

    #[test]
    fn test_parse_invalid_ip() {
        let entry = ProxyEntry::Plain("notanip:8080".into());
        assert!(parse_proxy_entry(&entry, None, None).is_none());
    }

    #[test]
    fn test_parse_invalid_port() {
        let entry = ProxyEntry::Plain("1.2.3.4:abc".into());
        assert!(parse_proxy_entry(&entry, None, None).is_none());
    }

    #[test]
    fn test_parse_zero_port() {
        let entry = ProxyEntry::Plain("1.2.3.4:0".into());
        assert!(parse_proxy_entry(&entry, None, None).is_none());
    }

    #[test]
    fn test_proxy_key() {
        let p = ProxyInfo {
            ipaddress: "1.2.3.4".into(),
            port: 80,
            auth: None,
        };
        assert_eq!(p.key(), "1.2.3.4:80");

        let p6 = ProxyInfo {
            ipaddress: "::1".into(),
            port: 443,
            auth: None,
        };
        assert_eq!(p6.key(), "[::1]:443");
    }

    #[test]
    fn test_proxy_to_url() {
        let p = ProxyInfo {
            ipaddress: "1.2.3.4".into(),
            port: 8080,
            auth: Some(ProxyAuth {
                username: "u".into(),
                password: "p".into(),
            }),
        };
        assert_eq!(p.to_url("socks5"), "socks5://u:p@1.2.3.4:8080");

        let p2 = ProxyInfo {
            ipaddress: "1.2.3.4".into(),
            port: 80,
            auth: None,
        };
        assert_eq!(p2.to_url("http"), "http://1.2.3.4:80");
    }
}
