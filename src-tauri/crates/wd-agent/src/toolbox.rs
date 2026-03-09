use serde::{Deserialize, Serialize};
use wd_llm::{ParamType, ToolBuilder, ToolDefinition};

/// Categorisation of tools in the toolbox.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ToolCategory {
    Whois,
    Dns,
    Export,
    Analysis,
    Security,
    DomainGen,
    History,
    Settings,
    Utility,
}

/// The toolbox holding all tool definitions available to the agent.
pub struct Toolbox {
    tools: Vec<(ToolCategory, ToolDefinition)>,
}

impl Toolbox {
    pub fn new() -> Self {
        Self { tools: Vec::new() }
    }

    /// Build a toolbox pre-loaded with all whoisdigger tool definitions.
    pub fn full() -> Self {
        let mut tb = Self::new();
        tb.register_whois_tools();
        tb.register_dns_tools();
        tb.register_export_tools();
        tb.register_analysis_tools();
        tb.register_security_tools();
        tb.register_domain_gen_tools();
        tb.register_history_tools();
        tb.register_utility_tools();
        tb
    }

    /// Add a tool.
    pub fn add(&mut self, category: ToolCategory, tool: ToolDefinition) {
        self.tools.push((category, tool));
    }

    /// Get all tool definitions (for passing to the LLM).
    pub fn all_definitions(&self) -> Vec<ToolDefinition> {
        self.tools.iter().map(|(_, t)| t.clone()).collect()
    }

    /// Get tool definitions for a specific category.
    pub fn by_category(&self, category: &ToolCategory) -> Vec<ToolDefinition> {
        self.tools
            .iter()
            .filter(|(c, _)| c == category)
            .map(|(_, t)| t.clone())
            .collect()
    }

    /// Number of tools registered.
    pub fn len(&self) -> usize {
        self.tools.len()
    }

    pub fn is_empty(&self) -> bool {
        self.tools.is_empty()
    }

    /// All tool names.
    pub fn names(&self) -> Vec<&str> {
        self.tools.iter().map(|(_, t)| t.name.as_str()).collect()
    }

    // ─── Registration helpers ────────────────────────────────────────────

    fn register_whois_tools(&mut self) {
        self.add(
            ToolCategory::Whois,
            ToolBuilder::new("whois_lookup", "Look up WHOIS information for a domain")
                .param("domain", ParamType::String, "Domain name to look up", true)
                .param("server", ParamType::String, "WHOIS server to query", false)
                .build(),
        );
        self.add(
            ToolCategory::Whois,
            ToolBuilder::new(
                "bulk_whois",
                "Look up WHOIS information for multiple domains",
            )
            .param(
                "domains",
                ParamType::Array(Box::new(ParamType::String)),
                "List of domain names",
                true,
            )
            .build(),
        );
        self.add(
            ToolCategory::Whois,
            ToolBuilder::new("rdap_lookup", "RDAP protocol lookup for a domain")
                .param("domain", ParamType::String, "Domain name to look up", true)
                .build(),
        );
        self.add(
            ToolCategory::Whois,
            ToolBuilder::new("parse_whois", "Parse raw WHOIS text into structured fields")
                .param(
                    "raw_whois",
                    ParamType::String,
                    "Raw WHOIS response text",
                    true,
                )
                .build(),
        );
    }

    fn register_dns_tools(&mut self) {
        self.add(
            ToolCategory::Dns,
            ToolBuilder::new("dns_lookup", "Resolve DNS records for a domain")
                .param("domain", ParamType::String, "Domain name to resolve", true)
                .param(
                    "record_type",
                    ParamType::Enum(vec![
                        "A".into(),
                        "AAAA".into(),
                        "MX".into(),
                        "NS".into(),
                        "TXT".into(),
                        "CNAME".into(),
                        "SOA".into(),
                    ]),
                    "DNS record type",
                    false,
                )
                .build(),
        );
        self.add(
            ToolCategory::Dns,
            ToolBuilder::new("reverse_dns", "Reverse DNS lookup for an IP address")
                .param("ip", ParamType::String, "IP address to resolve", true)
                .build(),
        );
    }

    fn register_export_tools(&mut self) {
        self.add(
            ToolCategory::Export,
            ToolBuilder::new("export_csv", "Export results to CSV format")
                .param(
                    "data",
                    ParamType::Array(Box::new(ParamType::String)),
                    "Data rows to export",
                    true,
                )
                .param("filename", ParamType::String, "Output filename", false)
                .build(),
        );
        self.add(
            ToolCategory::Export,
            ToolBuilder::new("export_json", "Export results to JSON format")
                .param("data", ParamType::String, "JSON data to export", true)
                .param("filename", ParamType::String, "Output filename", false)
                .build(),
        );
    }

