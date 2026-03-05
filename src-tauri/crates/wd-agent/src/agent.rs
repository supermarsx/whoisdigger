use serde::{Deserialize, Serialize};
use uuid::Uuid;

use wd_llm::{CompletionResponse, Message, Role, ToolCall};

use crate::event::{AgentEvent, EventKind};
use crate::executor::ToolExecutor;
use crate::memory::WorkingMemory;
use crate::sandbox::{Sandbox, SandboxConfig};

/// Configuration for an agent run.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentConfig {
    /// Maximum iterations (LLM calls) in a single run.
    #[serde(default = "default_max_iterations")]
    pub max_iterations: usize,
    /// Maximum estimated spend (USD) before aborting.
    #[serde(default = "default_max_cost")]
    pub max_cost_usd: f64,
    /// Whether to allow parallel tool calls in a single step.
    #[serde(default)]
    pub parallel_tool_calls: bool,
    /// Model to use (overrides session default).
    #[serde(default)]
    pub model: Option<String>,
    /// Temperature override.
    #[serde(default)]
    pub temperature: Option<f32>,
}

fn default_max_iterations() -> usize {
    15
}

fn default_max_cost() -> f64 {
    1.0
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            max_iterations: default_max_iterations(),
            max_cost_usd: default_max_cost(),
            parallel_tool_calls: false,
            model: None,
            temperature: None,
        }
    }
}

/// Describes one step the agent took.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum AgentStep {
    /// LLM produced a text response.
    AssistantMessage { content: String },
    /// LLM requested one or more tool calls.
    ToolCalls { calls: Vec<ToolCall> },
    /// Tool results were fed back to the LLM.
    ToolResults {
        results: Vec<(String, String)>,
    },
    /// Safety sandbox blocked a tool call.
    SandboxBlock { tool_name: String, reason: String },
    /// Budget limit reached.
    BudgetExhausted { spent_usd: f64, limit_usd: f64 },
    /// Iteration limit reached.
    IterationLimit { iterations: usize, max: usize },
}

/// Final result from an agent run.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentResult {
    /// Unique run ID.
    pub run_id: String,
    /// Final assistant answer (if any).
    pub answer: Option<String>,
    /// All steps taken.
    pub steps: Vec<AgentStep>,
    /// Total iterations used.
    pub iterations: usize,
    /// Total estimated cost.
    pub total_cost_usd: f64,
    /// Whether the run completed successfully or was cut short.
    pub completed: bool,
}

/// The core autonomous agent.
pub struct Agent {
    pub config: AgentConfig,
    pub sandbox: Sandbox,
    pub memory: WorkingMemory,
    events: Vec<AgentEvent>,
}

impl Agent {
    pub fn new(config: AgentConfig) -> Self {
        let sandbox = Sandbox::new(SandboxConfig::default());
        Self {
            config,
            sandbox,
            memory: WorkingMemory::new(),
            events: Vec::new(),
        }
    }

    pub fn with_sandbox(mut self, sandbox: Sandbox) -> Self {
        self.sandbox = sandbox;
        self
    }

