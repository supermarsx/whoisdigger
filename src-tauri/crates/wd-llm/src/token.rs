use crate::message::Message;
use crate::tools::ToolDefinition;

/// Fast heuristic token estimator (no external tokenizer needed).
///
/// Uses the widely-cited ~4 characters per token average for English
/// text. More accurate than nothing; less accurate than tiktoken.
pub struct TokenEstimator;

impl TokenEstimator {
    /// Chars-per-token ratio. GPT models average ~3.5–4.5.
    const CHARS_PER_TOKEN: f64 = 4.0;
    /// Fixed overhead per message for role/formatting tokens.
    const MSG_OVERHEAD: usize = 4;
    /// Fixed overhead for a system message.
    const SYSTEM_OVERHEAD: usize = 3;
    /// Per-tool overhead in the prompt.
    const TOOL_OVERHEAD: usize = 20;

    /// Estimate token count for a raw string.
    pub fn estimate_tokens(text: &str) -> usize {
        (text.len() as f64 / Self::CHARS_PER_TOKEN).ceil() as usize
    }

    /// Estimate token count for a single message.
    pub fn estimate_message(msg: &Message) -> usize {
        let content_tokens = msg
            .content
            .as_deref()
            .map_or(0, Self::estimate_tokens);
        let tool_tokens: usize = msg
            .tool_calls
            .iter()
            .map(|tc| {
                Self::estimate_tokens(&tc.function.name)
                    + Self::estimate_tokens(&tc.function.arguments.to_string())
            })
            .sum();
        content_tokens + tool_tokens + Self::MSG_OVERHEAD
    }

    /// Estimate total token count for a message list.
    pub fn estimate_messages(messages: &[Message]) -> usize {
        let mut total: usize = Self::SYSTEM_OVERHEAD;
        for msg in messages {
            total += Self::estimate_message(msg);
        }
        total
    }

    /// Estimate tokens consumed by tool definitions in the prompt.
    pub fn estimate_tools(tools: &[ToolDefinition]) -> usize {
        tools
            .iter()
            .map(|t| {
                Self::estimate_tokens(&t.name)
                    + Self::estimate_tokens(&t.description)
                    + Self::estimate_tokens(&t.parameters.to_string())
                    + Self::TOOL_OVERHEAD
            })
            .sum()
    }

    /// Check if messages + tools fit within a context window, reserving
    /// space for the response.
    pub fn fits_context(
        messages: &[Message],
        tools: &[ToolDefinition],
        max_context_tokens: usize,
        reserved_for_output: usize,
    ) -> bool {
        let used = Self::estimate_messages(messages) + Self::estimate_tools(tools);
        used + reserved_for_output <= max_context_tokens
    }

    /// Available tokens for output after accounting for messages + tools.
    pub fn available_for_output(
        messages: &[Message],
        tools: &[ToolDefinition],
        max_context_tokens: usize,
    ) -> usize {
        let used = Self::estimate_messages(messages) + Self::estimate_tools(tools);
        max_context_tokens.saturating_sub(used)
    }

    /// Truncate messages (dropping oldest non-system) until they fit.
    ///
    /// Returns the number of messages dropped.
    pub fn truncate_to_budget(
        messages: &mut Vec<Message>,
        tools: &[ToolDefinition],
        max_context_tokens: usize,
        reserved_for_output: usize,
    ) -> usize {
        let tool_tokens = Self::estimate_tools(tools);
        let budget = max_context_tokens.saturating_sub(tool_tokens + reserved_for_output);
        let mut dropped = 0;

        while Self::estimate_messages(messages) > budget && messages.len() > 1 {
            // Find the first non-system message and remove it
            if let Some(idx) = messages.iter().position(|m| {
                !matches!(m.role, crate::message::Role::System)
            }) {
                messages.remove(idx);
                dropped += 1;
            } else {
                break;
            }
        }
        dropped
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::message::Message;
    use crate::tools::ToolBuilder;
    use crate::tools::ParamType;

    #[test]
    fn test_estimate_tokens_short() {
        let est = TokenEstimator::estimate_tokens("hello world");
        // 11 chars / 4 = 2.75 → ceil → 3
        assert_eq!(est, 3);
    }

    #[test]
    fn test_estimate_tokens_empty() {
        assert_eq!(TokenEstimator::estimate_tokens(""), 0);
    }

    #[test]
    fn test_estimate_message() {
        let m = Message::user("Test message here");
        let est = TokenEstimator::estimate_message(&m);
        // 17 chars → 5 tokens + 4 overhead = 9
        assert!(est > 0);
        assert!(est < 20);
    }

    #[test]
    fn test_estimate_messages_includes_system_overhead() {
        let msgs = vec![Message::system("be helpful")];
        let est = TokenEstimator::estimate_messages(&msgs);
        // system overhead (3) + msg overhead (4) + content tokens
        assert!(est >= 7);
    }

    #[test]
    fn test_fits_context() {
        let msgs = vec![Message::user("short")];
        // With a massive context, should always fit
        assert!(TokenEstimator::fits_context(&msgs, &[], 100_000, 4096));
    }

    #[test]
    fn test_fits_context_too_small() {
        let msgs = vec![
            Message::system("You are a long system prompt ".repeat(100).as_str()),
        ];
        assert!(!TokenEstimator::fits_context(&msgs, &[], 10, 5));
    }

    #[test]
    fn test_truncate_to_budget() {
        let mut msgs = vec![
            Message::system("sys"),
            Message::user("msg 1"),
            Message::assistant("resp 1"),
            Message::user("msg 2"),
            Message::assistant("resp 2"),
            Message::user("msg 3"),
        ];
        let dropped = TokenEstimator::truncate_to_budget(&mut msgs, &[], 30, 5);
        assert!(dropped > 0);
        // System message should survive
        assert!(matches!(msgs[0].role, crate::message::Role::System));
    }

    #[test]
    fn test_available_for_output() {
        let msgs = vec![Message::user("hi")];
        let avail = TokenEstimator::available_for_output(&msgs, &[], 10000);
        assert!(avail > 9900);
    }

    #[test]
    fn test_estimate_tools() {
        let tools = vec![
            ToolBuilder::new("whois", "Whois lookup")
                .param("domain", ParamType::String, "Domain", true)
                .build(),
        ];
        let est = TokenEstimator::estimate_tools(&tools);
        assert!(est > 20);
    }
}
