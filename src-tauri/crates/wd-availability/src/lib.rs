use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::LazyLock;
use wd_parser::parse_raw_data;

// ─── Domain Status ───────────────────────────────────────────────────────────

/// All possible domain-status values returned by the pattern engine.
/// The serde names match the string constants used by the TypeScript frontend.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum DomainStatus {
    #[serde(rename = "available")]
    Available,
    #[serde(rename = "unavailable")]
    Unavailable,
    #[serde(rename = "expired")]
    Expired,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "error:unparsable")]
    ErrorUnparsable,
    #[serde(rename = "error:nocontent")]
    ErrorNoContent,
    #[serde(rename = "error:unauthorized")]
    ErrorUnauthorized,
    #[serde(rename = "error:ratelimiting")]
    ErrorRateLimiting,
    #[serde(rename = "error:unretrivable")]
    ErrorUnretrivable,
    #[serde(rename = "error:forbidden")]
    ErrorForbidden,
    #[serde(rename = "error:reservedbyregulator")]
    ErrorReservedByRegulator,
    #[serde(rename = "error:unregistrable")]
    ErrorUnregistrable,
    #[serde(rename = "error:replyerror")]
    ErrorReplyError,
}

impl DomainStatus {
    /// Parse a status string into a `DomainStatus`, falling back to
    /// `ErrorUnparsable` for unknown values.
    pub fn from_str_loose(s: &str) -> Self {
        match s {
            "available" => Self::Available,
            "unavailable" => Self::Unavailable,
            "expired" => Self::Expired,
            "error" => Self::Error,
            "error:unparsable" => Self::ErrorUnparsable,
            "error:nocontent" => Self::ErrorNoContent,
            "error:unauthorized" => Self::ErrorUnauthorized,
            "error:ratelimiting" => Self::ErrorRateLimiting,
            "error:unretrivable" => Self::ErrorUnretrivable,
            "error:forbidden" => Self::ErrorForbidden,
            "error:reservedbyregulator" => Self::ErrorReservedByRegulator,
            "error:unregistrable" => Self::ErrorUnregistrable,
            "error:replyerror" => Self::ErrorReplyError,
            _ => Self::ErrorUnparsable,
        }
    }

    /// Convert to the canonical string representation used by the frontend.
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Available => "available",
            Self::Unavailable => "unavailable",
            Self::Expired => "expired",
            Self::Error => "error",
            Self::ErrorUnparsable => "error:unparsable",
            Self::ErrorNoContent => "error:nocontent",
            Self::ErrorUnauthorized => "error:unauthorized",
            Self::ErrorRateLimiting => "error:ratelimiting",
            Self::ErrorUnretrivable => "error:unretrivable",
            Self::ErrorForbidden => "error:forbidden",
            Self::ErrorReservedByRegulator => "error:reservedbyregulator",
            Self::ErrorUnregistrable => "error:unregistrable",
            Self::ErrorReplyError => "error:replyerror",
        }
    }
}

// ─── Availability Settings ───────────────────────────────────────────────────

/// Settings that influence how the pattern engine resolves ambiguous results.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct AvailabilitySettings {
    /// Treat Uniregistry rate-limit responses as "unavailable" instead of error
    #[serde(default)]
    pub uniregistry: bool,
    /// Treat unknown / rate-limited results as the given status
    #[serde(default)]
    pub ratelimit: bool,
    /// Treat unparsable results as "available" (true) or "error:unparsable" (false)
    #[serde(default)]
    pub unparsable: bool,
    /// Treat expired domains as "expired" (true) or "available" (false)
    #[serde(default)]
    pub expired: Option<bool>,
    /// Treat DNS-failure as "unavailable"
    #[serde(default, rename = "dnsFailureUnavailable")]
    pub dns_failure_unavailable: bool,
}

// ─── WHOIS Parameters (output of get_domain_parameters) ─────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WhoisParams {
    pub domain: Option<String>,
    pub status: Option<DomainStatus>,
    pub registrar: Option<String>,
    pub company: Option<String>,
    #[serde(rename = "creationDate")]
    pub creation_date: Option<String>,
    #[serde(rename = "updateDate")]
    pub update_date: Option<String>,
    #[serde(rename = "expiryDate")]
    pub expiry_date: Option<String>,
    pub whoisreply: Option<String>,
    /// Parsed key-value JSON from the raw WHOIS text
    #[serde(rename = "whoisJson", skip_serializing_if = "Option::is_none")]
    pub whois_json: Option<HashMap<String, String>>,
}

// ─── Pattern Context (evaluation context for compiled patterns) ──────────────

/// The context against which every compiled pattern is evaluated.
struct PatternContext<'a> {
    results_text: &'a str,
    results_json: &'a HashMap<String, String>,
    domain_params: &'a WhoisParams,
    /// ISO-8601 date string of "now"
    control_date: String,
}

