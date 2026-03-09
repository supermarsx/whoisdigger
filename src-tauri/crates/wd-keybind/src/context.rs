use serde::{Deserialize, Serialize};

/// Context in which a key binding is active.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum KeyContext {
    /// Active everywhere.
    Global,
    /// Only on the single WHOIS page.
    SingleWhois,
    /// Only on the bulk WHOIS page.
    BulkWhois,
    /// Only on the options page.
    Options,
    /// Only on the export page.
    Export,
    /// Only on the history page.
    History,
    /// When a text input is focused.
    TextInput,
    /// When a modal/dialog is open.
    Modal,
    /// Custom context.
    Custom(String),
}

impl KeyContext {
    /// Check if this context is active in a given set of active contexts.
    pub fn is_active_in(&self, active: &[KeyContext]) -> bool {
        if *self == KeyContext::Global {
            return true;
        }
        active.contains(self)
    }

    /// Display name for the context.
    pub fn display_name(&self) -> &str {
        match self {
            KeyContext::Global => "Global",
            KeyContext::SingleWhois => "Single WHOIS",
            KeyContext::BulkWhois => "Bulk WHOIS",
            KeyContext::Options => "Options",
            KeyContext::Export => "Export",
            KeyContext::History => "History",
            KeyContext::TextInput => "Text Input",
            KeyContext::Modal => "Modal",
            KeyContext::Custom(s) => s.as_str(),
        }
    }
}

impl Default for KeyContext {
    fn default() -> Self {
        KeyContext::Global
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_global_always_active() {
        assert!(KeyContext::Global.is_active_in(&[]));
        assert!(KeyContext::Global.is_active_in(&[KeyContext::BulkWhois]));
    }

    #[test]
    fn test_context_active_when_present() {
        assert!(KeyContext::BulkWhois.is_active_in(&[KeyContext::BulkWhois, KeyContext::Global]));
    }

    #[test]
    fn test_context_inactive_when_absent() {
        assert!(!KeyContext::SingleWhois.is_active_in(&[KeyContext::BulkWhois]));
    }

    #[test]
    fn test_display_name() {
        assert_eq!(KeyContext::Global.display_name(), "Global");
        assert_eq!(
            KeyContext::Custom("My Context".into()).display_name(),
            "My Context"
        );
    }

    #[test]
    fn test_default_is_global() {
        assert_eq!(KeyContext::default(), KeyContext::Global);
    }
}
