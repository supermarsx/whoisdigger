use crate::binding::{Action, KeyBinding, KeyCombo, Modifier};
use crate::context::KeyContext;
use crate::registry::KeyRegistry;

/// Load the default keymap with all built-in shortcuts.
pub fn default_keymap() -> KeyRegistry {
    let mut reg = KeyRegistry::new();

    let bindings = vec![
        // Navigation
        ("1", vec![Modifier::Ctrl], Action::GoToSingle, "Go to Single WHOIS", None),
        ("2", vec![Modifier::Ctrl], Action::GoToBulk, "Go to Bulk WHOIS", None),
        ("3", vec![Modifier::Ctrl], Action::GoToOptions, "Go to Options", None),
        ("4", vec![Modifier::Ctrl], Action::GoToHistory, "Go to History", None),
        ("5", vec![Modifier::Ctrl], Action::GoToExport, "Go to Export", None),

        // Single WHOIS
        ("enter", vec![Modifier::Ctrl], Action::SingleLookup, "Perform lookup", Some(KeyContext::SingleWhois)),
        ("l", vec![Modifier::Ctrl], Action::SingleLookup, "Perform lookup", None),
        ("k", vec![Modifier::Ctrl], Action::SingleClear, "Clear results", Some(KeyContext::SingleWhois)),
        ("c", vec![Modifier::Ctrl, Modifier::Shift], Action::SingleCopyRaw, "Copy raw WHOIS", Some(KeyContext::SingleWhois)),

        // Bulk WHOIS
        ("enter", vec![Modifier::Ctrl], Action::BulkStart, "Start bulk scan", Some(KeyContext::BulkWhois)),
        ("escape", vec![], Action::BulkStop, "Stop bulk scan", Some(KeyContext::BulkWhois)),
        ("p", vec![Modifier::Ctrl], Action::BulkPause, "Pause bulk scan", Some(KeyContext::BulkWhois)),
        ("r", vec![Modifier::Ctrl, Modifier::Shift], Action::BulkResume, "Resume bulk scan", Some(KeyContext::BulkWhois)),
        ("i", vec![Modifier::Ctrl], Action::BulkImport, "Import domain list", Some(KeyContext::BulkWhois)),

        // Export
        ("e", vec![Modifier::Ctrl, Modifier::Shift], Action::ExportCsv, "Export as CSV", None),
        ("j", vec![Modifier::Ctrl, Modifier::Shift], Action::ExportJson, "Export as JSON", None),

        // UI
        ("d", vec![Modifier::Ctrl, Modifier::Shift], Action::ToggleDarkMode, "Toggle dark mode", None),
        ("b", vec![Modifier::Ctrl], Action::ToggleSidebar, "Toggle sidebar", None),
        ("f", vec![Modifier::Ctrl], Action::FocusSearchBar, "Focus search bar", None),
        ("?", vec![Modifier::Ctrl], Action::ShowShortcuts, "Show keyboard shortcuts", None),
        ("f1", vec![], Action::ShowHelp, "Show help", None),

        // General
        ("s", vec![Modifier::Ctrl], Action::Save, "Save", None),
        ("z", vec![Modifier::Ctrl], Action::Undo, "Undo", None),
        ("y", vec![Modifier::Ctrl], Action::Redo, "Redo", None),
        ("a", vec![Modifier::Ctrl], Action::SelectAll, "Select all", None),
    ];

    for (key, mods, action, desc, context) in bindings {
        let mut binding = KeyBinding::new(KeyCombo::new(key, mods), action, desc);
        if let Some(ctx) = context {
            binding = binding.with_context(ctx);
        }
        // Use force to handle intentional context overrides (e.g., Ctrl+Enter in different contexts)
        reg.register_force(binding);
    }

    reg
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_keymap_loads() {
        let reg = default_keymap();
        assert!(reg.len() > 15);
    }

    #[test]
    fn test_ctrl_l_resolves_to_lookup() {
        let reg = default_keymap();
        let combo = KeyCombo::new("l", vec![Modifier::Ctrl]);
        let binding = reg.resolve(&combo, &[KeyContext::Global]);
        assert!(binding.is_some());
        assert_eq!(binding.unwrap().action, Action::SingleLookup);
    }

    #[test]
    fn test_f1_shows_help() {
        let reg = default_keymap();
        let combo = KeyCombo::new("f1", vec![]);
        let binding = reg.resolve(&combo, &[KeyContext::Global]);
        assert!(binding.is_some());
        assert_eq!(binding.unwrap().action, Action::ShowHelp);
    }

    #[test]
    fn test_navigation_shortcuts() {
        let reg = default_keymap();
        for i in 1..=5 {
            let combo = KeyCombo::new(&i.to_string(), vec![Modifier::Ctrl]);
            assert!(reg.resolve(&combo, &[KeyContext::Global]).is_some());
        }
    }

    #[test]
    fn test_export_binding() {
        let reg = default_keymap();
        let b = reg.binding_for_action(&Action::ExportCsv);
        assert!(b.is_some());
    }
}
