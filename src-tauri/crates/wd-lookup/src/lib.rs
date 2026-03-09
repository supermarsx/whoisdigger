use hickory_resolver::config::*;
use hickory_resolver::TokioAsyncResolver;
use publicsuffix::Psl;
use rand::Rng;
use serde::{Deserialize, Serialize};
use whois_rust::{WhoIs, WhoIsLookupOptions};

// ─── Domain Conversion ──────────────────────────────────────────────────────

/// Algorithm for international domain name conversion.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConversionAlgorithm {
    #[default]
    None,
    Punycode,
    #[serde(rename = "uts46")]
    Uts46,
    Ascii,
}

/// Settings controlling domain conversion and PSL cleaning.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ConversionSettings {
    pub enabled: bool,
    pub algorithm: ConversionAlgorithm,
}

/// Convert an international domain name according to the chosen algorithm.
pub fn convert_domain(domain: &str, algorithm: &ConversionAlgorithm) -> String {
    match algorithm {
        ConversionAlgorithm::Punycode | ConversionAlgorithm::Uts46 => {
            // The `idna` crate implements UTS#46 processing which covers
            // punycode encoding as part of the standard pipeline.
            match idna::domain_to_ascii(domain) {
                Ok(ascii) => ascii,
                Err(_) => domain.to_string(),
            }
        }
        ConversionAlgorithm::Ascii => domain.chars().filter(|c| c.is_ascii()).collect(),
        ConversionAlgorithm::None => domain.to_string(),
    }
}

/// Clean a domain via the Public Suffix List — extract the registrable
/// domain (eTLD+1) and strip any leading wildcards.
pub fn psl_clean(domain: &str) -> String {
    // publicsuffix crate: parse the domain and extract the registrable part.
    let list = publicsuffix::List::new();
    match list.domain(domain.as_bytes()) {
        Some(parsed) => {
            let result = std::str::from_utf8(parsed.as_bytes())
                .unwrap_or(domain)
                .to_string();
            result.replace("*.", "")
        }
        None => domain.to_string(),
    }
}

// ─── WHOIS Lookup Options ────────────────────────────────────────────────────

/// Settings for randomising WHOIS lookup parameters (follow depth, timeout,
/// time between queries).
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct RandomizeSettings {
    pub randomize: bool,
    pub minimum: Option<u64>,
    pub maximum: Option<u64>,
    #[serde(rename = "minimumDepth")]
    pub minimum_depth: Option<u64>,
    #[serde(rename = "maximumDepth")]
    pub maximum_depth: Option<u64>,
}

/// General WHOIS lookup settings.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct LookupGeneralSettings {
    pub server: Option<String>,
    pub follow: Option<u64>,
    pub timeout: Option<u64>,
    pub verbose: Option<bool>,
    pub psl: Option<bool>,
    #[serde(rename = "timeBetween")]
    pub time_between: Option<u64>,
}

/// Combined lookup settings passed from the frontend.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct LookupSettings {
    #[serde(default)]
    pub general: LookupGeneralSettings,
    #[serde(default)]
    pub conversion: ConversionSettings,
    #[serde(rename = "randomizeFollow", default)]
    pub randomize_follow: RandomizeSettings,
    #[serde(rename = "randomizeTimeout", default)]
    pub randomize_timeout: RandomizeSettings,
    #[serde(rename = "randomizeTimeBetween", default)]
    pub randomize_time_between: RandomizeSettings,
}

/// Compute the effective follow depth, possibly randomised.
pub fn get_follow(settings: &LookupSettings) -> u64 {
    let rf = &settings.randomize_follow;
    if rf.randomize {
        let min = rf.minimum_depth.unwrap_or(0);
        let max = rf.maximum_depth.unwrap_or(2);
        if max > min {
            rand::thread_rng().gen_range(min..=max)
        } else {
            min
        }
    } else {
        settings.general.follow.unwrap_or(0)
    }
}

/// Compute the effective timeout, possibly randomised.
pub fn get_timeout(settings: &LookupSettings) -> u64 {
    let rt = &settings.randomize_timeout;
    if rt.randomize {
        let min = rt.minimum.unwrap_or(5000);
        let max = rt.maximum.unwrap_or(30000);
        if max > min {
            rand::thread_rng().gen_range(min..=max)
        } else {
            min
        }
    } else {
        settings.general.timeout.unwrap_or(10000)
    }
}

/// Compute the effective time between queries, possibly randomised.
pub fn get_time_between(settings: &LookupSettings) -> u64 {
    let rtb = &settings.randomize_time_between;
    if rtb.randomize {
        let min = rtb.minimum.unwrap_or(0);
        let max = rtb.maximum.unwrap_or(1000);
        if max > min {
            rand::thread_rng().gen_range(min..=max)
        } else {
            min
        }
    } else {
        settings.general.time_between.unwrap_or(0)
    }
}

// ─── Core Lookup Functions ───────────────────────────────────────────────────

/// Prepare a domain for lookup: optionally convert IDN and clean via PSL.
pub fn prepare_domain(domain: &str, settings: &LookupSettings) -> String {
    let mut d = domain.to_string();
    if settings.conversion.enabled {
        d = convert_domain(&d, &settings.conversion.algorithm);
    }
    if settings.general.psl.unwrap_or(false) {
        d = psl_clean(&d);
    }
    d
}

