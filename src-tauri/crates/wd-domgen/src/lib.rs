//! # wd-domgen
//!
//! Comprehensive domain name generation, combination, and mutation engine.
//!
//! ## Modules
//!
//! - **combinator** – prefix/suffix/TLD matrix expansion
//! - **mutator** – character substitution, hyphenation, typosquatting detection
//! - **generator** – rule-based and AI-prompt domain suggestion
//! - **filter** – dedup, length, charset, and blocklist filtering

pub mod combinator;
pub mod filter;
pub mod generator;
pub mod mutator;

pub use combinator::{CombinatorConfig, expand_combinations};
pub use filter::{DomainFilter, FilterConfig};
pub use generator::{GeneratedDomain, GeneratorConfig, GeneratorEngine};
pub use mutator::{MutationKind, MutatorConfig, mutate_domain};
