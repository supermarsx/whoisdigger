use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Kinds of events the agent can emit.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EventKind {
    RunStarted {
        run_id: String,
        query: String,
    },
    RunCompleted {
        run_id: String,
        iterations: usize,
        cost: f64,
    },
    IterationStarted {
        iteration: usize,
    },
    IterationLimitReached {
        iterations: usize,
    },
    BudgetExhausted {
        spent: f64,
        limit: f64,
    },
    ToolCallStarted {
        tool_name: String,
    },
    ToolCallCompleted {
        tool_name: String,
        success: bool,
    },
    PlanCreated {
        goal: String,
        steps: usize,
    },
    PlanStepStarted {
        step_index: usize,
        description: String,
    },
    PlanStepCompleted {
        step_index: usize,
    },
    Thinking {
        content: String,
    },
    Error {
        message: String,
    },
}

/// A timestamped agent event for IPC streaming.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentEvent {
    pub timestamp: DateTime<Utc>,
    pub kind: EventKind,
}

impl AgentEvent {
    pub fn new(kind: EventKind) -> Self {
        Self {
            timestamp: Utc::now(),
            kind,
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_creation() {
        let event = AgentEvent::new(EventKind::RunStarted {
            run_id: "r1".into(),
            query: "test".into(),
        });
        assert!(event.timestamp <= Utc::now());
    }

    #[test]
    fn test_event_serde() {
        let event = AgentEvent::new(EventKind::ToolCallStarted {
            tool_name: "whois_lookup".into(),
        });
        let j = serde_json::to_string(&event).unwrap();
        let e2: AgentEvent = serde_json::from_str(&j).unwrap();
        assert!(matches!(e2.kind, EventKind::ToolCallStarted { .. }));
    }

    #[test]
    fn test_all_event_kinds_serialize() {
        let events = vec![
            EventKind::RunStarted {
                run_id: "r".into(),
                query: "q".into(),
            },
            EventKind::RunCompleted {
                run_id: "r".into(),
                iterations: 3,
                cost: 0.01,
            },
            EventKind::IterationStarted { iteration: 1 },
            EventKind::IterationLimitReached { iterations: 15 },
            EventKind::BudgetExhausted {
                spent: 1.5,
                limit: 1.0,
            },
            EventKind::ToolCallStarted {
                tool_name: "t".into(),
            },
            EventKind::ToolCallCompleted {
                tool_name: "t".into(),
                success: true,
            },
            EventKind::PlanCreated {
                goal: "g".into(),
                steps: 3,
            },
            EventKind::PlanStepStarted {
                step_index: 1,
                description: "d".into(),
            },
            EventKind::PlanStepCompleted { step_index: 1 },
            EventKind::Thinking {
                content: "hmm".into(),
            },
            EventKind::Error {
                message: "err".into(),
            },
        ];
        for kind in events {
            let event = AgentEvent::new(kind);
            let j = serde_json::to_string(&event).unwrap();
            assert!(!j.is_empty());
            // Ensure it round-trips
            let _: AgentEvent = serde_json::from_str(&j).unwrap();
        }
    }
}
