use std::collections::HashMap;

/// Callback type for tool handlers.
pub type ToolHandlerFn =
    Box<dyn Fn(&serde_json::Value) -> Result<serde_json::Value, String> + Send + Sync>;

/// Executes tool calls by dispatching to registered handlers.
pub struct ToolExecutor {
    handlers: HashMap<String, ToolHandlerFn>,
}

impl ToolExecutor {
    pub fn new() -> Self {
        Self {
            handlers: HashMap::new(),
        }
    }

    /// Register a tool handler.
    pub fn register<F>(&mut self, name: &str, handler: F)
    where
        F: Fn(&serde_json::Value) -> Result<serde_json::Value, String> + Send + Sync + 'static,
    {
        self.handlers.insert(name.to_string(), Box::new(handler));
    }

    /// Convenience alias for `register`.
    pub fn register_handler<F>(&mut self, name: &str, handler: F)
    where
        F: Fn(&serde_json::Value) -> Result<serde_json::Value, String> + Send + Sync + 'static,
    {
        self.register(name, handler);
    }

    /// Execute a tool by name with the given arguments.
    pub fn execute(
        &self,
        name: &str,
        args: &serde_json::Value,
    ) -> Result<serde_json::Value, String> {
        match self.handlers.get(name) {
            Some(handler) => handler(args),
            None => Err(format!("Unknown tool: {name}")),
        }
    }

    /// Check if a tool handler is registered.
    pub fn has_handler(&self, name: &str) -> bool {
        self.handlers.contains_key(name)
    }

    /// List all registered tool names.
    pub fn registered_tools(&self) -> Vec<String> {
        self.handlers.keys().cloned().collect()
    }

    /// Number of registered tool handlers.
    pub fn len(&self) -> usize {
        self.handlers.len()
    }

    pub fn is_empty(&self) -> bool {
        self.handlers.is_empty()
    }
}

impl Default for ToolExecutor {
    fn default() -> Self {
        Self::new()
    }
}

/// Trait for implementing typed tool handlers.
pub trait ToolHandler: Send + Sync {
    /// The tool's name.
    fn name(&self) -> &str;
    /// Execute the tool.
    fn execute(&self, args: &serde_json::Value) -> Result<serde_json::Value, String>;
    /// Short description.
    fn description(&self) -> &str {
        ""
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_register_and_execute() {
        let mut executor = ToolExecutor::new();
        executor.register("echo", |args| Ok(args.clone()));
        let result = executor
            .execute("echo", &serde_json::json!({"msg": "hello"}))
            .unwrap();
        assert_eq!(result["msg"], "hello");
    }

    #[test]
    fn test_unknown_tool() {
        let executor = ToolExecutor::new();
        let err = executor
            .execute("nope", &serde_json::json!({}))
            .unwrap_err();
        assert!(err.contains("Unknown tool"));
    }

    #[test]
    fn test_has_handler() {
        let mut executor = ToolExecutor::new();
        executor.register("test", |_| Ok(serde_json::json!(null)));
        assert!(executor.has_handler("test"));
        assert!(!executor.has_handler("missing"));
    }

    #[test]
    fn test_registered_tools() {
        let mut executor = ToolExecutor::new();
        executor.register("a", |_| Ok(serde_json::json!(null)));
        executor.register("b", |_| Ok(serde_json::json!(null)));
        let tools = executor.registered_tools();
        assert_eq!(tools.len(), 2);
    }

    #[test]
    fn test_handler_error() {
        let mut executor = ToolExecutor::new();
        executor.register("fail", |_| Err("oops".into()));
        let err = executor
            .execute("fail", &serde_json::json!({}))
            .unwrap_err();
        assert_eq!(err, "oops");
    }
}