impl<'a> PatternContext<'a> {
    /// Resolve a dotted path like `domainParams.expiryDate` against the context.
    #[allow(dead_code)]
    fn resolve_path(&self, path: &str) -> Option<String> {
        let mut parts = path.split('.');
        let root = parts.next()?;
        match root {
            "domainParams" => {
                let field = parts.next()?;
                match field {
                    "expiryDate" => self.domain_params.expiry_date.clone(),
                    "creationDate" => self.domain_params.creation_date.clone(),
                    "updateDate" => self.domain_params.update_date.clone(),
                    "registrar" => self.domain_params.registrar.clone(),
                    "company" => self.domain_params.company.clone(),
                    "domain" => self.domain_params.domain.clone(),
                    "whoisreply" => {
                        let next = parts.next();
                        match next {
                            Some("length") => self
                                .domain_params
                                .whoisreply
                                .as_ref()
                                .map(|r| r.len().to_string()),
                            _ => self.domain_params.whoisreply.clone(),
                        }
                    }
                    _ => None,
                }
            }
            "resultsJSON" => {
                let field = parts.next()?;
                self.results_json.get(field).cloned()
            }
            "resultsText" => Some(self.results_text.to_string()),
            "controlDate" => Some(self.control_date.clone()),
            _ => None,
        }
    }

    /// Number of keys in `resultsJSON`.
    fn results_json_key_count(&self) -> usize {
        self.results_json.len()
    }
}

// ─── Compiled Pattern Types ──────────────────────────────────────────────────

/// A single compiled pattern: a test function + the result to return on match.
struct CompiledPattern {
    check: Box<dyn Fn(&PatternContext) -> bool + Send + Sync>,
    result: DomainStatus,
}

/// All compiled pattern collections, built once then reused.
struct PatternCollections {
    special: Vec<CompiledPattern>,
    available: Vec<CompiledPattern>,
    unavailable: Vec<CompiledPattern>,
    error: Vec<CompiledPattern>,
}

// ─── Pattern Building ────────────────────────────────────────────────────────

