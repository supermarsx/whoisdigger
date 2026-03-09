use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fmt;

/// Configuration for the sandbox.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SandboxConfig {
    /// Maximum total cost (USD) allowed.
    #[serde(default = "default_max_cost")]
    pub max_cost_usd: f64,
    /// Maximum tool calls per run.
    #[serde(default = "default_max_tool_calls")]
    pub max_tool_calls: usize,
    /// Tools that are explicitly blocked.
    #[serde(default)]
    pub blocked_tools: HashSet<String>,
    /// Tools that are explicitly allowed (if non-empty, acts as allowlist).
    #[serde(default)]
    pub allowed_tools: HashSet<String>,
    /// Whether to require user confirmation for destructive operations.
    #[serde(default)]
    pub require_confirmation: bool,
}

fn default_max_cost() -> f64 {
    5.0
}

fn default_max_tool_calls() -> usize {
    50
}

impl Default for SandboxConfig {
    fn default() -> Self {
        Self {
            max_cost_usd: default_max_cost(),
            max_tool_calls: default_max_tool_calls(),
            blocked_tools: HashSet::new(),
            allowed_tools: HashSet::new(),
            require_confirmation: false,
        }
    }
}

/// A safety violation caught by the sandbox.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum SandboxViolation {
    ToolBlocked { tool_name: String },
    ToolNotAllowed { tool_name: String },
    CostLimitExceeded { spent: f64, limit: f64 },
    ToolCallLimitExceeded { count: usize, limit: usize },
    ConfirmationRequired { tool_name: String },
}

impl fmt::Display for SandboxViolation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ToolBlocked { tool_name } => write!(f, "Tool '{tool_name}' is blocked"),
            Self::ToolNotAllowed { tool_name } => {
                write!(f, "Tool '{tool_name}' is not in the allow list")
            }
            Self::CostLimitExceeded { spent, limit } => {
                write!(f, "Cost limit exceeded: ${spent:.4} of ${limit:.2}")
            }
            Self::ToolCallLimitExceeded { count, limit } => {
                write!(f, "Tool call limit exceeded: {count}/{limit}")
            }
            Self::ConfirmationRequired { tool_name } => {
                write!(f, "Tool '{tool_name}' requires user confirmation")
            }
        }
    }
}

/// Safety sandbox that validates agent actions.
pub struct Sandbox {
    config: SandboxConfig,
    tool_call_count: usize,
    total_cost: f64,
    /// Tools that require confirmation.
    confirmation_required: HashSet<String>,
}

impl Sandbox {
    pub fn new(config: SandboxConfig) -> Self {
        Self {
            config,
            tool_call_count: 0,
            total_cost: 0.0,
            confirmation_required: HashSet::new(),
        }
    }

    /// Add a tool to the block list.
    pub fn block_tool(&mut self, name: &str) {
        self.config.blocked_tools.insert(name.to_string());
    }

    /// Add a tool to the allow list.
    pub fn allow_tool(&mut self, name: &str) {
        self.config.allowed_tools.insert(name.to_string());
    }

    /// Mark a tool as requiring user confirmation.
    pub fn require_confirmation_for(&mut self, name: &str) {
        self.confirmation_required.insert(name.to_string());
    }

    /// Check whether a tool call is permitted.
    pub fn check_tool(&self, name: &str) -> Result<(), SandboxViolation> {
        // Check block list
        if self.config.blocked_tools.contains(name) {
            return Err(SandboxViolation::ToolBlocked {
                tool_name: name.to_string(),
            });
        }

        // Check allow list (if non-empty, only allowed tools are permitted)
        if !self.config.allowed_tools.is_empty() && !self.config.allowed_tools.contains(name) {
            return Err(SandboxViolation::ToolNotAllowed {
                tool_name: name.to_string(),
            });
        }

        // Check tool call count
        if self.tool_call_count >= self.config.max_tool_calls {
            return Err(SandboxViolation::ToolCallLimitExceeded {
                count: self.tool_call_count,
                limit: self.config.max_tool_calls,
            });
        }

        // Check confirmation requirement
        if self.config.require_confirmation && self.confirmation_required.contains(name) {
            return Err(SandboxViolation::ConfirmationRequired {
                tool_name: name.to_string(),
            });
        }

        Ok(())
    }

