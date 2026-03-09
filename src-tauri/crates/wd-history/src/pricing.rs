use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A known domain registrar.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
pub struct Registrar {
    pub name: String,
    pub slug: String,
    pub url: String,
    /// API endpoint for price lookups (if available).
    pub api_url: Option<String>,
    /// Whether this registrar is ICANN-accredited.
    pub icann_accredited: bool,
}

/// A price quote for a single TLD at a single registrar.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PriceQuote {
    pub registrar: String,
    pub tld: String,
    /// Registration price in USD cents.
    pub register_cents: Option<u64>,
    /// Renewal price in USD cents.
    pub renewal_cents: Option<u64>,
    /// Transfer price in USD cents.
    pub transfer_cents: Option<u64>,
    /// Currency code (default "USD").
    pub currency: String,
    /// Whether WHOIS privacy is included.
    pub privacy_included: bool,
    /// Source of this price data.
    pub source: PriceSource,
}

/// Where a price came from.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PriceSource {
    Api,
    Scrape,
    Manual,
    Cached,
}

/// Pricing data for a single TLD across registrars.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TldPricing {
    pub tld: String,
    pub quotes: Vec<PriceQuote>,
}

impl TldPricing {
    pub fn new(tld: impl Into<String>) -> Self {
        Self {
            tld: tld.into(),
            quotes: Vec::new(),
        }
    }

    pub fn add_quote(&mut self, quote: PriceQuote) {
        self.quotes.push(quote);
    }

    /// Return the cheapest registration quote.
    pub fn cheapest_registration(&self) -> Option<&PriceQuote> {
        self.quotes
            .iter()
            .filter(|q| q.register_cents.is_some())
            .min_by_key(|q| q.register_cents.unwrap_or(u64::MAX))
    }

    /// Return the cheapest renewal quote.
    pub fn cheapest_renewal(&self) -> Option<&PriceQuote> {
        self.quotes
            .iter()
            .filter(|q| q.renewal_cents.is_some())
            .min_by_key(|q| q.renewal_cents.unwrap_or(u64::MAX))
    }

    /// Sort quotes by registration price ascending.
    pub fn sorted_by_registration(&self) -> Vec<&PriceQuote> {
        let mut sorted: Vec<_> = self
            .quotes
            .iter()
            .filter(|q| q.register_cents.is_some())
            .collect();
        sorted.sort_by_key(|q| q.register_cents.unwrap_or(u64::MAX));
        sorted
    }
}

/// Aggregated pricing intelligence across multiple TLDs & registrars.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct RegistrarPricing {
    pub tlds: HashMap<String, TldPricing>,
}

impl RegistrarPricing {
    pub fn new() -> Self {
        Self {
            tlds: HashMap::new(),
        }
    }

    /// Add a price quote, creating the TLD bucket if needed.
    pub fn add_quote(&mut self, tld: &str, quote: PriceQuote) {
        self.tlds
            .entry(tld.to_lowercase())
            .or_insert_with(|| TldPricing::new(tld))
            .add_quote(quote);
    }

    /// Get pricing for a specific TLD.
    pub fn get_tld(&self, tld: &str) -> Option<&TldPricing> {
        self.tlds.get(&tld.to_lowercase())
    }

    /// Return the globally cheapest registration across all TLDs.
    pub fn cheapest_overall_registration(&self) -> Option<&PriceQuote> {
        self.tlds
            .values()
            .filter_map(|t| t.cheapest_registration())
            .min_by_key(|q| q.register_cents.unwrap_or(u64::MAX))
    }

