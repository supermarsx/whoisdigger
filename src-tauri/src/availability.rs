use serde::{Serialize, Deserialize};
use crate::parser::parse_raw_data;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum DomainStatus {
    #[serde(rename = "available")]
    Available,
    #[serde(rename = "unavailable")]
    Unavailable,
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "error:unparsable")]
    ErrorUnparsable,
    #[serde(rename = "error:ratelimiting")]
    ErrorRateLimiting,
}

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
}

const AVAILABLE_PATTERNS: &[&str] = &[
    "No match for domain",
    "- No Match",
    "NO MATCH:",
    "No match for",
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
    "is not valid!"
];

const UNAVAILABLE_PATTERNS: &[&str] = &[
    "Domain Status:ok",
    "Expiration Date:",
    "Expiry Date:",
    "Status: connect",
    "Changed:",
    "organisation: Internet Assigned Numbers Authority"
];

pub fn is_domain_available(results_text: &str) -> DomainStatus {
    for p in AVAILABLE_PATTERNS {
        if results_text.contains(p) {
            return DomainStatus::Available;
        }
    }

    for p in UNAVAILABLE_PATTERNS {
        if results_text.contains(p) {
            return DomainStatus::Unavailable;
        }
    }

    if results_text.contains("Uniregistry") && results_text.contains("Query limit exceeded") {
        return DomainStatus::ErrorRateLimiting;
    }

    DomainStatus::Unavailable // Default to unavailable if no clear available pattern matches
}

pub fn get_domain_parameters(
    domain: Option<String>,
    status: Option<DomainStatus>,
    results_text: String,
) -> WhoisParams {
    let results_json = parse_raw_data(&results_text);
    
    let registrar = results_json.get("registrar").cloned();
    let company = results_json.get("registrantOrganization")
        .or_else(|| results_json.get("registrant"))
        .or_else(|| results_json.get("adminName"))
        .or_else(|| results_json.get("ownerName"))
        .or_else(|| results_json.get("contact"))
        .or_else(|| results_json.get("name"))
        .cloned();
        
    let creation_date = results_json.get("creationDate")
        .or_else(|| results_json.get("createdDate"))
        .or_else(|| results_json.get("created"))
        .or_else(|| results_json.get("registered"))
        .or_else(|| results_json.get("registeredOn"))
        .cloned();

    let update_date = results_json.get("updatedDate")
        .or_else(|| results_json.get("lastUpdated"))
        .or_else(|| results_json.get("UpdatedDate"))
        .or_else(|| results_json.get("changed"))
        .or_else(|| results_json.get("lastModified"))
        .or_else(|| results_json.get("lastUpdate"))
        .cloned();

    let expiry_date = results_json.get("expires")
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
        whoisreply: Some(results_text),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── is_domain_available ──────────────────────────────────────────────

    #[test]
    fn test_is_domain_available() {
        assert_eq!(is_domain_available("No match for domain example.com"), DomainStatus::Available);
        assert_eq!(is_domain_available("Status: free"), DomainStatus::Available);
        assert_eq!(is_domain_available("Domain Status:ok"), DomainStatus::Unavailable);
        assert_eq!(is_domain_available("Expiration Date: 2025-01-01"), DomainStatus::Unavailable);
        assert_eq!(is_domain_available("Uniregistry Query limit exceeded"), DomainStatus::ErrorRateLimiting);
    }

    #[test]
    fn test_availability_edge_cases() {
        // Empty text
        assert_eq!(is_domain_available(""), DomainStatus::Unavailable);

        // Conflicting patterns (Available pattern usually takes precedence in simple matching)
        assert_eq!(is_domain_available("No match for domain but Expiration Date: 2020"), DomainStatus::Available);

        // No patterns matching
        assert_eq!(is_domain_available("some random text with no keywords"), DomainStatus::Unavailable);

        // Case sensitivity (our patterns are currently exact, we should check if they should be case-insensitive)
        // The original JS used text.includes(p), which is case-sensitive.
        assert_eq!(is_domain_available("STATUS: AVAILABLE"), DomainStatus::Unavailable); // Case mismatch
    }

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

    #[test]
    fn test_uniregistry_rate_limit() {
        assert_eq!(
            is_domain_available("Uniregistry  blah blah Query limit exceeded  blah"),
            DomainStatus::ErrorRateLimiting
        );
    }

    #[test]
    fn test_uniregistry_without_limit() {
        // Has Uniregistry but not rate limit text
        assert_eq!(
            is_domain_available("Uniregistry Registrar"),
            DomainStatus::Unavailable
        );
    }

    // ── DomainStatus serde ───────────────────────────────────────────────

    #[test]
    fn test_domain_status_serialization() {
        assert_eq!(serde_json::to_string(&DomainStatus::Available).unwrap(), "\"available\"");
        assert_eq!(serde_json::to_string(&DomainStatus::Unavailable).unwrap(), "\"unavailable\"");
        assert_eq!(serde_json::to_string(&DomainStatus::Error).unwrap(), "\"error\"");
        assert_eq!(serde_json::to_string(&DomainStatus::ErrorUnparsable).unwrap(), "\"error:unparsable\"");
        assert_eq!(serde_json::to_string(&DomainStatus::ErrorRateLimiting).unwrap(), "\"error:ratelimiting\"");
    }

    #[test]
    fn test_domain_status_deserialization() {
        let avail: DomainStatus = serde_json::from_str("\"available\"").unwrap();
        assert_eq!(avail, DomainStatus::Available);
        let err: DomainStatus = serde_json::from_str("\"error:ratelimiting\"").unwrap();
        assert_eq!(err, DomainStatus::ErrorRateLimiting);
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
        // Should try registrantOrganization first, then registrant, etc.
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
}