/// Build all pattern collections, taking settings into account for dynamic
/// result overrides (uniregistry, expired).
fn build_patterns(settings: &AvailabilitySettings) -> PatternCollections {
    let mut special = Vec::new();
    let mut available = Vec::new();
    let mut unavailable = Vec::new();
    let mut error: Vec<CompiledPattern> = Vec::new();

    // ── Special ──────────────────────────────────────────────────────────
    let uni_result = if settings.uniregistry {
        DomainStatus::Unavailable
    } else {
        DomainStatus::ErrorRateLimiting
    };
    special.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_text.contains("Uniregistry")
                && ctx.results_text.contains("Query limit exceeded")
        }),
        result: uni_result,
    });

    // ── Available: not-found ─────────────────────────────────────────────
    let notfound_strings: &[&str] = &[
        "NOT FOUND",
        "Not found: ",
        " not found",
        "Not found",
        "No Data Found",
        "nothing found",
        "Nothing found for",
        "Domain Status: No Object Found",
        "DOMAIN NOT FOUND",
        "Domain Not Found",
        "Domain not found",
        "NO OBJECT FOUND!",
    ];
    for &s in notfound_strings {
        let owned = s.to_string();
        available.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::Available,
        });
    }
    // Special: "No entries found" but NOT "ERROR:101:"
    available.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_text.contains("No entries found")
                && !ctx.results_text.contains("ERROR:101:")
        }),
        result: DomainStatus::Available,
    });

    // ── Available: no-match ──────────────────────────────────────────────
    let nomatch_strings: &[&str] = &[
        "No match for domain",
        "- No Match",
        "NO MATCH:",
        "No match for",
        "No match",
        "No matching record.",
        "Nincs talalat",
    ];
    for &s in nomatch_strings {
        let owned = s.to_string();
        available.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::Available,
        });
    }

    // ── Available: status-based ──────────────────────────────────────────
    let status_strings: &[&str] = &[
        "Status: AVAILABLE",
        "Status:             AVAILABLE",
        "Status: \tavailable",
        "Status: free",
        "Status: Not Registered",
        "query_status: 220 Available",
    ];
    for &s in status_strings {
        let owned = s.to_string();
        available.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::Available,
        });
    }

    // ── Available: unique / complex conditions ───────────────────────────
    // 1) Expiry date in the past → available (or expired if settings say so)
    let expired_result = if settings.expired.unwrap_or(false) {
        DomainStatus::Expired
    } else {
        DomainStatus::Available
    };
    available.push(CompiledPattern {
        check: Box::new(|ctx| {
            if let (Some(expiry_str), control) =
                (ctx.domain_params.expiry_date.as_deref(), &ctx.control_date)
            {
                if let (Some(exp_ts), Some(ctl_ts)) =
                    (parse_date_ms(expiry_str), parse_date_ms(control))
                {
                    return exp_ts < ctl_ts;
                }
            }
            false
        }),
        result: expired_result,
    });

    let simple_available: &[&str] = &[
        "This domain name has not been registered",
        "The domain has not been registered",
        "This query returned 0 objects",
        "domain name not known in",
        "registration status: available",
        "Object does not exist",
        "The queried object does not exist",
        "Not Registered -",
        "is available for registration",
        "is available for purchase",
        "DOMAIN IS NOT A REGISTERD",
        "No such domain",
        "No_Se_Encontro_El_Objeto",
        "Domain unknown",
        "No information available about domain name",
        "is not valid!",
    ];
    for &s in simple_available {
        let owned = s.to_string();
        available.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::Available,
        });
    }

    // "is free" + whoisreply length < 50
    available.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_text.contains(" is free")
                && ctx
                    .domain_params
                    .whoisreply
                    .as_ref()
                    .map_or(false, |r| r.len() < 50)
        }),
        result: DomainStatus::Available,
    });

    // whois.nic.bo + whoisreply length < 55
    available.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_text.contains("whois.nic.bo")
                && ctx
                    .domain_params
                    .whoisreply
                    .as_ref()
                    .map_or(false, |r| r.len() < 55)
        }),
        result: DomainStatus::Available,
    });

    // Error. + SaudiNIC → available
    available.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_text.contains("Error.") && ctx.results_text.contains("SaudiNIC")
        }),
        result: DomainStatus::Available,
    });

    // ── Unavailable ──────────────────────────────────────────────────────
    // hasOwnProperty("domainName") — resultsJSON contains key "domainName"
    unavailable.push(CompiledPattern {
        check: Box::new(|ctx| ctx.results_json.contains_key("domainName")),
        result: DomainStatus::Unavailable,
    });

    let unav_strings: &[&str] = &[
        "Domain Status:ok",
        "Expiration Date:",
        "Expiry Date:",
        "Status: connect",
        "Changed:",
        "organisation: Internet Assigned Numbers Authority",
    ];
    for &s in unav_strings {
        let owned = s.to_string();
        unavailable.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::Unavailable,
        });
    }

    // Object.keys(resultsJSON).length > 5
    unavailable.push(CompiledPattern {
        check: Box::new(|ctx| ctx.results_json_key_count() > 5),
        result: DomainStatus::Unavailable,
    });

    // ── Error: nocontent ─────────────────────────────────────────────────
    error.push(CompiledPattern {
        check: Box::new(|ctx| ctx.results_text.is_empty()),
        result: DomainStatus::ErrorNoContent,
    });

    // ── Error: unauthorized ──────────────────────────────────────────────
    error.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_text
                .contains("You  are  not  authorized  to  access or query our Whois")
        }),
        result: DomainStatus::ErrorUnauthorized,
    });

    // ── Error: ratelimiting ──────────────────────────────────────────────
    let ratelimit_strings: &[&str] = &[
        "IP Address Has Reached Rate Limit",
        "Too many connection attempts",
        "Your request is being rate limited",
        "Your query is too often.",
        "Your connection limit exceeded.",
    ];
    for &s in ratelimit_strings {
        let owned = s.to_string();
        error.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::ErrorRateLimiting,
        });
    }

    // ── Error: unretrivable ──────────────────────────────────────────────
    error.push(CompiledPattern {
        check: Box::new(|ctx| ctx.results_text.contains("Could not retrieve Whois data")),
        result: DomainStatus::ErrorUnretrivable,
    });

    // ── Error: forbidden ─────────────────────────────────────────────────
    let forbidden_strings: &[&str] = &[
        "si is forbidden",
        "Requests of this client are not permitted",
    ];
    for &s in forbidden_strings {
        let owned = s.to_string();
        error.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::ErrorForbidden,
        });
    }

    // ── Error: reserved by regulator ─────────────────────────────────────
    error.push(CompiledPattern {
        check: Box::new(|ctx| ctx.results_text.contains("reserved by aeDA Regulator")),
        result: DomainStatus::ErrorReservedByRegulator,
    });

    // ── Error: unregistrable ─────────────────────────────────────────────
    error.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_text
                .contains("third-level domains may not start with")
        }),
        result: DomainStatus::ErrorUnregistrable,
    });

    // ── Error: replyerror (catch-all error patterns) ─────────────────────
    // NOTE: Specific patterns first; broad patterns like "error" are matched
    // only against the first line to avoid false-positives on legitimate
    // WHOIS replies that happen to contain the word "error" in registrar
    // descriptions or policy text.
    let specific_error_strings: &[&str] = &[
        "ERROR:101:",
        "Whois lookup error",
        "can temporarily not be answered",
        "Invalid input",
    ];
    for &s in specific_error_strings {
        let owned = s.to_string();
        error.push(CompiledPattern {
            check: Box::new(move |ctx| ctx.results_text.contains(&*owned)),
            result: DomainStatus::ErrorReplyError,
        });
    }
    // Broad "error" / "Error" patterns — only match if the FIRST non-empty
    // line of the WHOIS reply starts with or equals an error-like string.
    error.push(CompiledPattern {
        check: Box::new(|ctx| {
            let first_line = ctx
                .results_text
                .lines()
                .find(|l| !l.trim().is_empty())
                .unwrap_or("")
                .trim();
            first_line.starts_with("error")
                || first_line.starts_with("Error")
                || first_line.starts_with("ERROR")
        }),
        result: DomainStatus::ErrorReplyError,
    });
    // resultsJSON has "error" or "errno" key
    error.push(CompiledPattern {
        check: Box::new(|ctx| {
            ctx.results_json.contains_key("error") || ctx.results_json.contains_key("errno")
        }),
        result: DomainStatus::ErrorReplyError,
    });

    PatternCollections {
        special,
        available,
        unavailable,
        error,
    }
}

