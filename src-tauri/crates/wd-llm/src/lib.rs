//! # wd-llm — LLM Provider Abstraction Layer
//!
//! Unified interface over multiple LLM backends (OpenAI, Anthropic, Ollama,
//! OpenRouter, Azure, Gemini, custom OpenAI-compatible). Handles HTTP
//! transport, streaming via SSE, tool / function-call schemas, token
//! estimation, and response parsing. Every higher-level AI crate depends on
//! this instead of raw `reqwest`.

pub mod config;
pub mod error;
pub mod message;
pub mod provider;
pub mod request;
pub mod response;
pub mod stream;
pub mod token;
pub mod tools;

pub use config::LlmConfig;
pub use error::LlmError;
pub use message::{FunctionCall, Message, MessageMetadata, Role, ToolCall};
pub use provider::{LlmProvider, ModelInfo, ProviderKind, ProviderRegistry};
pub use request::{CompletionRequest, ResponseFormat, ToolChoice};
pub use response::{CompletionResponse, FinishReason, TokenUsage};
pub use stream::StreamChunk;
pub use token::TokenEstimator;
pub use tools::{ParamType, ToolBuilder, ToolDefinition};
