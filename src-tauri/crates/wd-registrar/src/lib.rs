//! # wd-registrar
//!
//! Registrar integration layer. Defines registrar provider metadata, shopping
//! cart for domain purchases, bulk transfer initiation, and affiliate link
//! generation. Designed to work with common registrar APIs and public purchase
//! flows.

pub mod affiliate;
pub mod cart;
pub mod provider;
pub mod transfer;

pub use affiliate::{build_affiliate_url, AffiliateLink};
pub use cart::{CartAction, CartItem, ShoppingCart};
pub use provider::{Registrar, RegistrarCapability, RegistrarRegistry};
pub use transfer::{TransferBatch, TransferRequest, TransferStatus};
