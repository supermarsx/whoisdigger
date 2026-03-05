use serde::{Deserialize, Serialize};

use crate::message::Message;
use crate::tools::ToolDefinition;

/// How the LLM should decide whether to call tools.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ToolChoice {
    /// LLM decides freely.
    Auto,
    /// Never call tools — respond with text only.
    None,
    /// Must invoke at least one tool.
    Required,
    /// Must invoke a specific tool by name.
    Specific(String),
}

impl Default for ToolChoice {
    fn default() -> Self {
        Self::Auto
    }
}

/// Desired response format.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ResponseFormat {
    Text,
    JsonObject,
    JsonSchema {
        name: String,
        schema: serde_json::Value,
    },
}

/// A complete request to send to any LLM provider.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CompletionRequest {
    pub model: String,
    pub messages: Vec<Message>,

    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tools: Vec<ToolDefinition>,
    #[serde(default)]
    pub tool_choice: ToolChoice,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub stop_sequences: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<ResponseFormat>,

    /// Whether to request a streaming response.
    #[serde(default)]
    pub stream: bool,
}

impl CompletionRequest {
    /// Create a minimal non-streaming request.
    pub fn new(model: &str, messages: Vec<Message>) -> Self {
        Self {
            model: model.to_string(),
            messages,
            tools: Vec::new(),
            tool_choice: ToolChoice::Auto,
            temperature: None,
            max_tokens: None,
            top_p: None,
            stop_sequences: Vec::new(),
            response_format: None,
            stream: false,
        }
    }

    /// Builder-style: attach tools.
    pub fn with_tools(mut self, tools: Vec<ToolDefinition>, choice: ToolChoice) -> Self {
        self.tools = tools;
        self.tool_choice = choice;
        self
    }

    /// Builder-style: set temperature.
    pub fn with_temperature(mut self, t: f64) -> Self {
        self.temperature = Some(t);
        self
    }

    /// Builder-style: set max output tokens.
    pub fn with_max_tokens(mut self, n: usize) -> Self {
        self.max_tokens = Some(n);
        self
    }

    /// Builder-style: request streaming.
    pub fn with_stream(mut self) -> Self {
        self.stream = true;
        self
    }

    /// Total number of messages.
    pub fn message_count(&self) -> usize {
        self.messages.len()
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::message::Message;

    #[test]
    fn test_new_request() {
        let req = CompletionRequest::new(
            "gpt-4o",
            vec![Message::user("hello")],
        );
        assert_eq!(req.model, "gpt-4o");
        assert_eq!(req.message_count(), 1);
        assert!(!req.stream);
    }

    #[test]
    fn test_builder_chain() {
        let req = CompletionRequest::new("m", vec![])
            .with_temperature(0.7)
            .with_max_tokens(4096)
            .with_stream();
        assert_eq!(req.temperature, Some(0.7));
        assert_eq!(req.max_tokens, Some(4096));
        assert!(req.stream);
    }

    #[test]
    fn test_tool_choice_default() {
        assert_eq!(ToolChoice::default(), ToolChoice::Auto);
    }

    #[test]
    fn test_tool_choice_serde() {
        let tc = ToolChoice::Specific("whois_lookup".into());
        let j = serde_json::to_string(&tc).unwrap();
        let tc2: ToolChoice = serde_json::from_str(&j).unwrap();
        assert_eq!(tc, tc2);
    }

    #[test]
    fn test_response_format_serde() {
        let rf = ResponseFormat::JsonSchema {
            name: "result".into(),
            schema: serde_json::json!({"type": "object"}),
        };
        let j = serde_json::to_string(&rf).unwrap();
        let rf2: ResponseFormat = serde_json::from_str(&j).unwrap();
        assert_eq!(rf, rf2);
    }
}
