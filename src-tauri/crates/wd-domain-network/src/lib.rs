pub use wd_lookup::{
    convert_domain, get_follow, get_time_between, get_timeout, perform_lookup_with_settings,
    prepare_domain, psl_clean, ConversionAlgorithm, ConversionSettings, LookupGeneralSettings,
    LookupSettings, RandomizeSettings,
};
pub use wd_lookup::{dns_lookup, perform_lookup, rdap_lookup};

pub mod lookup {
    pub use wd_lookup::*;
}

pub mod proxy {
    pub use wd_proxy::*;
}