// ─── Cached Default Patterns ─────────────────────────────────────────────────

/// Pre-built patterns for the default `AvailabilitySettings` (all flags false).
/// This avoids rebuilding patterns on every call during bulk operations.
static DEFAULT_PATTERNS: LazyLock<PatternCollections> =
    LazyLock::new(|| build_patterns(&AvailabilitySettings::default()));

// ─── Date Parsing Helper ─────────────────────────────────────────────────────

/// Attempt to parse a date string to epoch milliseconds. Handles ISO-8601 and
/// common WHOIS date formats.
fn parse_date_ms(s: &str) -> Option<i64> {
    // Try ISO-8601 with chrono
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
        return Some(dt.timestamp_millis());
    }
    // Try common WHOIS format: "YYYY-MM-DD" (treat as midnight UTC)
    if let Ok(nd) = chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d") {
        let dt = nd.and_hms_opt(0, 0, 0)?;
        return Some(dt.and_utc().timestamp_millis());
    }
    // Fallback: try JavaScript-style Date.parse (numeric ms)
    if let Ok(ms) = s.parse::<i64>() {
        return Some(ms);
    }
    None
}

// ─── Public API ──────────────────────────────────────────────────────────────

/// Check domain availability using the full compiled pattern engine.
///
/// This is the comprehensive replacement for the old flat-matching
/// `is_domain_available`. It evaluates patterns in order:
/// special → available → unavailable → error, returning the first match.
pub fn is_domain_available(results_text: &str) -> DomainStatus {
    is_domain_available_with_settings(results_text, &AvailabilitySettings::default())
}

/// Check domain availability with explicit settings for assumption overrides.
pub fn is_domain_available_with_settings(
    results_text: &str,
    settings: &AvailabilitySettings,
) -> DomainStatus {
    let results_json = parse_raw_data(results_text);
    is_domain_available_full(results_text, &results_json, settings)
}

/// Full availability check with pre-parsed JSON and settings.
pub fn is_domain_available_full(
    results_text: &str,
    results_json: &HashMap<String, String>,
    settings: &AvailabilitySettings,
) -> DomainStatus {
    // Use cached default patterns when settings are all defaults to avoid
    // rebuilding pattern closures on every call (critical for bulk lookups).
    let is_default = !settings.uniregistry
        && !settings.ratelimit
        && !settings.unparsable
        && settings.expired.is_none()
        && !settings.dns_failure_unavailable;

    let owned_patterns;
    let patterns = if is_default {
        &*DEFAULT_PATTERNS
    } else {
        owned_patterns = build_patterns(settings);
        &owned_patterns
    };

    let domain_params = get_domain_parameters_from_json(None, None, results_text, results_json);
    let control_date = Utc::now().format("%Y-%m-%d").to_string();

    let ctx = PatternContext {
        results_text,
        results_json,
        domain_params: &domain_params,
        control_date,
    };

    // Evaluate patterns in priority order
    for p in &patterns.special {
        if (p.check)(&ctx) {
            return p.result.clone();
        }
    }
    for p in &patterns.available {
        if (p.check)(&ctx) {
            return p.result.clone();
        }
    }
    for p in &patterns.unavailable {
        if (p.check)(&ctx) {
            return p.result.clone();
        }
    }
    for p in &patterns.error {
        if (p.check)(&ctx) {
            return p.result.clone();
        }
    }

    // Default: depend on settings.unparsable
    if settings.unparsable {
        DomainStatus::Available
    } else {
        DomainStatus::ErrorUnparsable
    }
}

// ─── Domain Parameter Extraction ─────────────────────────────────────────────

pub fn get_domain_parameters(
    domain: Option<String>,
    status: Option<DomainStatus>,
    results_text: String,
) -> WhoisParams {
    let results_json = parse_raw_data(&results_text);
    get_domain_parameters_from_json(domain, status, &results_text, &results_json)
}

