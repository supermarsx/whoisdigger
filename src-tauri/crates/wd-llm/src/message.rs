use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Conversation role.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
    Tool,
}

/// A single message in a conversation.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Message {
    pub role: Role,
    /// Text content (`None` when the message is purely tool-calls).
    pub content: Option<String>,
    /// Tool invocations initiated by the assistant.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tool_calls: Vec<ToolCall>,
    /// Identifies which tool-call this message is the result of.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    /// Tool name (for `Role::Tool` result messages).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Non-essential metadata.
    #[serde(default)]
    pub metadata: MessageMetadata,
}

impl Message {
    /// Convenience: create a system message.
    pub fn system(content: &str) -> Self {
        Self {
            role: Role::System,
            content: Some(content.to_string()),
            tool_calls: Vec::new(),
            tool_call_id: None,
            name: None,
            metadata: MessageMetadata::default(),
        }
    }

    /// Convenience: create a user message.
    pub fn user(content: &str) -> Self {
        Self {
            role: Role::User,
            content: Some(content.to_string()),
            tool_calls: Vec::new(),
            tool_call_id: None,
            name: None,
            metadata: MessageMetadata::now(),
        }
    }

    /// Convenience: create a plain assistant text message.
    pub fn assistant(content: &str) -> Self {
        Self {
            role: Role::Assistant,
            content: Some(content.to_string()),
            tool_calls: Vec::new(),
            tool_call_id: None,
            name: None,
            metadata: MessageMetadata::now(),
        }
    }

    /// Convenience: create a tool-result message.
    pub fn tool_result(call_id: &str, name: &str, output: &str) -> Self {
        Self {
            role: Role::Tool,
            content: Some(output.to_string()),
            tool_calls: Vec::new(),
            tool_call_id: Some(call_id.to_string()),
            name: Some(name.to_string()),
            metadata: MessageMetadata::now(),
        }
    }

    /// Convenience: create an assistant message that initiates tool calls.
    pub fn assistant_tool_calls(calls: Vec<ToolCall>) -> Self {
        Self {
            role: Role::Assistant,
            content: None,
            tool_calls: calls,
            tool_call_id: None,
            name: None,
            metadata: MessageMetadata::now(),
        }
    }

    /// Rough char-based text length for context accounting.
    pub fn text_len(&self) -> usize {
        let base = self.content.as_deref().map_or(0, |c| c.len());
        let tools: usize = self
            .tool_calls
            .iter()
            .map(|tc| tc.function.name.len() + tc.function.arguments.to_string().len())
            .sum();
        base + tools
    }
}

/// An assistant-initiated tool invocation.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ToolCall {
    pub id: String,
    pub function: FunctionCall,
}

/// Name + JSON-encoded arguments for a function call.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FunctionCall {
    pub name: String,
    pub arguments: serde_json::Value,
}

/// Metadata attached to every message.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MessageMetadata {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<DateTime<Utc>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub token_count: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub latency_ms: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cost_usd: Option<f64>,
}

impl MessageMetadata {
    pub fn now() -> Self {
        Self {
            timestamp: Some(Utc::now()),
            ..Default::default()
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_message() {
        let m = Message::system("You are helpful");
        assert_eq!(m.role, Role::System);
        assert_eq!(m.content.as_deref(), Some("You are helpful"));
    }

    #[test]
    fn test_user_message_has_timestamp() {
        let m = Message::user("hello");
        assert!(m.metadata.timestamp.is_some());
    }

    #[test]
    fn test_assistant_tool_calls() {
        let tc = ToolCall {
            id: "c1".into(),
            function: FunctionCall {
                name: "whois_lookup".into(),
                arguments: serde_json::json!({"domain": "example.com"}),
            },
        };
        let m = Message::assistant_tool_calls(vec![tc]);
        assert!(m.content.is_none());
        assert_eq!(m.tool_calls.len(), 1);
        assert_eq!(m.tool_calls[0].function.name, "whois_lookup");
    }

    #[test]
    fn test_tool_result_message() {
        let m = Message::tool_result("c1", "whois_lookup", "raw whois data");
        assert_eq!(m.role, Role::Tool);
        assert_eq!(m.tool_call_id.as_deref(), Some("c1"));
        assert_eq!(m.name.as_deref(), Some("whois_lookup"));
    }

    #[test]
    fn test_message_text_len() {
        let m = Message::user("hello world");
        assert_eq!(m.text_len(), 11);
    }

    #[test]
    fn test_role_serde_roundtrip() {
        let json = serde_json::to_string(&Role::Assistant).unwrap();
        assert_eq!(json, "\"assistant\"");
        let r: Role = serde_json::from_str(&json).unwrap();
        assert_eq!(r, Role::Assistant);
    }

    #[test]
    fn test_message_serde_roundtrip() {
        let m = Message::user("hello");
        let json = serde_json::to_string(&m).unwrap();
        let m2: Message = serde_json::from_str(&json).unwrap();
        assert_eq!(m2.content, m.content);
        assert_eq!(m2.role, Role::User);
    }
}
