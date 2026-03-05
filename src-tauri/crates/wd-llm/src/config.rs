use serde::{Deserialize, Serialize};

use crate::provider::ProviderKind;

/// Configuration for a single LLM connection.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LlmConfig {
    /// Which provider backend to use.
    pub provider: ProviderKind,

    /// API key / bearer token (empty for local providers like Ollama).
    #[serde(default)]
    pub api_key: String,

    /// Base API URL (provider-specific default used when empty).
    #[serde(default)]
    pub api_url: String,

    /// Default model identifier (e.g. `"gpt-4o"`).
    pub model: String,

    /// Maximum retry attempts on transient failures.
    #[serde(default = "default_max_retries")]
    pub max_retries: u32,

    /// Per-request timeout in seconds.
    #[serde(default = "default_timeout_secs")]
    pub timeout_secs: u64,

    /// Rate limit – maximum requests per minute.
    #[serde(default)]
    pub rate_limit_rpm: Option<u32>,

    /// Optional HTTP/S proxy URL.
    #[serde(default)]
    pub proxy: Option<String>,

    /// Maximum tokens to reserve for the model's output.
    #[serde(default = "default_max_output_tokens")]
    pub max_output_tokens: usize,

    /// Temperature (0.0 – 2.0). Provider default used when `None`.
    #[serde(default)]
    pub temperature: Option<f32>,

    /// Custom headers to send with every request (e.g. org ID).
    #[serde(default)]
    pub extra_headers: std::collections::HashMap<String, String>,
}

fn default_max_retries() -> u32 {
    3
}

fn default_timeout_secs() -> u64 {
    30
}

fn default_max_output_tokens() -> usize {
    4096
}

impl LlmConfig {
    /// Create a minimal config for a provider + model.
    pub fn new(provider: ProviderKind, model: &str) -> Self {
        Self {
            provider,
            api_key: String::new(),
            api_url: String::new(),
            model: model.to_string(),
            max_retries: default_max_retries(),
            timeout_secs: default_timeout_secs(),
            rate_limit_rpm: None,
            proxy: None,
            max_output_tokens: default_max_output_tokens(),
            temperature: None,
            extra_headers: Default::default(),
        }
    }

    /// Set the API key.
    pub fn with_api_key(mut self, key: &str) -> Self {
        self.api_key = key.to_string();
        self
    }

    /// Set a custom API URL.
    pub fn with_api_url(mut self, url: &str) -> Self {
        self.api_url = url.to_string();
        self
    }

    /// Set the proxy URL.
    pub fn with_proxy(mut self, proxy: &str) -> Self {
        self.proxy = Some(proxy.to_string());
        self
    }

    /// Set the temperature.
    pub fn with_temperature(mut self, temp: f32) -> Self {
        self.temperature = Some(temp);
        self
    }

    /// Set max output tokens.
    pub fn with_max_output_tokens(mut self, n: usize) -> Self {
        self.max_output_tokens = n;
        self
    }

    /// Set max retries.
    pub fn with_max_retries(mut self, n: u32) -> Self {
        self.max_retries = n;
        self
    }

    /// Resolve the effective API URL — uses the provided URL or a
    /// well-known default for the chosen provider.
    pub fn effective_api_url(&self) -> &str {
        if !self.api_url.is_empty() {
            return &self.api_url;
        }
        match self.provider {
            ProviderKind::OpenAi => "https://api.openai.com/v1",
            ProviderKind::Anthropic => "https://api.anthropic.com/v1",
            ProviderKind::Ollama => "http://localhost:11434/api",
            ProviderKind::OpenRouter => "https://openrouter.ai/api/v1",
            ProviderKind::AzureOpenAi => "", // requires user-supplied URL
            ProviderKind::GoogleGemini => "https://generativelanguage.googleapis.com/v1beta",
            ProviderKind::Custom => "",
        }
    }

    /// Validate that this config has enough info to make requests.
    pub fn validate(&self) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();

        if self.model.is_empty() {
            errors.push("model must not be empty".into());
        }

