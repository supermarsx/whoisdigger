use serde::{Deserialize, Serialize};
use wd_llm::{Message, Role, TokenEstimator as TE, ToolDefinition};

/// Strategy for managing the conversation context window.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ContextStrategy {
    /// Keep the last N messages (sliding window).
    SlidingWindow,
    /// Keep system + first + last messages; summarise the middle.
    PinnedEnds,
    /// Always keep system prompt; drop oldest non-system messages.
    DropOldest,
    /// Smart: pin system, pin last N user+assistant, drop middle.
    Smart,
}

/// Configuration for context management.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ContextConfig {
    /// Maximum context tokens (model's context window).
    pub max_context_tokens: usize,
    /// Tokens to reserve for the model's output.
    pub reserved_output_tokens: usize,
    /// Strategy to use.
    pub strategy: ContextStrategy,
    /// For SlidingWindow: number of recent messages to keep.
    #[serde(default = "default_window_size")]
    pub window_size: usize,
    /// For Smart: number of recent turns to always keep.
    #[serde(default = "default_pinned_recent")]
    pub pinned_recent: usize,
}

fn default_window_size() -> usize {
    20
}

fn default_pinned_recent() -> usize {
    6
}

impl Default for ContextConfig {
    fn default() -> Self {
        Self {
            max_context_tokens: 128_000,
            reserved_output_tokens: 4096,
            strategy: ContextStrategy::Smart,
            window_size: default_window_size(),
            pinned_recent: default_pinned_recent(),
        }
    }
}

/// Manages trimming of the message list to fit within the context window.
pub struct ContextManager {
    config: ContextConfig,
}

impl ContextManager {
    pub fn new(config: ContextConfig) -> Self {
        Self { config }
    }

    /// Trim messages to fit within the configured context budget.
    /// Returns the trimmed message list.
    pub fn trim(&self, messages: &[Message], tools: &[ToolDefinition]) -> Vec<Message> {
        match self.config.strategy {
            ContextStrategy::SlidingWindow => self.trim_sliding(messages),
            ContextStrategy::DropOldest => self.trim_drop_oldest(messages, tools),
            ContextStrategy::PinnedEnds => self.trim_pinned_ends(messages, tools),
            ContextStrategy::Smart => self.trim_smart(messages, tools),
        }
    }

    /// How many tokens are available for the model output after accounting
    /// for the given messages and tools.
    pub fn available_output_tokens(&self, messages: &[Message], tools: &[ToolDefinition]) -> usize {
        TE::available_for_output(messages, tools, self.config.max_context_tokens)
    }

    /// Whether the given messages + tools fit within the context window
    /// with enough room for output.
    pub fn fits(&self, messages: &[Message], tools: &[ToolDefinition]) -> bool {
        TE::fits_context(
            messages,
            tools,
            self.config.max_context_tokens,
            self.config.reserved_output_tokens,
        )
    }

    // ─── Strategies ──────────────────────────────────────────────────────

    fn trim_sliding(&self, messages: &[Message]) -> Vec<Message> {
        let mut result = Vec::new();

        // Always keep system messages at the start
        for m in messages {
            if m.role == Role::System {
                result.push(m.clone());
            }
        }

        // Keep the last `window_size` non-system messages
        let non_system: Vec<&Message> =
            messages.iter().filter(|m| m.role != Role::System).collect();
        let start = non_system.len().saturating_sub(self.config.window_size);
        for &m in &non_system[start..] {
            result.push(m.clone());
        }

        result
    }

    fn trim_drop_oldest(&self, messages: &[Message], tools: &[ToolDefinition]) -> Vec<Message> {
        let budget = self
            .config
            .max_context_tokens
            .saturating_sub(self.config.reserved_output_tokens);

        let mut result: Vec<Message> = Vec::new();

        // Collect system messages first
        let system_msgs: Vec<&Message> =
            messages.iter().filter(|m| m.role == Role::System).collect();
        let non_system: Vec<&Message> =
            messages.iter().filter(|m| m.role != Role::System).collect();

        for &m in &system_msgs {
            result.push(m.clone());
        }

        // Estimate tokens used so far
        let tool_tokens = TE::estimate_tools(tools);
        let system_tokens: usize = result.iter().map(|m| TE::estimate_message(m)).sum();
        let mut used = system_tokens + tool_tokens;

        // Add messages from newest to oldest, then reverse
        let mut tail = Vec::new();
        for &m in non_system.iter().rev() {
            let cost = TE::estimate_message(m);
            if used + cost > budget {
                break;
            }
            used += cost;
            tail.push(m.clone());
        }
        tail.reverse();
        result.extend(tail);

        result
    }

    fn trim_pinned_ends(&self, messages: &[Message], tools: &[ToolDefinition]) -> Vec<Message> {
        let budget = self
            .config
            .max_context_tokens
            .saturating_sub(self.config.reserved_output_tokens);

        let non_system: Vec<&Message> =
            messages.iter().filter(|m| m.role != Role::System).collect();

        let mut result: Vec<Message> = messages
            .iter()
            .filter(|m| m.role == Role::System)
            .cloned()
            .collect();

        if non_system.is_empty() {
            return result;
        }

        let tool_tokens = TE::estimate_tools(tools);
        let mut used: usize = result
            .iter()
            .map(|m| TE::estimate_message(m))
            .sum::<usize>()
            + tool_tokens;

        // Pin first non-system message
        let first = non_system[0].clone();
        used += TE::estimate_message(&first);
        result.push(first);

        // Add from the end as many as fit
        let mut tail = Vec::new();
        for &m in non_system[1..].iter().rev() {
            let cost = TE::estimate_message(m);
            if used + cost > budget {
                break;
            }
            used += cost;
            tail.push(m.clone());
        }
        tail.reverse();
        result.extend(tail);

        result
    }