/// Perform a WHOIS lookup for the given domain with a configurable timeout.
pub async fn perform_lookup(domain: &str, timeout_ms: u64) -> Result<String, String> {
    let whois = WhoIs::from_string(&format!(
        "{{\"server\": null, \"port\": 43, \"timeout\": {}, \"follow\": 0, \"punycode\": false}}",
        timeout_ms
    ))
    .map_err(|e| e.to_string())?;

    whois
        .lookup(WhoIsLookupOptions::from_string(domain).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

/// Perform a WHOIS lookup with full settings support (follow, timeout,
/// server, domain conversion, PSL).
pub async fn perform_lookup_with_settings(
    domain: &str,
    settings: &LookupSettings,
) -> Result<String, String> {
    let prepared = prepare_domain(domain, settings);
    let follow = get_follow(settings);
    let timeout = get_timeout(settings);

    let server_part = settings
        .general
        .server
        .as_deref()
        .map(|s| format!("\"server\": \"{}\"", s))
        .unwrap_or_else(|| "\"server\": null".to_string());

    let config = format!(
        "{{{}, \"port\": 43, \"timeout\": {}, \"follow\": {}, \"punycode\": false}}",
        server_part, timeout, follow
    );

    let whois = WhoIs::from_string(&config).map_err(|e| e.to_string())?;

    whois
        .lookup(WhoIsLookupOptions::from_string(&prepared).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

/// Check if a domain has NS records via DNS resolution.
pub async fn dns_lookup(domain: &str) -> Result<bool, String> {
    let resolver = TokioAsyncResolver::tokio(ResolverConfig::default(), ResolverOpts::default());

    match resolver.ns_lookup(domain).await {
        Ok(ns) => Ok(ns.into_iter().next().is_some()),
        Err(_) => Ok(false),
    }
}

/// Query the RDAP service for domain registration data.
pub async fn rdap_lookup(domain: &str) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("https://rdap.org/domain/{}", domain);
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    res.text().await.map_err(|e| e.to_string())
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Domain conversion ────────────────────────────────────────────────

    #[test]
    fn test_convert_domain_ascii() {
        assert_eq!(
            convert_domain("héllo.com", &ConversionAlgorithm::Ascii),
            "hllo.com"
        );
    }

    #[test]
    fn test_convert_domain_none() {
        assert_eq!(
            convert_domain("héllo.com", &ConversionAlgorithm::None),
            "héllo.com"
        );
    }

    #[test]
    fn test_convert_domain_punycode() {
        let result = convert_domain("münchen.de", &ConversionAlgorithm::Punycode);
        assert!(
            result.contains("xn--"),
            "Expected punycode output, got: {}",
            result
        );
    }

    #[test]
    fn test_convert_domain_uts46() {
        let result = convert_domain("münchen.de", &ConversionAlgorithm::Uts46);
        assert!(
            result.contains("xn--"),
            "Expected UTS46 output, got: {}",
            result
        );
    }

    #[test]
    fn test_convert_domain_pure_ascii_passthrough() {
        assert_eq!(
            convert_domain("example.com", &ConversionAlgorithm::Punycode),
            "example.com"
        );
    }

    // ── Lookup settings ──────────────────────────────────────────────────

    #[test]
    fn test_get_follow_default() {
        let settings = LookupSettings::default();
        assert_eq!(get_follow(&settings), 0);
    }

    #[test]
    fn test_get_follow_static() {
        let settings = LookupSettings {
            general: LookupGeneralSettings {
                follow: Some(5),
                ..Default::default()
            },
            ..Default::default()
        };
        assert_eq!(get_follow(&settings), 5);
    }

    #[test]
    fn test_get_follow_random_in_range() {
        let settings = LookupSettings {
            randomize_follow: RandomizeSettings {
                randomize: true,
                minimum_depth: Some(1),
                maximum_depth: Some(3),
                ..Default::default()
            },
            ..Default::default()
        };
        let f = get_follow(&settings);
        assert!(f >= 1 && f <= 3);
    }

    #[test]
    fn test_get_timeout_default() {
        let settings = LookupSettings::default();
        assert_eq!(get_timeout(&settings), 10000);
    }

    #[test]
    fn test_get_time_between_default() {
        let settings = LookupSettings::default();
        assert_eq!(get_time_between(&settings), 0);
    }

    // ── prepare_domain ───────────────────────────────────────────────────

    #[test]
    fn test_prepare_domain_no_conversion() {
        let settings = LookupSettings::default();
        assert_eq!(prepare_domain("example.com", &settings), "example.com");
    }

    #[test]
    fn test_prepare_domain_with_conversion() {
        let settings = LookupSettings {
            conversion: ConversionSettings {
                enabled: true,
                algorithm: ConversionAlgorithm::Ascii,
            },
            ..Default::default()
        };
        assert_eq!(prepare_domain("héllo.com", &settings), "hllo.com");
    }

    // ── DNS / RDAP (network-dependent, edge cases only) ──────────────────

    #[tokio::test]
    async fn test_dns_lookup_edge_cases() {
        let res = dns_lookup("non-existent-domain-123456789.com")
            .await
            .unwrap();
        assert!(!res);
    }

    #[tokio::test]
    async fn test_rdap_lookup_edge_cases() {
        let res = rdap_lookup("invalid..domain").await;
        assert!(res.is_err() || res.unwrap().contains("error"));
    }
}
