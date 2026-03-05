use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// An item in the shopping cart.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CartItem {
    pub domain: String,
    pub tld: String,
    pub registrar_id: String,
    pub action: CartAction,
    /// Price in cents (USD).
    pub price_cents: Option<u64>,
    /// Duration in years.
    pub years: u32,
    /// Whether to add WHOIS privacy.
    pub privacy: bool,
    #[serde(with = "chrono::serde::ts_seconds")]
    pub added_at: DateTime<Utc>,
}

/// Action for a cart item.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CartAction {
    Register,
    Transfer,
    Renew,
}

/// Shopping cart for domain operations.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ShoppingCart {
    pub items: Vec<CartItem>,
}

impl ShoppingCart {
    pub fn new() -> Self { Self { items: vec![] } }

    pub fn add(&mut self, item: CartItem) {
        // Replace if same domain already in cart
        self.items.retain(|i| i.domain != item.domain);
        self.items.push(item);
    }

    pub fn remove(&mut self, domain: &str) -> bool {
        let before = self.items.len();
        self.items.retain(|i| i.domain != domain);
        self.items.len() < before
    }

    pub fn clear(&mut self) { self.items.clear(); }

    pub fn len(&self) -> usize { self.items.len() }
    pub fn is_empty(&self) -> bool { self.items.is_empty() }

    /// Total price in cents.
    pub fn total_cents(&self) -> u64 {
        self.items.iter().filter_map(|i| i.price_cents).sum()
    }

    /// Total price formatted as string.
    pub fn total_display(&self) -> String {
        let cents = self.total_cents();
        format!("${}.{:02}", cents / 100, cents % 100)
    }

    /// Items grouped by registrar.
    pub fn by_registrar(&self) -> std::collections::HashMap<String, Vec<&CartItem>> {
        let mut map = std::collections::HashMap::new();
        for item in &self.items {
            map.entry(item.registrar_id.clone()).or_insert_with(Vec::new).push(item);
        }
        map
    }

    /// Items for a specific action.
    pub fn by_action(&self, action: &CartAction) -> Vec<&CartItem> {
        self.items.iter().filter(|i| i.action == *action).collect()
    }

    /// Summary for display.
    pub fn summary(&self) -> String {
        let registrations = self.by_action(&CartAction::Register).len();
        let transfers = self.by_action(&CartAction::Transfer).len();
        let renewals = self.by_action(&CartAction::Renew).len();
        format!(
            "{} items: {} registrations, {} transfers, {} renewals — Total: {}",
            self.len(), registrations, transfers, renewals, self.total_display()
        )
    }
}

impl CartItem {
    pub fn register(domain: impl Into<String>, registrar_id: impl Into<String>, years: u32) -> Self {
        let domain = domain.into();
        let tld = domain.rsplit('.').next().unwrap_or("").to_string();
        Self {
            domain,
            tld,
            registrar_id: registrar_id.into(),
            action: CartAction::Register,
            price_cents: None,
            years,
            privacy: true,
            added_at: Utc::now(),
        }
    }

    pub fn transfer(domain: impl Into<String>, registrar_id: impl Into<String>) -> Self {
        let domain = domain.into();
        let tld = domain.rsplit('.').next().unwrap_or("").to_string();
        Self {
            domain,
            tld,
            registrar_id: registrar_id.into(),
            action: CartAction::Transfer,
            price_cents: None,
            years: 1,
            privacy: true,
            added_at: Utc::now(),
        }
    }

    pub fn with_price(mut self, cents: u64) -> Self {
        self.price_cents = Some(cents);
        self
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cart_add_remove() {
        let mut cart = ShoppingCart::new();
        cart.add(CartItem::register("example.com", "namecheap", 1));
        assert_eq!(cart.len(), 1);
        assert!(cart.remove("example.com"));
        assert!(cart.is_empty());
    }

    #[test]
    fn test_cart_replace_duplicate() {
        let mut cart = ShoppingCart::new();
        cart.add(CartItem::register("example.com", "namecheap", 1).with_price(999));
        cart.add(CartItem::register("example.com", "cloudflare", 1).with_price(799));
        assert_eq!(cart.len(), 1);
        assert_eq!(cart.items[0].registrar_id, "cloudflare");
    }

    #[test]
    fn test_total_price() {
        let mut cart = ShoppingCart::new();
        cart.add(CartItem::register("a.com", "nc", 1).with_price(999));
        cart.add(CartItem::register("b.com", "nc", 1).with_price(1299));
        assert_eq!(cart.total_cents(), 2298);
        assert_eq!(cart.total_display(), "$22.98");
    }

    #[test]
    fn test_by_registrar() {
        let mut cart = ShoppingCart::new();
        cart.add(CartItem::register("a.com", "nc", 1));
        cart.add(CartItem::register("b.com", "cf", 1));
        cart.add(CartItem::register("c.com", "nc", 1));
        let grouped = cart.by_registrar();
        assert_eq!(grouped.get("nc").unwrap().len(), 2);
        assert_eq!(grouped.get("cf").unwrap().len(), 1);
    }

    #[test]
    fn test_by_action() {
        let mut cart = ShoppingCart::new();
        cart.add(CartItem::register("a.com", "nc", 1));
        cart.add(CartItem::transfer("b.com", "nc"));
        assert_eq!(cart.by_action(&CartAction::Register).len(), 1);
        assert_eq!(cart.by_action(&CartAction::Transfer).len(), 1);
    }

    #[test]
    fn test_tld_extraction() {
        let item = CartItem::register("example.co.uk", "nc", 1);
        assert_eq!(item.tld, "uk");
    }

    #[test]
    fn test_summary() {
        let mut cart = ShoppingCart::new();
        cart.add(CartItem::register("a.com", "nc", 1).with_price(999));
        let s = cart.summary();
        assert!(s.contains("1 items"));
        assert!(s.contains("$9.99"));
    }
}