    fn trim_smart(&self, messages: &[Message], tools: &[ToolDefinition]) -> Vec<Message> {
        let budget = self
            .config
            .max_context_tokens
            .saturating_sub(self.config.reserved_output_tokens);

        let system: Vec<Message> = messages
            .iter()
            .filter(|m| m.role == Role::System)
            .cloned()
            .collect();
        let non_system: Vec<&Message> =
            messages.iter().filter(|m| m.role != Role::System).collect();

        let tool_tokens = TE::estimate_tools(tools);
        let sys_tokens: usize = system.iter().map(|m| TE::estimate_message(m)).sum();
        let mut used = sys_tokens + tool_tokens;

        // Always pin the last `pinned_recent` messages
        let pinned_count = self.config.pinned_recent.min(non_system.len());
        let pinned_start = non_system.len().saturating_sub(pinned_count);

        let pinned: Vec<Message> = non_system[pinned_start..]
            .iter()
            .map(|&m| m.clone())
            .collect();

        let pinned_tokens: usize = pinned.iter().map(|m| TE::estimate_message(m)).sum();
        used += pinned_tokens;

        // Fill from the earliest non-system messages up to budget
        let mut middle = Vec::new();
        for &m in &non_system[..pinned_start] {
            let cost = TE::estimate_message(m);
            if used + cost > budget {
                break;
            }
            used += cost;
            middle.push(m.clone());
        }

        let mut result = system;
        result.extend(middle);
        result.extend(pinned);
        result
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn make_msgs(n: usize) -> Vec<Message> {
        let mut msgs = vec![Message::system("You are helpful.")];
        for i in 0..n {
            if i % 2 == 0 {
                msgs.push(Message::user(&format!("Question {i}")));
            } else {
                msgs.push(Message::assistant(&format!("Answer {i}")));
            }
        }
        msgs
    }

    #[test]
    fn test_sliding_window() {
        let config = ContextConfig {
            strategy: ContextStrategy::SlidingWindow,
            window_size: 4,
            ..Default::default()
        };
        let mgr = ContextManager::new(config);
        let msgs = make_msgs(10);
        let trimmed = mgr.trim(&msgs, &[]);
        // system + last 4
        assert_eq!(trimmed.len(), 5);
        assert_eq!(trimmed[0].role, Role::System);
    }

    #[test]
    fn test_drop_oldest_fits() {
        let config = ContextConfig {
            strategy: ContextStrategy::DropOldest,
            max_context_tokens: 1_000_000,
            reserved_output_tokens: 4096,
            ..Default::default()
        };
        let mgr = ContextManager::new(config);
        let msgs = make_msgs(6);
        let trimmed = mgr.trim(&msgs, &[]);
        // Everything fits
        assert_eq!(trimmed.len(), msgs.len());
    }

    #[test]
    fn test_drop_oldest_trims() {
        let config = ContextConfig {
            strategy: ContextStrategy::DropOldest,
            max_context_tokens: 50, // very tight
            reserved_output_tokens: 10,
            ..Default::default()
        };
        let mgr = ContextManager::new(config);
        let msgs = make_msgs(20);
        let trimmed = mgr.trim(&msgs, &[]);
        // Should be shorter than original
        assert!(trimmed.len() < msgs.len());
        // System is preserved
        assert_eq!(trimmed[0].role, Role::System);
    }

    #[test]
    fn test_pinned_ends() {
        let config = ContextConfig {
            strategy: ContextStrategy::PinnedEnds,
            max_context_tokens: 1_000_000,
            reserved_output_tokens: 4096,
            ..Default::default()
        };
        let mgr = ContextManager::new(config);
        let msgs = make_msgs(6);
        let trimmed = mgr.trim(&msgs, &[]);
        assert_eq!(trimmed.len(), msgs.len());
        assert_eq!(trimmed[0].role, Role::System);
    }

    #[test]
    fn test_smart_preserves_recent() {
        let config = ContextConfig {
            strategy: ContextStrategy::Smart,
            max_context_tokens: 100,
            reserved_output_tokens: 10,
            pinned_recent: 2,
            ..Default::default()
        };
        let mgr = ContextManager::new(config);
        let msgs = make_msgs(10);
        let trimmed = mgr.trim(&msgs, &[]);
        // System + at least the 2 pinned recent
        assert!(trimmed.len() >= 3);
        assert_eq!(trimmed[0].role, Role::System);
        // The last trimmed messages should be the last from the original
        let last = &trimmed[trimmed.len() - 1];
        let orig_last = &msgs[msgs.len() - 1];
        assert_eq!(last.content, orig_last.content);
    }

    #[test]
    fn test_fits() {
        let config = ContextConfig {
            max_context_tokens: 1_000_000,
            reserved_output_tokens: 4096,
            ..Default::default()
        };
        let mgr = ContextManager::new(config);
        let msgs = vec![Message::user("hello")];
        assert!(mgr.fits(&msgs, &[]));
    }

    #[test]
    fn test_available_output() {
        let config = ContextConfig {
            max_context_tokens: 1000,
            reserved_output_tokens: 100,
            ..Default::default()
        };
        let mgr = ContextManager::new(config);
        let msgs = vec![Message::user("hello")];
        let avail = mgr.available_output_tokens(&msgs, &[]);
        assert!(avail > 900); // Almost all 1000 available
    }

    #[test]
    fn test_default_config() {
        let c = ContextConfig::default();
        assert_eq!(c.max_context_tokens, 128_000);
        assert_eq!(c.strategy, ContextStrategy::Smart);
    }
}
