//! # wd-registrar
//!
//! Registrar integration layer. Defines registrar provider metadata, shopping
//! cart for domain purchases, bulk transfer initiation, and affiliate link
//! generation. Designed to work with common registrar APIs and public purchase
//! flows.

pub mod provider;
pub mod cart;
pub mod transfer;
pub mod affiliate;

pub use provider::{Registrar, RegistrarCapability, RegistrarRegistry};
pub use cart::{CartItem, ShoppingCart, CartAction};
pub use transfer::{TransferRequest, TransferBatch, TransferStatus};
pub use affiliate::{AffiliateLink, build_affiliate_url};