    fn register_analysis_tools(&mut self) {
        self.add(
            ToolCategory::Analysis,
            ToolBuilder::new("check_expiry", "Check domain expiry date and urgency")
                .param(
                    "domain",
                    ParamType::String,
                    "Domain to check expiry for",
                    true,
                )
                .build(),
        );
        self.add(
            ToolCategory::Analysis,
            ToolBuilder::new(
                "check_availability",
                "Check if a domain is available for registration",
            )
            .param("domain", ParamType::String, "Domain to check", true)
            .build(),
        );
        self.add(
            ToolCategory::Analysis,
            ToolBuilder::new("domain_stats", "Get statistics for a domain list")
                .param(
                    "domains",
                    ParamType::Array(Box::new(ParamType::String)),
                    "List of domains to analyse",
                    true,
                )
                .build(),
        );
    }

    fn register_security_tools(&mut self) {
        self.add(
            ToolCategory::Security,
            ToolBuilder::new("threat_scan", "Scan domain for security threats")
                .param("domain", ParamType::String, "Domain to scan", true)
                .build(),
        );
        self.add(
            ToolCategory::Security,
            ToolBuilder::new(
                "generate_typosquats",
                "Generate typosquat candidates for a domain",
            )
            .param(
                "domain",
                ParamType::String,
                "Domain to generate typosquats for",
                true,
            )
            .param(
                "max_results",
                ParamType::Integer,
                "Maximum number of results",
                false,
            )
            .build(),
        );
        self.add(
            ToolCategory::Security,
            ToolBuilder::new("homoglyph_check", "Check domain for homoglyph/IDN attacks")
                .param("domain", ParamType::String, "Domain to check", true)
                .build(),
        );
    }

    fn register_domain_gen_tools(&mut self) {
        self.add(
            ToolCategory::DomainGen,
            ToolBuilder::new("generate_domains", "Generate domain name suggestions")
                .param(
                    "keywords",
                    ParamType::Array(Box::new(ParamType::String)),
                    "Keywords to base suggestions on",
                    true,
                )
                .param(
                    "tlds",
                    ParamType::Array(Box::new(ParamType::String)),
                    "TLDs to use",
                    false,
                )
                .param(
                    "max_results",
                    ParamType::Integer,
                    "Maximum suggestions",
                    false,
                )
                .build(),
        );
    }

    fn register_history_tools(&mut self) {
        self.add(
            ToolCategory::History,
            ToolBuilder::new("get_history", "Get WHOIS lookup history for a domain")
                .param(
                    "domain",
                    ParamType::String,
                    "Domain to get history for",
                    true,
                )
                .param("limit", ParamType::Integer, "Max records to return", false)
                .build(),
        );
        self.add(
            ToolCategory::History,
            ToolBuilder::new("diff_whois", "Compare two WHOIS records")
                .param("domain", ParamType::String, "Domain name", true)
                .param("record_a", ParamType::String, "First WHOIS record", true)
                .param("record_b", ParamType::String, "Second WHOIS record", true)
                .build(),
        );
    }

    fn register_utility_tools(&mut self) {
        self.add(
            ToolCategory::Utility,
            ToolBuilder::new("get_settings", "Get current application settings").build(),
        );
        self.add(
            ToolCategory::Utility,
            ToolBuilder::new("get_cache_stats", "Get cache statistics").build(),
        );
        self.add(
            ToolCategory::Utility,
            ToolBuilder::new("clear_cache", "Clear the WHOIS cache")
                .param(
                    "domain",
                    ParamType::String,
                    "Specific domain to clear (or all)",
                    false,
                )
                .build(),
        );
    }
}

impl Default for Toolbox {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_toolbox() {
        let tb = Toolbox::new();
        assert!(tb.is_empty());
        assert_eq!(tb.len(), 0);
    }

    #[test]
    fn test_full_toolbox() {
        let tb = Toolbox::full();
        assert!(tb.len() >= 15);
        assert!(!tb.is_empty());
    }

    #[test]
    fn test_by_category() {
        let tb = Toolbox::full();
        let whois = tb.by_category(&ToolCategory::Whois);
        assert!(whois.len() >= 3);
        let dns = tb.by_category(&ToolCategory::Dns);
        assert!(dns.len() >= 1);
    }

    #[test]
    fn test_all_definitions() {
        let tb = Toolbox::full();
        let defs = tb.all_definitions();
        assert_eq!(defs.len(), tb.len());
    }

    #[test]
    fn test_names() {
        let tb = Toolbox::full();
        let names = tb.names();
        assert!(names.contains(&"whois_lookup"));
        assert!(names.contains(&"dns_lookup"));
        assert!(names.contains(&"threat_scan"));
    }

    #[test]
    fn test_tool_definitions_valid() {
        let tb = Toolbox::full();
        for def in tb.all_definitions() {
            assert!(!def.name.is_empty(), "Tool has empty name");
            assert!(
                !def.description.is_empty(),
                "Tool {} has empty description",
                def.name
            );
            // Should serialise to OpenAI format without panicking
            let _json = def.to_openai_json();
        }
    }

    #[test]
    fn test_add_custom_tool() {
        let mut tb = Toolbox::new();
        let tool = ToolBuilder::new("custom", "A custom tool")
            .param("input", ParamType::String, "The input value", true)
            .build();
        tb.add(ToolCategory::Utility, tool);
        assert_eq!(tb.len(), 1);
        assert!(tb.names().contains(&"custom"));
    }
}
