use serde::{Deserialize, Serialize};

use crate::error::LlmError;
use crate::request::CompletionRequest;
use crate::response::CompletionResponse;

/// Supported LLM provider backends.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ProviderKind {
    OpenAi,
    Anthropic,
    Ollama,
    OpenRouter,
    AzureOpenAi,
    GoogleGemini,
    Custom,
}

impl std::fmt::Display for ProviderKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Self::OpenAi => "OpenAI",
            Self::Anthropic => "Anthropic",
            Self::Ollama => "Ollama",
            Self::OpenRouter => "OpenRouter",
            Self::AzureOpenAi => "Azure OpenAI",
            Self::GoogleGemini => "Google Gemini",
            Self::Custom => "Custom",
        };
        write!(f, "{s}")
    }
}

/// Metadata about a model offered by a provider.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ModelInfo {
    /// Model identifier (e.g. `"gpt-4o"`, `"claude-sonnet-4-20250514"`).
    pub id: String,
    /// Human-readable display name.
    pub display_name: String,
    /// Context window size in tokens.
    pub context_window: usize,
    /// Whether the model supports tool / function calling.
    pub supports_tools: bool,
    /// Whether the model supports vision (image input).
    pub supports_vision: bool,
    /// Cost per 1 000 input tokens (USD), if known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub input_cost_per_1k: Option<f64>,
    /// Cost per 1 000 output tokens (USD), if known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub output_cost_per_1k: Option<f64>,
}

/// Trait implemented by every LLM backend.
///
/// Consumers call `complete` or `complete_stream` and the provider maps
/// the unified `CompletionRequest` to its native HTTP format.
pub trait LlmProvider: Send + Sync {
    fn kind(&self) -> ProviderKind;
    fn display_name(&self) -> &str;
    fn supported_models(&self) -> Vec<ModelInfo>;

    /// Maximum context tokens for a given model.
    fn max_context_tokens(&self, model: &str) -> usize;

    /// Whether this provider supports tool / function calling.
    fn supports_tools(&self) -> bool;

    /// Whether this provider supports streaming responses.
    fn supports_streaming(&self) -> bool;

    /// Build the provider-specific HTTP request body from a `CompletionRequest`.
    fn build_request_body(&self, req: &CompletionRequest) -> Result<serde_json::Value, LlmError>;

    /// Parse a provider-specific HTTP response into a `CompletionResponse`.
    fn parse_response(
        &self,
        status: u16,
        body: &str,
        latency_ms: u64,
    ) -> Result<CompletionResponse, LlmError>;

    /// The base URL for this provider's API.
    fn api_url(&self) -> &str;
}

/// Registry of configured providers.
pub struct ProviderRegistry {
    providers: Vec<(String, Box<dyn LlmProvider>)>,
    default: Option<String>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        Self {
            providers: Vec::new(),
            default: None,
        }
    }

    /// Register a provider under a user-chosen name.
    pub fn register(&mut self, name: &str, provider: Box<dyn LlmProvider>) {
        self.providers.push((name.to_string(), provider));
    }

    /// Set the default provider name.
    pub fn set_default(&mut self, name: &str) {
        self.default = Some(name.to_string());
    }

    /// Get a provider by name.
    pub fn get(&self, name: &str) -> Option<&dyn LlmProvider> {
        self.providers
            .iter()
            .find(|(n, _)| n == name)
            .map(|(_, p)| p.as_ref())
    }

    /// Get the default provider.
    pub fn default_provider(&self) -> Option<&dyn LlmProvider> {
        self.default.as_deref().and_then(|n| self.get(n))
    }

    /// List all registered provider names.
    pub fn names(&self) -> Vec<&str> {
        self.providers.iter().map(|(n, _)| n.as_str()).collect()
    }

    /// Number of registered providers.
    pub fn len(&self) -> usize {
        self.providers.len()
    }

    pub fn is_empty(&self) -> bool {
        self.providers.is_empty()
    }
}

impl Default for ProviderRegistry {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Built-in model catalogs ─────────────────────────────────────────────────

/// Known OpenAI models.
pub fn openai_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "gpt-4o".into(),
            display_name: "GPT-4o".into(),
            context_window: 128_000,
            supports_tools: true,
            supports_vision: true,
            input_cost_per_1k: Some(0.0025),
            output_cost_per_1k: Some(0.01),
        },
        ModelInfo {
            id: "gpt-4o-mini".into(),
            display_name: "GPT-4o Mini".into(),
            context_window: 128_000,
            supports_tools: true,
            supports_vision: true,
            input_cost_per_1k: Some(0.00015),
            output_cost_per_1k: Some(0.0006),
        },
        ModelInfo {
            id: "gpt-4-turbo".into(),
            display_name: "GPT-4 Turbo".into(),
            context_window: 128_000,
            supports_tools: true,
            supports_vision: true,
            input_cost_per_1k: Some(0.01),
            output_cost_per_1k: Some(0.03),
        },
        ModelInfo {
            id: "gpt-3.5-turbo".into(),
            display_name: "GPT-3.5 Turbo".into(),
            context_window: 16_385,
            supports_tools: true,
            supports_vision: false,
            input_cost_per_1k: Some(0.0005),
            output_cost_per_1k: Some(0.0015),
        },
        ModelInfo {
            id: "o3-mini".into(),
            display_name: "o3-mini".into(),
            context_window: 200_000,
            supports_tools: true,
            supports_vision: true,
            input_cost_per_1k: Some(0.0011),
            output_cost_per_1k: Some(0.0044),
        },
    ]
}