    /// Built-in set of well-known registrars with their API endpoints.
    pub fn known_registrars() -> Vec<Registrar> {
        vec![
            Registrar {
                name: "Namecheap".into(),
                slug: "namecheap".into(),
                url: "https://www.namecheap.com".into(),
                api_url: Some("https://api.namecheap.com/xml.response".into()),
                icann_accredited: true,
            },
            Registrar {
                name: "Cloudflare Registrar".into(),
                slug: "cloudflare".into(),
                url: "https://www.cloudflare.com/products/registrar/".into(),
                api_url: Some("https://api.cloudflare.com/client/v4/accounts".into()),
                icann_accredited: true,
            },
            Registrar {
                name: "GoDaddy".into(),
                slug: "godaddy".into(),
                url: "https://www.godaddy.com".into(),
                api_url: Some("https://api.godaddy.com/v1/domains".into()),
                icann_accredited: true,
            },
            Registrar {
                name: "Google Domains (Squarespace)".into(),
                slug: "google".into(),
                url: "https://domains.squarespace.com".into(),
                api_url: None,
                icann_accredited: true,
            },
            Registrar {
                name: "Porkbun".into(),
                slug: "porkbun".into(),
                url: "https://porkbun.com".into(),
                api_url: Some("https://api.porkbun.com/api/json/v3".into()),
                icann_accredited: true,
            },
            Registrar {
                name: "Dynadot".into(),
                slug: "dynadot".into(),
                url: "https://www.dynadot.com".into(),
                api_url: Some("https://api.dynadot.com/api3.json".into()),
                icann_accredited: true,
            },
            Registrar {
                name: "Gandi".into(),
                slug: "gandi".into(),
                url: "https://www.gandi.net".into(),
                api_url: Some("https://api.gandi.net/v5".into()),
                icann_accredited: true,
            },
        ]
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn quote(registrar: &str, tld: &str, cents: u64) -> PriceQuote {
        PriceQuote {
            registrar: registrar.into(),
            tld: tld.into(),
            register_cents: Some(cents),
            renewal_cents: Some(cents + 200),
            transfer_cents: Some(cents + 100),
            currency: "USD".into(),
            privacy_included: false,
            source: PriceSource::Manual,
        }
    }

    #[test]
    fn test_tld_cheapest() {
        let mut tp = TldPricing::new("com");
        tp.add_quote(quote("GoDaddy", "com", 1199));
        tp.add_quote(quote("Cloudflare", "com", 899));
        tp.add_quote(quote("Namecheap", "com", 999));
        let cheapest = tp.cheapest_registration().unwrap();
        assert_eq!(cheapest.registrar, "Cloudflare");
        assert_eq!(cheapest.register_cents, Some(899));
    }

    #[test]
    fn test_sorted_by_registration() {
        let mut tp = TldPricing::new("io");
        tp.add_quote(quote("A", "io", 3000));
        tp.add_quote(quote("B", "io", 1500));
        tp.add_quote(quote("C", "io", 2000));
        let sorted = tp.sorted_by_registration();
        assert_eq!(sorted[0].registrar, "B");
        assert_eq!(sorted[1].registrar, "C");
        assert_eq!(sorted[2].registrar, "A");
    }

    #[test]
    fn test_registrar_pricing_aggregate() {
        let mut rp = RegistrarPricing::new();
        rp.add_quote("com", quote("A", "com", 1200));
        rp.add_quote("com", quote("B", "com", 800));
        rp.add_quote("io", quote("A", "io", 3000));
        let cheapest = rp.cheapest_overall_registration().unwrap();
        assert_eq!(cheapest.register_cents, Some(800));
    }

    #[test]
    fn test_known_registrars() {
        let regs = RegistrarPricing::known_registrars();
        assert!(regs.len() >= 5);
        assert!(regs.iter().any(|r| r.slug == "cloudflare"));
        assert!(regs.iter().any(|r| r.slug == "porkbun"));
    }

    #[test]
    fn test_pricing_serialization() {
        let mut rp = RegistrarPricing::new();
        rp.add_quote("com", quote("X", "com", 999));
        let json = serde_json::to_string(&rp).unwrap();
        let deser: RegistrarPricing = serde_json::from_str(&json).unwrap();
        assert_eq!(deser.get_tld("com").unwrap().quotes.len(), 1);
    }
}
