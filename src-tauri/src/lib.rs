pub use wd_domain_core::*;
pub mod tauri_app;

#[cfg(feature = "domain-automation")]
pub mod automation {
    pub use wd_domain_automation::*;
}

#[cfg(feature = "domain-intelligence")]
pub mod intelligence {
    pub use wd_domain_intelligence::*;
}

#[cfg(feature = "domain-agentic")]
pub mod agentic {
    pub use wd_domain_agentic::*;
}