/// Known Anthropic models.
pub fn anthropic_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "claude-sonnet-4-20250514".into(),
            display_name: "Claude Sonnet 4".into(),
            context_window: 200_000,
            supports_tools: true,
            supports_vision: true,
            input_cost_per_1k: Some(0.003),
            output_cost_per_1k: Some(0.015),
        },
        ModelInfo {
            id: "claude-3-5-sonnet-20241022".into(),
            display_name: "Claude 3.5 Sonnet".into(),
            context_window: 200_000,
            supports_tools: true,
            supports_vision: true,
            input_cost_per_1k: Some(0.003),
            output_cost_per_1k: Some(0.015),
        },
        ModelInfo {
            id: "claude-3-5-haiku-20241022".into(),
            display_name: "Claude 3.5 Haiku".into(),
            context_window: 200_000,
            supports_tools: true,
            supports_vision: false,
            input_cost_per_1k: Some(0.001),
            output_cost_per_1k: Some(0.005),
        },
        ModelInfo {
            id: "claude-3-opus-20240229".into(),
            display_name: "Claude 3 Opus".into(),
            context_window: 200_000,
            supports_tools: true,
            supports_vision: true,
            input_cost_per_1k: Some(0.015),
            output_cost_per_1k: Some(0.075),
        },
    ]
}

/// Placeholder Ollama models (user's local models vary).
pub fn ollama_default_models() -> Vec<ModelInfo> {
    vec![
        ModelInfo {
            id: "llama3.1:8b".into(),
            display_name: "Llama 3.1 8B".into(),
            context_window: 131_072,
            supports_tools: true,
            supports_vision: false,
            input_cost_per_1k: None,
            output_cost_per_1k: None,
        },
        ModelInfo {
            id: "mistral:7b".into(),
            display_name: "Mistral 7B".into(),
            context_window: 32_768,
            supports_tools: true,
            supports_vision: false,
            input_cost_per_1k: None,
            output_cost_per_1k: None,
        },
        ModelInfo {
            id: "qwen2.5:7b".into(),
            display_name: "Qwen 2.5 7B".into(),
            context_window: 131_072,
            supports_tools: true,
            supports_vision: false,
            input_cost_per_1k: None,
            output_cost_per_1k: None,
        },
    ]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // Minimal test provider
    struct DummyProvider;
    impl LlmProvider for DummyProvider {
        fn kind(&self) -> ProviderKind {
            ProviderKind::Custom
        }
        fn display_name(&self) -> &str {
            "Dummy"
        }
        fn supported_models(&self) -> Vec<ModelInfo> {
            vec![]
        }
        fn max_context_tokens(&self, _model: &str) -> usize {
            4096
        }
        fn supports_tools(&self) -> bool {
            true
        }
        fn supports_streaming(&self) -> bool {
            false
        }
        fn build_request_body(
            &self,
            _req: &CompletionRequest,
        ) -> Result<serde_json::Value, LlmError> {
            Ok(serde_json::json!({}))
        }
        fn parse_response(
            &self,
            _status: u16,
            _body: &str,
            _latency: u64,
        ) -> Result<CompletionResponse, LlmError> {
            Err(LlmError::Other("not impl".into()))
        }
        fn api_url(&self) -> &str {
            "http://localhost"
        }
    }

    #[test]
    fn test_registry_register_and_get() {
        let mut reg = ProviderRegistry::new();
        reg.register("test", Box::new(DummyProvider));
        assert_eq!(reg.len(), 1);
        assert!(reg.get("test").is_some());
        assert!(reg.get("missing").is_none());
    }

    #[test]
    fn test_registry_default() {
        let mut reg = ProviderRegistry::new();
        reg.register("main", Box::new(DummyProvider));
        assert!(reg.default_provider().is_none());
        reg.set_default("main");
        assert!(reg.default_provider().is_some());
    }

    #[test]
    fn test_registry_names() {
        let mut reg = ProviderRegistry::new();
        reg.register("a", Box::new(DummyProvider));
        reg.register("b", Box::new(DummyProvider));
        let names = reg.names();
        assert!(names.contains(&"a"));
        assert!(names.contains(&"b"));
    }

    #[test]
    fn test_provider_kind_display() {
        assert_eq!(ProviderKind::OpenAi.to_string(), "OpenAI");
        assert_eq!(ProviderKind::Anthropic.to_string(), "Anthropic");
        assert_eq!(ProviderKind::Ollama.to_string(), "Ollama");
    }

    #[test]
    fn test_provider_kind_serde() {
        let j = serde_json::to_string(&ProviderKind::OpenAi).unwrap();
        assert_eq!(j, "\"open_ai\"");
        let p: ProviderKind = serde_json::from_str(&j).unwrap();
        assert_eq!(p, ProviderKind::OpenAi);
    }

    #[test]
    fn test_openai_models_non_empty() {
        let models = openai_models();
        assert!(models.len() >= 4);
        assert!(models.iter().any(|m| m.id == "gpt-4o"));
    }

    #[test]
    fn test_anthropic_models_non_empty() {
        let models = anthropic_models();
        assert!(models.len() >= 3);
        assert!(models.iter().any(|m| m.id.contains("claude")));
    }

    #[test]
    fn test_model_info_serde() {
        let m = &openai_models()[0];
        let j = serde_json::to_string(m).unwrap();
        let m2: ModelInfo = serde_json::from_str(&j).unwrap();
        assert_eq!(m2.id, m.id);
    }

    #[test]
    fn test_dummy_provider_trait() {
        let p = DummyProvider;
        assert_eq!(p.kind(), ProviderKind::Custom);
        assert!(p.supports_tools());
        assert!(!p.supports_streaming());
        assert_eq!(p.max_context_tokens("any"), 4096);
    }
}