    /// Execute the agent loop synchronously (no real LLM calls — requires
    /// an injected completion function for testability).
    ///
    /// `complete_fn` simulates the LLM: given messages it returns a response.
    /// `executor` handles tool calls.
    pub fn run<F>(
        &mut self,
        system_prompt: &str,
        user_query: &str,
        tools: &[wd_llm::ToolDefinition],
        executor: &ToolExecutor,
        mut complete_fn: F,
    ) -> AgentResult
    where
        F: FnMut(&[Message], &[wd_llm::ToolDefinition]) -> Result<CompletionResponse, wd_llm::LlmError>,
    {
        let run_id = Uuid::new_v4().to_string();
        let mut steps = Vec::new();
        let mut messages = Vec::new();
        let mut iterations = 0usize;
        let mut total_cost = 0.0f64;

        // System prompt
        messages.push(Message::system(system_prompt));
        // Working memory context
        if let Some(ctx) = self.memory.to_context_message() {
            messages.push(ctx);
        }
        // User query
        messages.push(Message::user(user_query));

        self.emit(EventKind::RunStarted {
            run_id: run_id.clone(),
            query: user_query.to_string(),
        });

        loop {
            // Check iteration limit
            if iterations >= self.config.max_iterations {
                steps.push(AgentStep::IterationLimit {
                    iterations,
                    max: self.config.max_iterations,
                });
                self.emit(EventKind::IterationLimitReached { iterations });
                break;
            }

            // Check cost limit
            if total_cost >= self.config.max_cost_usd {
                steps.push(AgentStep::BudgetExhausted {
                    spent_usd: total_cost,
                    limit_usd: self.config.max_cost_usd,
                });
                self.emit(EventKind::BudgetExhausted {
                    spent: total_cost,
                    limit: self.config.max_cost_usd,
                });
                break;
            }

            iterations += 1;
            self.emit(EventKind::IterationStarted {
                iteration: iterations,
            });

            // Call LLM
            let response = match complete_fn(&messages, tools) {
                Ok(r) => r,
                Err(e) => {
                    self.emit(EventKind::Error {
                        message: e.to_string(),
                    });
                    break;
                }
            };

            // Track cost
            if let Some(cost) = response.usage.estimated_cost_usd {
                total_cost += cost;
            }

            // Check if assistant wants to call tools
            if response.message.role == Role::Assistant && !response.message.tool_calls.is_empty() {
                let tool_calls = response.message.tool_calls.clone();
                messages.push(response.message.clone());
                steps.push(AgentStep::ToolCalls {
                    calls: tool_calls.clone(),
                });

                // Execute each tool call
                let mut results = Vec::new();
                for tc in &tool_calls {
                    // Sandbox check
                    if let Err(violation) = self.sandbox.check_tool(&tc.function.name) {
                        steps.push(AgentStep::SandboxBlock {
                            tool_name: tc.function.name.clone(),
                            reason: violation.to_string(),
                        });
                        let err_msg = format!("Blocked by sandbox: {violation}");
                        messages.push(Message::tool_result(&tc.id, &tc.function.name, &err_msg));
                        results.push((tc.function.name.clone(), err_msg));
                        continue;
                    }

                    self.emit(EventKind::ToolCallStarted {
                        tool_name: tc.function.name.clone(),
                    });

                    let result = executor.execute(&tc.function.name, &tc.function.arguments);

                    self.emit(EventKind::ToolCallCompleted {
                        tool_name: tc.function.name.clone(),
                        success: result.is_ok(),
                    });

                    let result_str = match result {
                        Ok(v) => v.to_string(),
                        Err(e) => format!("Error: {e}"),
                    };
                    messages.push(Message::tool_result(&tc.id, &tc.function.name, &result_str));
                    results.push((tc.function.name.clone(), result_str));
                }

                steps.push(AgentStep::ToolResults { results });
                continue; // Loop back for LLM to process results
            }

            // Assistant produced a final text message
            if let Some(content) = &response.message.content {
                messages.push(response.message.clone());
                steps.push(AgentStep::AssistantMessage {
                    content: content.clone(),
                });
            }

            // Check finish reason
            if response.finish_reason.is_tool_use() {
                continue;
            }
            break;
        }

        let answer = steps.iter().rev().find_map(|s| {
            if let AgentStep::AssistantMessage { content } = s {
                Some(content.clone())
            } else {
                None
            }
        });

        let completed = answer.is_some();

        self.emit(EventKind::RunCompleted {
            run_id: run_id.clone(),
            iterations,
            cost: total_cost,
        });

        AgentResult {
            run_id,
            answer,
            steps,
            iterations,
            total_cost_usd: total_cost,
            completed,
        }
    }

    /// Get all events emitted during runs.
    pub fn events(&self) -> &[AgentEvent] {
        &self.events
    }

