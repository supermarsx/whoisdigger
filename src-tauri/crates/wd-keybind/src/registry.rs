use thiserror::Error;

use crate::binding::{Action, KeyBinding, KeyCombo};
use crate::context::KeyContext;

#[derive(Error, Debug)]
pub enum ConflictError {
    #[error("Key combo {combo} already bound to {existing_action} in context {context}")]
    Conflict {
        combo: String,
        existing_action: String,
        context: String,
    },
}

/// Central registry for all key bindings.
#[derive(Debug, Default)]
pub struct KeyRegistry {
    bindings: Vec<KeyBinding>,
}

impl KeyRegistry {
    pub fn new() -> Self {
        Self { bindings: vec![] }
    }

    /// Register a binding, checking for conflicts.
    pub fn register(&mut self, binding: KeyBinding) -> Result<(), ConflictError> {
        if let Some(conflict) = self.find_conflict(&binding.combo, binding.context.as_ref()) {
            return Err(ConflictError::Conflict {
                combo: binding.combo.display(false),
                existing_action: format!("{}", conflict.action),
                context: conflict
                    .context
                    .as_ref()
                    .map(|c| c.display_name().to_string())
                    .unwrap_or("Global".into()),
            });
        }
        self.bindings.push(binding);
        Ok(())
    }

    /// Register a binding, replacing any conflict.
    pub fn register_force(&mut self, binding: KeyBinding) {
        self.bindings
            .retain(|b| !(b.combo == binding.combo && b.context == binding.context));
        self.bindings.push(binding);
    }

    /// Find the action for a key combo in given contexts.
    pub fn resolve(&self, combo: &KeyCombo, active_contexts: &[KeyContext]) -> Option<&KeyBinding> {
        // Prefer more specific contexts over Global
        let mut best: Option<&KeyBinding> = None;
        for binding in &self.bindings {
            if !binding.enabled {
                continue;
            }
            if binding.combo != *combo {
                continue;
            }

            let ctx = binding
                .context
                .as_ref()
                .cloned()
                .unwrap_or(KeyContext::Global);
            if !ctx.is_active_in(active_contexts) {
                continue;
            }

            // Prefer non-Global over Global
            if let Some(current_best) = best {
                let current_ctx = current_best
                    .context
                    .as_ref()
                    .cloned()
                    .unwrap_or(KeyContext::Global);
                if current_ctx == KeyContext::Global && ctx != KeyContext::Global {
                    best = Some(binding);
                }
            } else {
                best = Some(binding);
            }
        }
        best
    }

    /// Find conflict with an existing binding.
    fn find_conflict(&self, combo: &KeyCombo, context: Option<&KeyContext>) -> Option<&KeyBinding> {
        let ctx = context.cloned().unwrap_or(KeyContext::Global);
        self.bindings.iter().find(|b| {
            b.combo == *combo && b.context.as_ref().cloned().unwrap_or(KeyContext::Global) == ctx
        })
    }

    /// All bindings.
    pub fn all_bindings(&self) -> &[KeyBinding] {
        &self.bindings
    }

    /// Bindings for a specific context.
    pub fn bindings_for_context(&self, ctx: &KeyContext) -> Vec<&KeyBinding> {
        self.bindings
            .iter()
            .filter(|b| {
                b.context
                    .as_ref()
                    .map(|c| c == ctx)
                    .unwrap_or(*ctx == KeyContext::Global)
            })
            .collect()
    }

    /// Get binding for a specific action.
    pub fn binding_for_action(&self, action: &Action) -> Option<&KeyBinding> {
        self.bindings.iter().find(|b| b.action == *action)
    }

    /// Export all bindings as serializable map.
    pub fn export_bindings(&self) -> Vec<(String, String, String)> {
        self.bindings
            .iter()
            .map(|b| {
                (
                    b.combo.display(false),
                    format!("{}", b.action),
                    b.description.clone(),
                )
            })
            .collect()
    }

    /// Count bindings.
    pub fn len(&self) -> usize {
        self.bindings.len()
    }
    pub fn is_empty(&self) -> bool {
        self.bindings.is_empty()
    }

    /// Remove all bindings.
    pub fn clear(&mut self) {
        self.bindings.clear();
    }

    /// Remove a binding by action.
    pub fn remove_action(&mut self, action: &Action) {
        self.bindings.retain(|b| b.action != *action);
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::binding::Modifier;

    fn kb(key: &str, mods: Vec<Modifier>, action: Action) -> KeyBinding {
        KeyBinding::new(KeyCombo::new(key, mods), action, "test")
    }

    #[test]
    fn test_register_and_resolve() {
        let mut reg = KeyRegistry::new();
        reg.register(kb("l", vec![Modifier::Ctrl], Action::SingleLookup))
            .unwrap();
        let combo = KeyCombo::new("l", vec![Modifier::Ctrl]);
        let resolved = reg.resolve(&combo, &[KeyContext::Global]);
        assert!(resolved.is_some());
        assert_eq!(resolved.unwrap().action, Action::SingleLookup);
    }

    #[test]
    fn test_conflict_detection() {
        let mut reg = KeyRegistry::new();
        reg.register(kb("l", vec![Modifier::Ctrl], Action::SingleLookup))
            .unwrap();
        let result = reg.register(kb("l", vec![Modifier::Ctrl], Action::BulkStart));
        assert!(result.is_err());
    }

    #[test]
    fn test_force_register() {
        let mut reg = KeyRegistry::new();
        reg.register(kb("l", vec![Modifier::Ctrl], Action::SingleLookup))
            .unwrap();
        reg.register_force(kb("l", vec![Modifier::Ctrl], Action::BulkStart));
        let combo = KeyCombo::new("l", vec![Modifier::Ctrl]);
        let resolved = reg.resolve(&combo, &[KeyContext::Global]).unwrap();
        assert_eq!(resolved.action, Action::BulkStart);
    }

    #[test]
    fn test_context_override() {
        let mut reg = KeyRegistry::new();
        reg.register(kb("s", vec![Modifier::Ctrl], Action::Save))
            .unwrap();
        let mut bulk_binding = kb("s", vec![Modifier::Ctrl], Action::BulkStart);
        bulk_binding.context = Some(KeyContext::BulkWhois);
        reg.register(bulk_binding).unwrap();

        let combo = KeyCombo::new("s", vec![Modifier::Ctrl]);
        // In bulk context → BulkStart (more specific)
        let resolved = reg.resolve(&combo, &[KeyContext::BulkWhois]).unwrap();
        assert_eq!(resolved.action, Action::BulkStart);
    }

    #[test]
    fn test_remove_action() {
        let mut reg = KeyRegistry::new();
        reg.register(kb("l", vec![Modifier::Ctrl], Action::SingleLookup))
            .unwrap();
        assert_eq!(reg.len(), 1);
        reg.remove_action(&Action::SingleLookup);
        assert_eq!(reg.len(), 0);
    }

    #[test]
    fn test_binding_for_action() {
        let mut reg = KeyRegistry::new();
        reg.register(kb("l", vec![Modifier::Ctrl], Action::SingleLookup))
            .unwrap();
        let b = reg.binding_for_action(&Action::SingleLookup);
        assert!(b.is_some());
    }

    #[test]
    fn test_export() {
        let mut reg = KeyRegistry::new();
        reg.register(kb("l", vec![Modifier::Ctrl], Action::SingleLookup))
            .unwrap();
        let exported = reg.export_bindings();
        assert_eq!(exported.len(), 1);
        assert_eq!(exported[0].0, "Ctrl+L");
    }
}
