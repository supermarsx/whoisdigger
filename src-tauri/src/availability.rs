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

    }

    