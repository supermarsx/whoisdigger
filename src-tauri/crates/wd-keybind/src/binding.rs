use serde::{Deserialize, Serialize};

/// Keyboard modifier keys.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum Modifier {
    Ctrl,
    Shift,
    Alt,
    /// Cmd on Mac, Win on Windows.
    Meta,
}

impl std::fmt::Display for Modifier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Modifier::Ctrl => write!(f, "Ctrl"),
            Modifier::Shift => write!(f, "Shift"),
            Modifier::Alt => write!(f, "Alt"),
            Modifier::Meta => write!(f, "Meta"),
        }
    }
}

/// A key combination (modifiers + key).
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
pub struct KeyCombo {
    /// Modifier keys (sorted for comparison).
    pub modifiers: Vec<Modifier>,
    /// The main key (lowercase, e.g. "a", "enter", "f1").
    pub key: String,
}

impl KeyCombo {
    pub fn new(key: impl Into<String>, modifiers: Vec<Modifier>) -> Self {
        let mut mods = modifiers;
        mods.sort();
        mods.dedup();
        Self {
            modifiers: mods,
            key: key.into().to_lowercase(),
        }
    }

    /// Parse from a string like "Ctrl+Shift+S".
    pub fn parse(s: &str) -> Option<Self> {
        let parts: Vec<&str> = s.split('+').map(|p| p.trim()).collect();
        if parts.is_empty() {
            return None;
        }

        let mut modifiers = vec![];
        let mut key = None;

        for part in &parts {
            match part.to_lowercase().as_str() {
                "ctrl" | "control" => modifiers.push(Modifier::Ctrl),
                "shift" => modifiers.push(Modifier::Shift),
                "alt" | "option" => modifiers.push(Modifier::Alt),
                "meta" | "cmd" | "command" | "win" | "super" => modifiers.push(Modifier::Meta),
                k => key = Some(k.to_string()),
            }
        }

        key.map(|k| Self::new(k, modifiers))
    }

    /// Convert to display string.
    pub fn display(&self, is_mac: bool) -> String {
        let mut parts: Vec<String> = self
            .modifiers
            .iter()
            .map(|m| {
                if is_mac {
                    match m {
                        Modifier::Ctrl => "⌃".into(),
                        Modifier::Shift => "⇧".into(),
                        Modifier::Alt => "⌥".into(),
                        Modifier::Meta => "⌘".into(),
                    }
                } else {
                    m.to_string()
                }
            })
            .collect();
        parts.push(self.key.to_uppercase());
        if is_mac {
            parts.join("")
        } else {
            parts.join("+")
        }
    }
}

/// An action that can be triggered by a keybinding.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum Action {
    // Single WHOIS
    SingleLookup,
    SingleClear,
    SingleCopyRaw,

    // Bulk
    BulkStart,
    BulkStop,
    BulkClear,
    BulkPause,
    BulkResume,
    BulkImport,

    // Export
    ExportCsv,
    ExportJson,
    ExportZip,
    ExportTxt,

    // Navigation
    GoToSingle,
    GoToBulk,
    GoToOptions,
    GoToHistory,
    GoToExport,

    // UI
    ToggleDarkMode,
    ToggleSidebar,
    FocusSearchBar,
    ShowHelp,
    ShowShortcuts,

    // General
    Save,
    Undo,
    Redo,
    SelectAll,
    Copy,
    Paste,

    // Custom
    Custom(String),
}

impl std::fmt::Display for Action {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Action::Custom(s) => write!(f, "{}", s),
            other => write!(f, "{:?}", other),
        }
    }
}

/// A single key binding.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct KeyBinding {
    pub combo: KeyCombo,
    pub action: Action,
    /// Context in which this binding is active.
    pub context: Option<crate::context::KeyContext>,
    /// User-facing description.
    pub description: String,
    /// Whether user has overridden the default.
    pub user_override: bool,
    /// Whether this binding is currently enabled.
    pub enabled: bool,
}

impl KeyBinding {
    pub fn new(combo: KeyCombo, action: Action, description: impl Into<String>) -> Self {
        Self {
            combo,
            action,
            context: None,
            description: description.into(),
            user_override: false,
            enabled: true,
        }
    }

    pub fn with_context(mut self, ctx: crate::context::KeyContext) -> Self {
        self.context = Some(ctx);
        self
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_combo_parse() {
        let combo = KeyCombo::parse("Ctrl+Shift+S").unwrap();
        assert_eq!(combo.key, "s");
        assert!(combo.modifiers.contains(&Modifier::Ctrl));
        assert!(combo.modifiers.contains(&Modifier::Shift));
    }

    #[test]
    fn test_key_combo_parse_meta() {
        let combo = KeyCombo::parse("Cmd+K").unwrap();
        assert_eq!(combo.key, "k");
        assert!(combo.modifiers.contains(&Modifier::Meta));
    }

    #[test]
    fn test_key_combo_display_win() {
        let combo = KeyCombo::new("s", vec![Modifier::Ctrl, Modifier::Shift]);
        assert_eq!(combo.display(false), "Ctrl+Shift+S");
    }

    #[test]
    fn test_key_combo_display_mac() {
        let combo = KeyCombo::new("s", vec![Modifier::Meta, Modifier::Shift]);
        assert_eq!(combo.display(true), "⇧⌘S");
    }

    #[test]
    fn test_modifier_dedup() {
        let combo = KeyCombo::new("a", vec![Modifier::Ctrl, Modifier::Ctrl, Modifier::Shift]);
        assert_eq!(combo.modifiers.len(), 2);
    }

    #[test]
    fn test_combo_equality() {
        let a = KeyCombo::new("s", vec![Modifier::Shift, Modifier::Ctrl]);
        let b = KeyCombo::new("s", vec![Modifier::Ctrl, Modifier::Shift]);
        assert_eq!(a, b);
    }

    #[test]
    fn test_action_display() {
        assert_eq!(format!("{}", Action::Custom("test".into())), "test");
    }

    #[test]
    fn test_binding_creation() {
        let binding = KeyBinding::new(
            KeyCombo::parse("Ctrl+L").unwrap(),
            Action::SingleLookup,
            "Perform a WHOIS lookup",
        );
        assert!(binding.enabled);
        assert!(!binding.user_override);
    }
}