    /// Check whether a cost is within budget.
    pub fn check_cost(&self, additional_cost: f64) -> Result<(), SandboxViolation> {
        let projected = self.total_cost + additional_cost;
        if projected > self.config.max_cost_usd {
            return Err(SandboxViolation::CostLimitExceeded {
                spent: projected,
                limit: self.config.max_cost_usd,
            });
        }
        Ok(())
    }

    /// Record a tool call (increment counter).
    pub fn record_tool_call(&mut self) {
        self.tool_call_count += 1;
    }

    /// Record cost spent.
    pub fn record_cost(&mut self, cost: f64) {
        self.total_cost += cost;
    }

    /// Reset counters (for a new run).
    pub fn reset(&mut self) {
        self.tool_call_count = 0;
        self.total_cost = 0.0;
    }

    /// Current tool call count.
    pub fn tool_call_count(&self) -> usize {
        self.tool_call_count
    }

    /// Current total cost.
    pub fn total_cost(&self) -> f64 {
        self.total_cost
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_sandbox_allows_all() {
        let sb = Sandbox::new(SandboxConfig::default());
        assert!(sb.check_tool("any_tool").is_ok());
    }

    #[test]
    fn test_block_tool() {
        let mut sb = Sandbox::new(SandboxConfig::default());
        sb.block_tool("danger");
        assert!(sb.check_tool("danger").is_err());
        assert!(sb.check_tool("safe").is_ok());
    }

    #[test]
    fn test_allow_list() {
        let mut sb = Sandbox::new(SandboxConfig::default());
        sb.allow_tool("whois_lookup");
        assert!(sb.check_tool("whois_lookup").is_ok());
        assert!(sb.check_tool("other_tool").is_err());
    }

    #[test]
    fn test_tool_call_limit() {
        let config = SandboxConfig {
            max_tool_calls: 2,
            ..Default::default()
        };
        let mut sb = Sandbox::new(config);
        assert!(sb.check_tool("a").is_ok());
        sb.record_tool_call();
        sb.record_tool_call();
        let err = sb.check_tool("a").unwrap_err();
        assert!(matches!(
            err,
            SandboxViolation::ToolCallLimitExceeded { .. }
        ));
    }

    #[test]
    fn test_cost_limit() {
        let config = SandboxConfig {
            max_cost_usd: 1.0,
            ..Default::default()
        };
        let sb = Sandbox::new(config);
        assert!(sb.check_cost(0.5).is_ok());
        assert!(sb.check_cost(1.5).is_err());
    }

    #[test]
    fn test_reset() {
        let mut sb = Sandbox::new(SandboxConfig::default());
        sb.record_tool_call();
        sb.record_cost(0.1);
        sb.reset();
        assert_eq!(sb.tool_call_count(), 0);
        assert!((sb.total_cost() - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_violation_display() {
        let v = SandboxViolation::ToolBlocked {
            tool_name: "test".into(),
        };
        let s = v.to_string();
        assert!(s.contains("blocked"));
    }

    #[test]
    fn test_confirmation_required() {
        let config = SandboxConfig {
            require_confirmation: true,
            ..Default::default()
        };
        let mut sb = Sandbox::new(config);
        sb.require_confirmation_for("clear_cache");
        let err = sb.check_tool("clear_cache").unwrap_err();
        assert!(matches!(err, SandboxViolation::ConfirmationRequired { .. }));
        // Non-confirmation tools pass
        assert!(sb.check_tool("whois_lookup").is_ok());
    }
}
