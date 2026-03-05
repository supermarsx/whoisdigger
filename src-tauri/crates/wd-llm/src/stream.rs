use serde::{Deserialize, Serialize};

use crate::error::LlmError;
use crate::response::{FinishReason, TokenUsage};

/// A single chunk from a streaming LLM response.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "data")]
pub enum StreamChunk {
    /// Incremental text content.
    Delta { content: String },
    /// Incremental tool-call information.
    ToolCallDelta {
        id: String,
        name: Option<String>,
        arguments_delta: String,
    },
    /// Final token usage report.
    Usage(TokenUsage),
    /// Stream finished.
    Done(FinishReason),
    /// Error mid-stream.
    Error(LlmError),
}

/// State machine for accumulating streamed tool-call deltas.
#[derive(Clone, Debug, Default)]
pub struct ToolCallAccumulator {
    pub id: String,
    pub name: String,
    pub arguments_json: String,
}

impl ToolCallAccumulator {
    pub fn apply_delta(&mut self, id: &str, name: Option<&str>, args_delta: &str) {
        if self.id.is_empty() {
            self.id = id.to_string();
        }
        if let Some(n) = name {
            if self.name.is_empty() {
                self.name = n.to_string();
            }
        }
        self.arguments_json.push_str(args_delta);
    }

    /// Try to parse accumulated arguments as JSON.
    pub fn parse_arguments(&self) -> Result<serde_json::Value, String> {
        serde_json::from_str(&self.arguments_json)
            .map_err(|e| format!("Failed to parse tool arguments: {e}"))
    }

    pub fn is_empty(&self) -> bool {
        self.id.is_empty()
    }
}

/// Accumulates full text from a sequence of `StreamChunk::Delta` events.
#[derive(Clone, Debug, Default)]
pub struct TextAccumulator {
    pub text: String,
    pub tool_calls: Vec<ToolCallAccumulator>,
    pub usage: Option<TokenUsage>,
    pub finish_reason: Option<FinishReason>,
}

impl TextAccumulator {
    pub fn new() -> Self {
        Self::default()
    }

    /// Feed a chunk into the accumulator.
    pub fn push(&mut self, chunk: &StreamChunk) {
        match chunk {
            StreamChunk::Delta { content } => {
                self.text.push_str(content);
            }
            StreamChunk::ToolCallDelta {
                id,
                name,
                arguments_delta,
            } => {
                // Find or create accumulator for this tool call ID
                let acc = self
                    .tool_calls
                    .iter_mut()
                    .find(|tc| tc.id == *id);
                match acc {
                    Some(a) => a.apply_delta(id, name.as_deref(), arguments_delta),
                    None => {
                        let mut a = ToolCallAccumulator::default();
                        a.apply_delta(id, name.as_deref(), arguments_delta);
                        self.tool_calls.push(a);
                    }
                }
            }
            StreamChunk::Usage(u) => {
                self.usage = Some(u.clone());
            }
            StreamChunk::Done(f) => {
                self.finish_reason = Some(f.clone());
            }
            StreamChunk::Error(_) => {}
        }
    }

    /// True if the stream has finished.
    pub fn is_done(&self) -> bool {
        self.finish_reason.is_some()
    }
}