        // Providers (except Ollama) typically need an API key
        let needs_key = !matches!(self.provider, ProviderKind::Ollama | ProviderKind::Custom);
        if needs_key && self.api_key.is_empty() {
            errors.push(format!("{} requires an API key", self.provider));
        }

        // Azure requires a custom URL
        if self.provider == ProviderKind::AzureOpenAi && self.api_url.is_empty() {
            errors.push("Azure OpenAI requires a custom api_url".into());
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self::new(ProviderKind::OpenAi, "gpt-4o-mini")
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_config() {
        let c = LlmConfig::new(ProviderKind::OpenAi, "gpt-4o");
        assert_eq!(c.model, "gpt-4o");
        assert_eq!(c.max_retries, 3);
        assert_eq!(c.timeout_secs, 30);
    }

    #[test]
    fn test_default_config() {
        let c = LlmConfig::default();
        assert_eq!(c.model, "gpt-4o-mini");
        assert_eq!(c.provider, ProviderKind::OpenAi);
    }

    #[test]
    fn test_builder_pattern() {
        let c = LlmConfig::new(ProviderKind::Anthropic, "claude-sonnet-4-20250514")
            .with_api_key("sk-test")
            .with_temperature(0.5)
            .with_max_output_tokens(2048)
            .with_max_retries(5);
        assert_eq!(c.api_key, "sk-test");
        assert_eq!(c.temperature, Some(0.5));
        assert_eq!(c.max_output_tokens, 2048);
        assert_eq!(c.max_retries, 5);
    }

    #[test]
    fn test_effective_api_url_default() {
        let c = LlmConfig::new(ProviderKind::OpenAi, "gpt-4o");
        assert_eq!(c.effective_api_url(), "https://api.openai.com/v1");
    }

    #[test]
    fn test_effective_api_url_custom() {
        let c = LlmConfig::new(ProviderKind::OpenAi, "gpt-4o")
            .with_api_url("http://my-proxy.local/v1");
        assert_eq!(c.effective_api_url(), "http://my-proxy.local/v1");
    }

    #[test]
    fn test_effective_api_url_ollama() {
        let c = LlmConfig::new(ProviderKind::Ollama, "llama3.1:8b");
        assert_eq!(c.effective_api_url(), "http://localhost:11434/api");
    }

    #[test]
    fn test_validate_ok() {
        let c = LlmConfig::new(ProviderKind::OpenAi, "gpt-4o")
            .with_api_key("sk-xxx");
        assert!(c.validate().is_ok());
    }

    #[test]
    fn test_validate_missing_api_key() {
        let c = LlmConfig::new(ProviderKind::OpenAi, "gpt-4o");
        let errs = c.validate().unwrap_err();
        assert!(errs.iter().any(|e| e.contains("API key")));
    }

    #[test]
    fn test_validate_missing_model() {
        let c = LlmConfig::new(ProviderKind::Ollama, "");
        let errs = c.validate().unwrap_err();
        assert!(errs.iter().any(|e| e.contains("model")));
    }

    #[test]
    fn test_validate_azure_needs_url() {
        let c = LlmConfig::new(ProviderKind::AzureOpenAi, "my-model")
            .with_api_key("key");
        let errs = c.validate().unwrap_err();
        assert!(errs.iter().any(|e| e.contains("api_url")));
    }

    #[test]
    fn test_validate_ollama_no_key_needed() {
        let c = LlmConfig::new(ProviderKind::Ollama, "llama3");
        assert!(c.validate().is_ok());
    }

    #[test]
    fn test_serde_roundtrip() {
        let c = LlmConfig::new(ProviderKind::Anthropic, "claude-sonnet-4-20250514")
            .with_api_key("key")
            .with_proxy("socks5://localhost:1080");
        let j = serde_json::to_string(&c).unwrap();
        let c2: LlmConfig = serde_json::from_str(&j).unwrap();
        assert_eq!(c2.model, c.model);
        assert_eq!(c2.proxy, c.proxy);
    }
}
