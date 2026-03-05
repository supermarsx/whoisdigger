use serde::{Deserialize, Serialize};

use crate::message::Message;

/// Outcome of a non-streaming completion call.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CompletionResponse {
    /// Provider-assigned response ID.
    pub id: String,
    /// Model that produced the response.
    pub model: String,
    /// The assistant's reply (may contain tool_calls).
    pub message: Message,
    /// Why the model stopped generating.
    pub finish_reason: FinishReason,
    /// Token accounting.
    pub usage: TokenUsage,
    /// Wall-clock latency in milliseconds.
    pub latency_ms: u64,
}

/// Reason the LLM stopped generating.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    /// Natural end of text.
    Stop,
    /// Model wants to call one or more tools.
    ToolUse,
    /// Hit max_tokens output limit.
    Length,
    /// Content was filtered.
    ContentFilter,
    /// Error during generation.
    Error(String),
}

impl FinishReason {
    /// True if the model wants tool execution.
    pub fn is_tool_use(&self) -> bool {
        matches!(self, Self::ToolUse)
    }

    /// True if the model finished naturally.
    pub fn is_stop(&self) -> bool {
        matches!(self, Self::Stop)
    }
}

/// Token usage and cost tracking.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct TokenUsage {
    pub prompt_tokens: usize,
    pub completion_tokens: usize,
    pub total_tokens: usize,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub estimated_cost_usd: Option<f64>,
}

impl TokenUsage {
    pub fn new(prompt: usize, completion: usize) -> Self {
        Self {
            prompt_tokens: prompt,
            completion_tokens: completion,
            total_tokens: prompt + completion,
            estimated_cost_usd: None,
        }
    }

    /// Add another usage into this one (accumulate over turns).
    pub fn accumulate(&mut self, other: &TokenUsage) {
        self.prompt_tokens += other.prompt_tokens;
        self.completion_tokens += other.completion_tokens;
        self.total_tokens += other.total_tokens;
        match (&mut self.estimated_cost_usd, other.estimated_cost_usd) {
            (Some(a), Some(b)) => *a += b,
            (None, Some(b)) => self.estimated_cost_usd = Some(b),
            _ => {}
        }
    }

    /// Estimate cost given per-1K-token prices.
    pub fn estimate_cost(&mut self, input_per_1k: f64, output_per_1k: f64) {
        let input_cost = (self.prompt_tokens as f64 / 1000.0) * input_per_1k;
        let output_cost = (self.completion_tokens as f64 / 1000.0) * output_per_1k;
        self.estimated_cost_usd = Some(input_cost + output_cost);
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_usage_new() {
        let u = TokenUsage::new(100, 50);
        assert_eq!(u.total_tokens, 150);
    }

    #[test]
    fn test_accumulate() {
        let mut a = TokenUsage::new(100, 50);
        let b = TokenUsage::new(200, 100);
        a.accumulate(&b);
        assert_eq!(a.prompt_tokens, 300);
        assert_eq!(a.completion_tokens, 150);
        assert_eq!(a.total_tokens, 450);
    }

    #[test]
    fn test_accumulate_cost() {
        let mut a = TokenUsage {
            estimated_cost_usd: Some(0.01),
            ..TokenUsage::new(100, 50)
        };
        let b = TokenUsage {
            estimated_cost_usd: Some(0.02),
            ..TokenUsage::new(200, 100)
        };
        a.accumulate(&b);
        assert!((a.estimated_cost_usd.unwrap() - 0.03).abs() < 1e-10);
    }

    #[test]
    fn test_estimate_cost() {
        let mut u = TokenUsage::new(1000, 500);
        // $0.01/1K input, $0.03/1K output
        u.estimate_cost(0.01, 0.03);
        let c = u.estimated_cost_usd.unwrap();
        // 1.0 * 0.01 + 0.5 * 0.03 = 0.01 + 0.015 = 0.025
        assert!((c - 0.025).abs() < 1e-10);
    }

    #[test]
    fn test_finish_reason_checks() {
        assert!(FinishReason::ToolUse.is_tool_use());
        assert!(FinishReason::Stop.is_stop());
        assert!(!FinishReason::Length.is_tool_use());
    }

    #[test]
    fn test_finish_reason_serde() {
        let f = FinishReason::Error("oops".into());
        let j = serde_json::to_string(&f).unwrap();
        let f2: FinishReason = serde_json::from_str(&j).unwrap();
        assert_eq!(f, f2);
    }

    #[test]
    fn test_usage_serde_roundtrip() {
        let u = TokenUsage::new(100, 50);
        let j = serde_json::to_string(&u).unwrap();
        let u2: TokenUsage = serde_json::from_str(&j).unwrap();
        assert_eq!(u2.total_tokens, 150);
    }
}