/// Parse an SSE line from an OpenAI-compatible `/v1/chat/completions` stream.
///
/// Returns `None` for keep-alive, comment, or `[DONE]` lines; returns a
/// `StreamChunk` for data lines.
pub fn parse_openai_sse_line(line: &str) -> Option<StreamChunk> {
    let line = line.trim();
    if line.is_empty() || line.starts_with(':') {
        return None;
    }
    let data = line.strip_prefix("data: ")?;
    if data == "[DONE]" {
        return Some(StreamChunk::Done(FinishReason::Stop));
    }

    let json: serde_json::Value = serde_json::from_str(data).ok()?;
    let choice = json.get("choices")?.get(0)?;
    let delta = choice.get("delta")?;

    // Check for tool calls
    if let Some(tcs) = delta.get("tool_calls") {
        if let Some(arr) = tcs.as_array() {
            for tc in arr {
                let id = tc
                    .get("id")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                let name = tc
                    .get("function")
                    .and_then(|f| f.get("name"))
                    .and_then(|v| v.as_str())
                    .map(String::from);
                let args_delta = tc
                    .get("function")
                    .and_then(|f| f.get("arguments"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string();
                return Some(StreamChunk::ToolCallDelta {
                    id,
                    name,
                    arguments_delta: args_delta,
                });
            }
        }
    }

    // Check for content delta
    if let Some(content) = delta.get("content").and_then(|v| v.as_str()) {
        if !content.is_empty() {
            return Some(StreamChunk::Delta {
                content: content.to_string(),
            });
        }
    }

    // Check for finish_reason on the choice itself
    if let Some(fr) = choice.get("finish_reason").and_then(|v| v.as_str()) {
        let reason = match fr {
            "stop" => FinishReason::Stop,
            "tool_calls" => FinishReason::ToolUse,
            "length" => FinishReason::Length,
            "content_filter" => FinishReason::ContentFilter,
            other => FinishReason::Error(other.to_string()),
        };
        return Some(StreamChunk::Done(reason));
    }

    // Check for usage at top level
    if let Some(usage) = json.get("usage") {
        let prompt = usage
            .get("prompt_tokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        let completion = usage
            .get("completion_tokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        return Some(StreamChunk::Usage(TokenUsage::new(prompt, completion)));
    }

    None
}

/// Parse an SSE event from the Anthropic `/v1/messages` stream format.
pub fn parse_anthropic_sse_line(event_type: &str, data: &str) -> Option<StreamChunk> {
    let json: serde_json::Value = serde_json::from_str(data).ok()?;

    match event_type {
        "content_block_delta" => {
            let delta = json.get("delta")?;
            let dtype = delta.get("type")?.as_str()?;
            match dtype {
                "text_delta" => {
                    let text = delta.get("text")?.as_str()?;
                    Some(StreamChunk::Delta {
                        content: text.to_string(),
                    })
                }
                "input_json_delta" => {
                    let partial = delta.get("partial_json")?.as_str()?;
                    // Anthropic tool input is streamed in content_block_delta
                    Some(StreamChunk::ToolCallDelta {
                        id: json
                            .get("index")
                            .and_then(|v| v.as_u64())
                            .map(|i| i.to_string())
                            .unwrap_or_default(),
                        name: None,
                        arguments_delta: partial.to_string(),
                    })
                }
                _ => None,
            }
        }
        "content_block_start" => {
            let block = json.get("content_block")?;
            if block.get("type")?.as_str()? == "tool_use" {
                let id = block.get("id")?.as_str()?.to_string();
                let name = block.get("name")?.as_str()?.to_string();
                Some(StreamChunk::ToolCallDelta {
                    id,
                    name: Some(name),
                    arguments_delta: String::new(),
                })
            } else {
                None
            }
        }
        "message_delta" => {
            let stop = json
                .get("delta")?
                .get("stop_reason")?
                .as_str()?;
            let reason = match stop {
                "end_turn" => FinishReason::Stop,
                "tool_use" => FinishReason::ToolUse,
                "max_tokens" => FinishReason::Length,
                other => FinishReason::Error(other.to_string()),
            };
            Some(StreamChunk::Done(reason))
        }
        "message_stop" => Some(StreamChunk::Done(FinishReason::Stop)),
        _ => None,
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_accumulator_basic() {
        let mut acc = TextAccumulator::new();
        acc.push(&StreamChunk::Delta {
            content: "Hello".into(),
        });
        acc.push(&StreamChunk::Delta {
            content: " world".into(),
        });
        assert_eq!(acc.text, "Hello world");
        assert!(!acc.is_done());
    }

    #[test]
    fn test_text_accumulator_done() {
        let mut acc = TextAccumulator::new();
        acc.push(&StreamChunk::Done(FinishReason::Stop));
        assert!(acc.is_done());
    }

    #[test]
    fn test_tool_call_accumulator() {
        let mut tca = ToolCallAccumulator::default();
        tca.apply_delta("tc_1", Some("whois_lookup"), "{\"dom");
        tca.apply_delta("tc_1", None, "ain\": \"x.com\"}");
        assert_eq!(tca.id, "tc_1");
        assert_eq!(tca.name, "whois_lookup");
        let args = tca.parse_arguments().unwrap();
        assert_eq!(args["domain"], "x.com");
    }

    #[test]
    fn test_tool_call_accumulator_in_text_acc() {
        let mut acc = TextAccumulator::new();
        acc.push(&StreamChunk::ToolCallDelta {
            id: "tc1".into(),
            name: Some("lookup".into()),
            arguments_delta: "{\"d\":".into(),
        });
        acc.push(&StreamChunk::ToolCallDelta {
            id: "tc1".into(),
            name: None,
            arguments_delta: "\"x\"}".into(),
        });
        assert_eq!(acc.tool_calls.len(), 1);
        assert_eq!(acc.tool_calls[0].name, "lookup");
        let args = acc.tool_calls[0].parse_arguments().unwrap();
        assert_eq!(args["d"], "x");
    }

    #[test]
    fn test_parse_openai_sse_done() {
        let chunk = parse_openai_sse_line("data: [DONE]");
        assert!(matches!(chunk, Some(StreamChunk::Done(FinishReason::Stop))));
    }

    #[test]
    fn test_parse_openai_sse_delta() {
        let line = r#"data: {"choices":[{"delta":{"content":"Hi"},"index":0}]}"#;
        let chunk = parse_openai_sse_line(line);
        match chunk {
            Some(StreamChunk::Delta { content }) => assert_eq!(content, "Hi"),
            _ => panic!("Expected Delta"),
        }
    }

    #[test]
    fn test_parse_openai_sse_tool_call() {
        let line = r#"data: {"choices":[{"delta":{"tool_calls":[{"id":"tc_1","function":{"name":"whois","arguments":"{\"d\":"}}]},"index":0}]}"#;
        let chunk = parse_openai_sse_line(line);
        match chunk {
            Some(StreamChunk::ToolCallDelta { id, name, .. }) => {
                assert_eq!(id, "tc_1");
                assert_eq!(name, Some("whois".into()));
            }
            _ => panic!("Expected ToolCallDelta"),
        }
    }

    #[test]
    fn test_parse_openai_sse_empty_line() {
        assert!(parse_openai_sse_line("").is_none());
    }

    #[test]
    fn test_parse_openai_sse_comment() {
        assert!(parse_openai_sse_line(": keepalive").is_none());
    }

    #[test]
    fn test_parse_anthropic_text_delta() {
        let data = r#"{"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}"#;
        let chunk = parse_anthropic_sse_line("content_block_delta", data);
        match chunk {
            Some(StreamChunk::Delta { content }) => assert_eq!(content, "Hello"),
            _ => panic!("Expected Delta"),
        }
    }

    #[test]
    fn test_parse_anthropic_tool_start() {
        let data = r#"{"type":"content_block_start","index":1,"content_block":{"type":"tool_use","id":"tu_1","name":"lookup","input":{}}}"#;
        let chunk = parse_anthropic_sse_line("content_block_start", data);
        match chunk {
            Some(StreamChunk::ToolCallDelta { id, name, .. }) => {
                assert_eq!(id, "tu_1");
                assert_eq!(name, Some("lookup".into()));
            }
            _ => panic!("Expected ToolCallDelta"),
        }
    }

    #[test]
    fn test_parse_anthropic_message_delta_stop() {
        let data = r#"{"type":"message_delta","delta":{"stop_reason":"end_turn"}}"#;
        let chunk = parse_anthropic_sse_line("message_delta", data);
        assert!(matches!(chunk, Some(StreamChunk::Done(FinishReason::Stop))));
    }

    #[test]
    fn test_stream_chunk_serde_roundtrip() {
        let c = StreamChunk::Delta {
            content: "hi".into(),
        };
        let j = serde_json::to_string(&c).unwrap();
        let c2: StreamChunk = serde_json::from_str(&j).unwrap();
        if let StreamChunk::Delta { content } = c2 {
            assert_eq!(content, "hi");
        } else {
            panic!("Wrong variant");
        }
    }
}