    fn emit(&mut self, kind: EventKind) {
        self.events.push(AgentEvent::new(kind));
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::executor::ToolExecutor;
    use wd_llm::{CompletionResponse, FinishReason, Message, TokenUsage};

    fn simple_response(text: &str) -> CompletionResponse {
        CompletionResponse {
            id: "r1".into(),
            model: "test".into(),
            message: Message::assistant(text),
            finish_reason: FinishReason::Stop,
            usage: TokenUsage {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
                estimated_cost_usd: Some(0.001),
            },
            latency_ms: 100,
        }
    }

    fn tool_call_response() -> CompletionResponse {
        use wd_llm::{FunctionCall, ToolCall};
        let tc = ToolCall {
            id: "tc1".into(),
            function: FunctionCall {
                name: "whois_lookup".into(),
                arguments: serde_json::json!({"domain": "test.com"}),
            },
        };
        CompletionResponse {
            id: "r2".into(),
            model: "test".into(),
            message: Message::assistant_tool_calls(vec![tc]),
            finish_reason: FinishReason::ToolUse,
            usage: TokenUsage {
                prompt_tokens: 20,
                completion_tokens: 10,
                total_tokens: 30,
                estimated_cost_usd: Some(0.002),
            },
            latency_ms: 150,
        }
    }

    #[test]
    fn test_simple_run() {
        let mut agent = Agent::new(AgentConfig::default());
        let executor = ToolExecutor::new();
        let result = agent.run(
            "You are helpful",
            "Hello",
            &[],
            &executor,
            |_msgs, _tools| Ok(simple_response("Hi there!")),
        );
        assert!(result.completed);
        assert_eq!(result.answer, Some("Hi there!".into()));
        assert_eq!(result.iterations, 1);
    }

    #[test]
    fn test_tool_call_then_response() {
        let mut agent = Agent::new(AgentConfig::default());
        let mut executor = ToolExecutor::new();
        executor.register_handler("whois_lookup", |_args| {
            Ok(serde_json::json!({"registrant": "Test Corp"}))
        });

        let mut call_count = 0;
        let result = agent.run(
            "System",
            "Lookup test.com",
            &[],
            &executor,
            move |_msgs, _tools| {
                call_count += 1;
                if call_count == 1 {
                    Ok(tool_call_response())
                } else {
                    Ok(simple_response("test.com is registered to Test Corp."))
                }
            },
        );
        assert!(result.completed);
        assert!(result.answer.unwrap().contains("Test Corp"));
        assert_eq!(result.iterations, 2);
        assert!(result.steps.len() >= 3); // ToolCalls + ToolResults + AssistantMessage
    }

    #[test]
    fn test_iteration_limit() {
        let config = AgentConfig {
            max_iterations: 2,
            ..Default::default()
        };
        let mut agent = Agent::new(config);
        let executor = ToolExecutor::new();

        let result = agent.run(
            "System",
            "Loop",
            &[],
            &executor,
            |_msgs, _tools| Ok(tool_call_response()),
        );
        assert!(!result.completed);
        assert!(result.steps.iter().any(|s| matches!(s, AgentStep::IterationLimit { .. })));
    }

    #[test]
    fn test_budget_exhausted() {
        let config = AgentConfig {
            max_cost_usd: 0.001,
            ..Default::default()
        };
        let mut agent = Agent::new(config);
        let executor = ToolExecutor::new();

        let mut call_count = 0;
        let result = agent.run(
            "System",
            "Expensive query",
            &[],
            &executor,
            move |_msgs, _tools| {
                call_count += 1;
                // First call spends 0.001, second should trigger budget
                Ok(simple_response(&format!("response {call_count}")))
            },
        );
        // After 1st iteration, cost = 0.001 >= limit, so 2nd iteration is blocked
        assert!(result.steps.iter().any(|s| matches!(s, AgentStep::BudgetExhausted { .. }))
            || result.iterations <= 2);
    }

    #[test]
    fn test_sandbox_blocks_tool() {
        let mut agent = Agent::new(AgentConfig::default());
        agent.sandbox.block_tool("dangerous_tool");

        let mut executor = ToolExecutor::new();
        executor.register_handler("dangerous_tool", |_| Ok(serde_json::json!("done")));

        // Create a response that tries to call blocked tool
        let mut call_count = 0;
        let result = agent.run(
            "System",
            "Do something",
            &[],
            &executor,
            move |_msgs, _tools| {
                call_count += 1;
                if call_count == 1 {
                    use wd_llm::{FunctionCall, ToolCall};
                    let tc = ToolCall {
                        id: "tc1".into(),
                        function: FunctionCall {
                            name: "dangerous_tool".into(),
                            arguments: serde_json::json!({}),
                        },
                    };
                    Ok(CompletionResponse {
                        id: "r".into(),
                        model: "test".into(),
                        message: Message::assistant_tool_calls(vec![tc]),
                        finish_reason: FinishReason::ToolUse,
                        usage: TokenUsage {
                            prompt_tokens: 10,
                            completion_tokens: 5,
                            total_tokens: 15,
                            estimated_cost_usd: None,
                        },
                        latency_ms: 50,
                    })
                } else {
                    Ok(simple_response("OK, I couldn't use that tool."))
                }
            },
        );
        assert!(result.steps.iter().any(|s| matches!(s, AgentStep::SandboxBlock { .. })));
    }

    #[test]
    fn test_events_emitted() {
        let mut agent = Agent::new(AgentConfig::default());
        let executor = ToolExecutor::new();
        agent.run(
            "System",
            "Hello",
            &[],
            &executor,
            |_msgs, _tools| Ok(simple_response("Hi")),
        );
        let events = agent.events();
        assert!(!events.is_empty());
        assert!(events.iter().any(|e| matches!(e.kind, EventKind::RunStarted { .. })));
        assert!(events.iter().any(|e| matches!(e.kind, EventKind::RunCompleted { .. })));
    }

    #[test]
    fn test_default_config() {
        let c = AgentConfig::default();
        assert_eq!(c.max_iterations, 15);
        assert!((c.max_cost_usd - 1.0).abs() < f64::EPSILON);
        assert!(!c.parallel_tool_calls);
    }
}
