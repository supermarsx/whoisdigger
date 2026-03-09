use serde::{Deserialize, Serialize};

/// An affiliate link for a registrar.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AffiliateLink {
    pub registrar_id: String,
    pub domain: String,
    pub action: String,
    pub url: String,
}

/// Build an affiliate / direct purchase URL for a domain on a registrar.
pub fn build_affiliate_url(
    registrar_id: &str,
    domain: &str,
    affiliate_tag: Option<&str>,
) -> Option<AffiliateLink> {
    let url = match registrar_id {
        "namecheap" => {
            let base = format!(
                "https://www.namecheap.com/domains/registration/results/?domain={}",
                domain
            );
            match affiliate_tag {
                Some(tag) => format!("{}&aff={}", base, tag),
                None => base,
            }
        }
        "cloudflare" => {
            format!("https://www.cloudflare.com/products/registrar/")
        }
        "godaddy" => {
            let base = format!(
                "https://www.godaddy.com/domainsearch/find?domainToCheck={}",
                domain
            );
            match affiliate_tag {
                Some(tag) => format!("{}&isc={}", base, tag),
                None => base,
            }
        }
        "porkbun" => {
            format!("https://porkbun.com/checkout/search?q={}", domain)
        }
        "dynadot" => {
            let base = format!("https://www.dynadot.com/domain/search?domain={}", domain);
            match affiliate_tag {
                Some(tag) => format!("{}&aff={}", base, tag),
                None => base,
            }
        }
        "gandi" => {
            format!("https://shop.gandi.net/en/domain/suggest?search={}", domain)
        }
        _ => return None,
    };

    Some(AffiliateLink {
        registrar_id: registrar_id.to_string(),
        domain: domain.to_string(),
        action: "search".into(),
        url,
    })
}

/// Build purchase URLs for all known registrars.
pub fn build_all_affiliate_urls(
    domain: &str,
    affiliate_tags: &std::collections::HashMap<String, String>,
) -> Vec<AffiliateLink> {
    let registrar_ids = [
        "namecheap",
        "cloudflare",
        "godaddy",
        "porkbun",
        "dynadot",
        "gandi",
    ];
    registrar_ids
        .iter()
        .filter_map(|id| {
            let tag = affiliate_tags.get(*id).map(|s| s.as_str());
            build_affiliate_url(id, domain, tag)
        })
        .collect()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_namecheap_url() {
        let link = build_affiliate_url("namecheap", "example.com", None).unwrap();
        assert!(link.url.contains("namecheap.com"));
        assert!(link.url.contains("example.com"));
    }

    #[test]
    fn test_namecheap_affiliate() {
        let link = build_affiliate_url("namecheap", "test.com", Some("12345")).unwrap();
        assert!(link.url.contains("aff=12345"));
    }

    #[test]
    fn test_godaddy_url() {
        let link = build_affiliate_url("godaddy", "example.com", None).unwrap();
        assert!(link.url.contains("godaddy.com"));
    }

    #[test]
    fn test_porkbun_url() {
        let link = build_affiliate_url("porkbun", "example.com", None).unwrap();
        assert!(link.url.contains("porkbun.com"));
    }

    #[test]
    fn test_unknown_registrar() {
        assert!(build_affiliate_url("unknown", "test.com", None).is_none());
    }

    #[test]
    fn test_build_all() {
        let tags = std::collections::HashMap::new();
        let links = build_all_affiliate_urls("example.com", &tags);
        assert!(links.len() >= 5);
    }
}