/// Extract domain parameters using a pre-parsed JSON map.
pub fn get_domain_parameters_from_json(
    domain: Option<String>,
    status: Option<DomainStatus>,
    results_text: &str,
    results_json: &HashMap<String, String>,
) -> WhoisParams {
    let registrar = results_json.get("registrar").cloned();
    let company = results_json
        .get("registrantOrganization")
        .or_else(|| results_json.get("registrant"))
        .or_else(|| results_json.get("adminName"))
        .or_else(|| results_json.get("ownerName"))
        .or_else(|| results_json.get("contact"))
        .or_else(|| results_json.get("name"))
        .cloned();

    let creation_date = results_json
        .get("creationDate")
        .or_else(|| results_json.get("createdDate"))
        .or_else(|| results_json.get("created"))
        .or_else(|| results_json.get("registered"))
        .or_else(|| results_json.get("registeredOn"))
        .cloned();

    let update_date = results_json
        .get("updatedDate")
        .or_else(|| results_json.get("lastUpdated"))
        .or_else(|| results_json.get("UpdatedDate"))
        .or_else(|| results_json.get("changed"))
        .or_else(|| results_json.get("lastModified"))
        .or_else(|| results_json.get("lastUpdate"))
        .cloned();

    let expiry_date = results_json
        .get("expires")
        .or_else(|| results_json.get("registryExpiryDate"))
        .or_else(|| results_json.get("expiryDate"))
        .or_else(|| results_json.get("registrarRegistrationExpirationDate"))
        .or_else(|| results_json.get("expire"))
        .or_else(|| results_json.get("expirationDate"))
        .or_else(|| results_json.get("expiresOn"))
        .or_else(|| results_json.get("paidTill"))
        .cloned();

    WhoisParams {
        domain,
        status,
        registrar,
        company,
        creation_date,
        update_date,
        expiry_date,
        whoisreply: Some(results_text.to_string()),
        whois_json: Some(results_json.clone()),
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn default_settings() -> AvailabilitySettings {
        AvailabilitySettings::default()
    }

    // ── is_domain_available (backward compat) ────────────────────────────

    #[test]
    fn test_is_domain_available() {
        assert_eq!(
            is_domain_available("No match for domain example.com"),
            DomainStatus::Available
        );
        assert_eq!(is_domain_available("Status: free"), DomainStatus::Available);
        assert_eq!(
            is_domain_available("Domain Status:ok"),
            DomainStatus::Unavailable
        );
        // Expiration Date: 2025-01-01 is in the past (current year 2026),
        // so the expiry-date pattern fires first → Available
        assert_eq!(
            is_domain_available("Expiration Date: 2025-01-01"),
            DomainStatus::Available
        );
        // A future date still means unavailable
        assert_eq!(
            is_domain_available("Expiration Date: 2030-01-01"),
            DomainStatus::Unavailable
        );
    }

    // ── Available: not-found patterns ────────────────────────────────────

    #[test]
    fn test_notfound_patterns() {
        let cases = &[
            "NOT FOUND",
            "Not found: example.com",
            "Domain not found",
            "No Data Found",
            "DOMAIN NOT FOUND",
            "Domain Not Found",
            "NO OBJECT FOUND!",
        ];
        for text in cases {
            assert_eq!(
                is_domain_available(text),
                DomainStatus::Available,
                "Expected Available for: {}",
                text
            );
        }
    }

    #[test]
    fn test_no_entries_found_excludes_error101() {
        assert_eq!(
            is_domain_available("No entries found for this query"),
            DomainStatus::Available
        );
        // With ERROR:101: it should NOT match the notfound pattern
        // but may match the error:replyerror pattern instead
        let result = is_domain_available("ERROR:101: No entries found");
        assert_ne!(result, DomainStatus::Available);
    }

    // ── Available: no-match patterns ─────────────────────────────────────

    #[test]
    fn test_all_available_patterns() {
        let test_cases = vec![
            "No match for domain foobar.com",
            "- No Match",
            "NO MATCH:",
            "No match for something",
            "No match",
            "No matching record.",
            "Nincs talalat",
            "Status: AVAILABLE",
            "Status: free",
            "Status: Not Registered",
            "query_status: 220 Available",
            "This domain name has not been registered",
            "The domain has not been registered",
            "This query returned 0 objects",
            "domain name not known in xyz",
            "registration status: available",
            "Object does not exist",
            "The queried object does not exist",
            "Not Registered - example.com",
            "example.com is available for registration",
            "is available for purchase",
            "DOMAIN IS NOT A REGISTERD",
            "No such domain",
            "No_Se_Encontro_El_Objeto",
            "Domain unknown",
            "No information available about domain name",
            "is not valid!",
        ];
        for text in test_cases {
            assert_eq!(
                is_domain_available(text),
                DomainStatus::Available,
                "Expected Available for: {}",
                text
            );
        }
    }

    // ── Unavailable patterns ─────────────────────────────────────────────

    #[test]
    fn test_all_unavailable_patterns() {
        let test_cases = vec![
            "Domain Status:ok\nMore data",
            "Expiration Date: 2030-01-01",
            "Expiry Date: 2030-01-01",
            "Status: connect",
            "Changed: 2024-01-01",
            "organisation: Internet Assigned Numbers Authority",
        ];
        for text in test_cases {
            assert_eq!(
                is_domain_available(text),
                DomainStatus::Unavailable,
                "Expected Unavailable for: {}",
                text
            );
        }
    }

    // ── Unavailable: has domainName key ──────────────────────────────────

    #[test]
    fn test_unavailable_domain_name_key() {
        let text = "Domain Name: example.com\nRegistrar: GoDaddy";
        let status = is_domain_available(text);
        assert_eq!(status, DomainStatus::Unavailable);
    }

    // ── Unavailable: JSON key count > 5 ──────────────────────────────────

    #[test]
    fn test_unavailable_many_json_keys() {
        let text = [
            "Key A: val1",
            "Key B: val2",
            "Key C: val3",
            "Key D: val4",
            "Key E: val5",
            "Key F: val6",
        ]
        .join("\n");
        let status = is_domain_available(&text);
        assert_eq!(status, DomainStatus::Unavailable);
    }

    // ── Special: Uniregistry ─────────────────────────────────────────────

    #[test]
    fn test_uniregistry_rate_limit_default() {
        // Default settings: uniregistry=false → ErrorRateLimiting
        assert_eq!(
            is_domain_available("Uniregistry blah Query limit exceeded"),
            DomainStatus::ErrorRateLimiting
        );
    }

    #[test]
    fn test_uniregistry_rate_limit_override() {
        let mut settings = default_settings();
        settings.uniregistry = true;
        assert_eq!(
            is_domain_available_with_settings("Uniregistry Query limit exceeded", &settings),
            DomainStatus::Unavailable
        );
    }

    #[test]
    fn test_uniregistry_without_limit() {
        // "Uniregistry" alone without "Query limit exceeded" should not trigger special
        let result = is_domain_available("Uniregistry Registrar");
        assert_ne!(result, DomainStatus::ErrorRateLimiting);
    }

    // ── Error patterns ───────────────────────────────────────────────────

    #[test]
    fn test_error_nocontent() {
        let settings = default_settings();
        assert_eq!(
            is_domain_available_with_settings("", &settings),
            DomainStatus::ErrorNoContent
        );
    }

    #[test]
    fn test_error_unauthorized() {
        assert_eq!(
            is_domain_available(
                "You  are  not  authorized  to  access or query our Whois database"
            ),
            DomainStatus::ErrorUnauthorized
        );
    }

    #[test]
    fn test_error_ratelimiting_patterns() {
        let patterns = &[
            "IP Address Has Reached Rate Limit",
            "Too many connection attempts",
            "Your request is being rate limited",
            "Your query is too often.",
            "Your connection limit exceeded.",
        ];
        for text in patterns {
            assert_eq!(
                is_domain_available(text),
                DomainStatus::ErrorRateLimiting,
                "Expected ErrorRateLimiting for: {}",
                text
            );
        }
    }

    #[test]
    fn test_error_forbidden() {
        assert_eq!(
            is_domain_available("si is forbidden to query"),
            DomainStatus::ErrorForbidden
        );
        assert_eq!(
            is_domain_available("Requests of this client are not permitted"),
            DomainStatus::ErrorForbidden
        );
    }

    #[test]
    fn test_error_unretrivable() {
        assert_eq!(
            is_domain_available("Could not retrieve Whois data"),
            DomainStatus::ErrorUnretrivable
        );
    }

    #[test]
    fn test_error_reserved_by_regulator() {
        assert_eq!(
            is_domain_available("This domain is reserved by aeDA Regulator"),
            DomainStatus::ErrorReservedByRegulator
        );
    }

    #[test]
    fn test_error_unregistrable() {
        assert_eq!(
            is_domain_available("third-level domains may not start with foo"),
            DomainStatus::ErrorUnregistrable
        );
    }

    // ── Unparsable assumption ────────────────────────────────────────────

    #[test]
    fn test_unparsable_default_is_error() {
        // Default: unparsable=false → ErrorUnparsable
        let text = "some random text";
        let settings = default_settings();
        assert_eq!(
            is_domain_available_with_settings(text, &settings),
            DomainStatus::ErrorUnparsable
        );
    }

    #[test]
    fn test_unparsable_override_to_available() {
        let text = "some random text";
        let mut settings = default_settings();
        settings.unparsable = true;
        assert_eq!(
            is_domain_available_with_settings(text, &settings),
            DomainStatus::Available
        );
    }

    // ── Expired domain detection ─────────────────────────────────────────

    #[test]
    fn test_expired_domain() {
        let text = "Expiry Date: 2020-01-01";
        let mut settings = default_settings();
        settings.expired = Some(true);
        let status = is_domain_available_with_settings(text, &settings);
        assert_eq!(status, DomainStatus::Expired);
    }

    #[test]
    fn test_expired_domain_as_available() {
        let text = "Expiry Date: 2020-01-01";
        let settings = default_settings(); // expired=None → treat as available
        let status = is_domain_available_with_settings(text, &settings);
        // Expiry date < now → the expiry rule fires with DomainStatus::Available
        assert_eq!(status, DomainStatus::Available);
    }

    // ── Complex: is free + short reply ───────────────────────────────────

    #[test]
    fn test_is_free_short_reply() {
        let short = "example.com is free";
        assert_eq!(is_domain_available(short), DomainStatus::Available);
    }

    #[test]
    fn test_is_free_long_reply_not_matched() {
        let long = format!("example.com is free{}", " ".repeat(100));
        // Long reply → " is free" + short rule won't trigger.
        // It should eventually hit error patterns or unparsable.
        let status = is_domain_available(&long);
        assert_ne!(status, DomainStatus::Available);
    }

    // ── SaudiNIC ─────────────────────────────────────────────────────────

    #[test]
    fn test_saudinic_error() {
        assert_eq!(
            is_domain_available("Error. SaudiNIC response"),
            DomainStatus::Available
        );
    }

    // ── DomainStatus serde ───────────────────────────────────────────────

    #[test]
    fn test_domain_status_serialization() {
        assert_eq!(
            serde_json::to_string(&DomainStatus::Available).unwrap(),
            "\"available\""
        );
        assert_eq!(
            serde_json::to_string(&DomainStatus::Unavailable).unwrap(),
            "\"unavailable\""
        );
        assert_eq!(
            serde_json::to_string(&DomainStatus::Error).unwrap(),
            "\"error\""
        );
        assert_eq!(
            serde_json::to_string(&DomainStatus::ErrorUnparsable).unwrap(),
            "\"error:unparsable\""
        );
        assert_eq!(
            serde_json::to_string(&DomainStatus::ErrorRateLimiting).unwrap(),
            "\"error:ratelimiting\""
        );
        assert_eq!(
            serde_json::to_string(&DomainStatus::ErrorNoContent).unwrap(),
            "\"error:nocontent\""
        );
        assert_eq!(
            serde_json::to_string(&DomainStatus::ErrorForbidden).unwrap(),
            "\"error:forbidden\""
        );
        assert_eq!(
            serde_json::to_string(&DomainStatus::Expired).unwrap(),
            "\"expired\""
        );
    }

    #[test]
    fn test_domain_status_deserialization() {
        let avail: DomainStatus = serde_json::from_str("\"available\"").unwrap();
        assert_eq!(avail, DomainStatus::Available);
        let err: DomainStatus = serde_json::from_str("\"error:ratelimiting\"").unwrap();
        assert_eq!(err, DomainStatus::ErrorRateLimiting);
        let expired: DomainStatus = serde_json::from_str("\"expired\"").unwrap();
        assert_eq!(expired, DomainStatus::Expired);
    }

    #[test]
    fn test_domain_status_from_str_loose() {
        assert_eq!(
            DomainStatus::from_str_loose("available"),
            DomainStatus::Available
        );
        assert_eq!(
            DomainStatus::from_str_loose("expired"),
            DomainStatus::Expired
        );
        assert_eq!(
            DomainStatus::from_str_loose("unknown"),
            DomainStatus::ErrorUnparsable
        );
    }

    #[test]
    fn test_domain_status_as_str_roundtrip() {
        let variants = vec![
            DomainStatus::Available,
            DomainStatus::Unavailable,
            DomainStatus::Expired,
            DomainStatus::Error,
            DomainStatus::ErrorUnparsable,
            DomainStatus::ErrorNoContent,
            DomainStatus::ErrorUnauthorized,
            DomainStatus::ErrorRateLimiting,
            DomainStatus::ErrorUnretrivable,
            DomainStatus::ErrorForbidden,
            DomainStatus::ErrorReservedByRegulator,
            DomainStatus::ErrorUnregistrable,
            DomainStatus::ErrorReplyError,
        ];
        for v in variants {
            assert_eq!(DomainStatus::from_str_loose(v.as_str()), v);
        }
    }

    // ── get_domain_parameters ────────────────────────────────────────────

    #[test]
    fn test_get_domain_parameters_basic() {
        let text = "Registrar: GoDaddy LLC\nCreation Date: 2020-01-01\nExpiry Date: 2030-01-01";
        let params = get_domain_parameters(
            Some("example.com".into()),
            Some(DomainStatus::Unavailable),
            text.into(),
        );
        assert_eq!(params.domain, Some("example.com".into()));
        assert_eq!(params.registrar, Some("GoDaddy LLC".into()));
        assert_eq!(params.creation_date, Some("2020-01-01".into()));
        assert_eq!(params.expiry_date, Some("2030-01-01".into()));
    }

    #[test]
    fn test_get_domain_parameters_company_chain() {
        let text = "Registrant Organization: ACME Corp";
        let params = get_domain_parameters(None, None, text.into());
        assert_eq!(params.company, Some("ACME Corp".into()));
    }

    #[test]
    fn test_get_domain_parameters_company_fallback_admin() {
        let text = "Admin Name: John Doe";
        let params = get_domain_parameters(None, None, text.into());
        assert_eq!(params.company, Some("John Doe".into()));
    }

    #[test]
    fn test_get_domain_parameters_update_date_variants() {
        let text = "Updated Date: 2024-06-15";
        let params = get_domain_parameters(None, None, text.into());
        assert_eq!(params.update_date, Some("2024-06-15".into()));

        let text2 = "Last Updated: 2024-01-01";
        let params2 = get_domain_parameters(None, None, text2.into());
        assert_eq!(params2.update_date, Some("2024-01-01".into()));
    }

    #[test]
    fn test_get_domain_parameters_expiry_variants() {
        let text1 = "Expires: 2030-12-31";
        let params1 = get_domain_parameters(None, None, text1.into());
        assert_eq!(params1.expiry_date, Some("2030-12-31".into()));

        let text2 = "Registry Expiry Date: 2028-06-01";
        let params2 = get_domain_parameters(None, None, text2.into());
        assert_eq!(params2.expiry_date, Some("2028-06-01".into()));

        let text3 = "paid-till: 2027-03-15";
        let params3 = get_domain_parameters(None, None, text3.into());
        assert_eq!(params3.expiry_date, Some("2027-03-15".into()));
    }

    #[test]
    fn test_get_domain_parameters_empty_text() {
        let params = get_domain_parameters(None, None, "".into());
        assert!(params.registrar.is_none());
        assert!(params.company.is_none());
        assert!(params.creation_date.is_none());
        assert!(params.update_date.is_none());
        assert!(params.expiry_date.is_none());
    }

    #[test]
    fn test_get_domain_parameters_whoisreply_included() {
        let text = "Some raw WHOIS data";
        let params = get_domain_parameters(None, None, text.into());
        assert_eq!(params.whoisreply, Some("Some raw WHOIS data".into()));
    }

    #[test]
    fn test_get_domain_parameters_whois_json_present() {
        let text = "Domain Name: example.com\nRegistrar: TestCo";
        let params = get_domain_parameters(None, None, text.into());
        let json = params.whois_json.unwrap();
        assert_eq!(json.get("domainName").unwrap(), "example.com");
        assert_eq!(json.get("registrar").unwrap(), "TestCo");
    }

    // ── WhoisParams serde ────────────────────────────────────────────────

    #[test]
    fn test_whois_params_serialization() {
        let params = WhoisParams {
            domain: Some("test.com".into()),
            status: Some(DomainStatus::Available),
            registrar: None,
            company: None,
            creation_date: Some("2020-01-01".into()),
            update_date: None,
            expiry_date: None,
            whoisreply: None,
            whois_json: None,
        };
        let json = serde_json::to_string(&params).unwrap();
        assert!(json.contains("\"domain\":\"test.com\""));
        assert!(json.contains("\"creationDate\":\"2020-01-01\""));
        assert!(json.contains("\"status\":\"available\""));
    }

    #[test]
    fn test_whois_params_deserialization() {
        let json = r#"{
            "domain": "foo.com",
            "status": "unavailable",
            "registrar": "RegCo",
            "company": null,
            "creationDate": "2020-01-01",
            "updateDate": null,
            "expiryDate": "2030-01-01",
            "whoisreply": null
        }"#;
        let params: WhoisParams = serde_json::from_str(json).unwrap();
        assert_eq!(params.domain, Some("foo.com".into()));
        assert_eq!(params.status, Some(DomainStatus::Unavailable));
        assert_eq!(params.registrar, Some("RegCo".into()));
        assert!(params.company.is_none());
    }

    // ── parse_date_ms ────────────────────────────────────────────────────

    #[test]
    fn test_parse_date_ms_iso() {
        assert!(parse_date_ms("2030-01-01").is_some());
        assert!(parse_date_ms("2020-12-31").is_some());
    }

    #[test]
    fn test_parse_date_ms_garbage() {
        assert!(parse_date_ms("not-a-date").is_none());
    }

    // ── AvailabilitySettings serde ───────────────────────────────────────

    #[test]
    fn test_availability_settings_defaults() {
        let s = AvailabilitySettings::default();
        assert!(!s.uniregistry);
        assert!(!s.unparsable);
        assert!(s.expired.is_none());
    }

    #[test]
    fn test_availability_settings_from_json() {
        let json = r#"{"uniregistry": true, "unparsable": true, "expired": true}"#;
        let s: AvailabilitySettings = serde_json::from_str(json).unwrap();
        assert!(s.uniregistry);
        assert!(s.unparsable);
        assert_eq!(s.expired, Some(true));
    }
}
