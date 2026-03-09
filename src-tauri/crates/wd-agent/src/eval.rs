use serde::{Deserialize, Serialize};

/// Grading of a response.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum EvalGrade {
    Good,
    Acceptable,
    Poor,
    Failed,
}

/// Result of evaluating an agent response.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EvalResult {
    pub grade: EvalGrade,
    /// Individual checks performed.
    pub checks: Vec<EvalCheck>,
    /// Overall score (0.0 – 1.0).
    pub score: f64,
    /// Human-readable summary.
    pub summary: String,
}

/// A single evaluation check.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EvalCheck {
    pub name: String,
    pub passed: bool,
    pub detail: String,
}

/// Evaluates agent responses for quality and correctness.
pub struct ResponseEvaluator;

impl ResponseEvaluator {
    /// Evaluate a response against the original query and any tool results.
    pub fn evaluate(query: &str, response: &str, tool_results: &[(String, String)]) -> EvalResult {
        let mut checks = Vec::new();

        // Check 1: Response is non-empty
        let non_empty = !response.trim().is_empty();
        checks.push(EvalCheck {
            name: "non_empty".into(),
            passed: non_empty,
            detail: if non_empty {
                "Response is not empty".into()
            } else {
                "Response is empty".into()
            },
        });

        // Check 2: Response length is reasonable
        let reasonable_length = response.len() >= 10 && response.len() <= 50_000;
        checks.push(EvalCheck {
            name: "reasonable_length".into(),
            passed: reasonable_length,
            detail: format!("Response length: {} chars", response.len()),
        });

        // Check 3: Response mentions query terms (basic grounding)
        let query_words: Vec<&str> = query.split_whitespace().filter(|w| w.len() > 3).collect();
        let response_lower = response.to_lowercase();
        let grounding_hits = query_words
            .iter()
            .filter(|w| response_lower.contains(&w.to_lowercase()))
            .count();
        let grounding_ratio = if query_words.is_empty() {
            1.0
        } else {
            grounding_hits as f64 / query_words.len() as f64
        };
        let grounded = grounding_ratio >= 0.3;
        checks.push(EvalCheck {
            name: "grounding".into(),
            passed: grounded,
            detail: format!(
                "Query term overlap: {:.0}% ({}/{})",
                grounding_ratio * 100.0,
                grounding_hits,
                query_words.len()
            ),
        });

        // Check 4: If tool results were used, response should reference them
        let references_tools = if tool_results.is_empty() {
            true
        } else {
            tool_results.iter().any(|(_name, result)| {
                // Check if any key data from tool results appears in response
                let result_words: Vec<&str> = result
                    .split_whitespace()
                    .filter(|w| w.len() > 4)
                    .take(10)
                    .collect();
                result_words
                    .iter()
                    .any(|w| response_lower.contains(&w.to_lowercase()))
            })
        };
        checks.push(EvalCheck {
            name: "tool_reference".into(),
            passed: references_tools,
            detail: if tool_results.is_empty() {
                "No tool results to reference".into()
            } else if references_tools {
                "Response references tool results".into()
            } else {
                "Response may not reference tool results".into()
            },
        });

        // Check 5: No hallucination markers (hedging without data)
        let hallucination_markers = [
            "I don't have access",
            "I cannot verify",
            "I'm not sure but",
            "I think it might be",
        ];
        let no_hallucination = !hallucination_markers
            .iter()
            .any(|m| response_lower.contains(&m.to_lowercase()));
        checks.push(EvalCheck {
            name: "no_hallucination".into(),
            passed: no_hallucination,
            detail: if no_hallucination {
                "No hallucination markers detected".into()
            } else {
                "Possible hallucination markers found".into()
            },
        });

        // Calculate score
        let passed = checks.iter().filter(|c| c.passed).count();
        let total = checks.len();
        let score = passed as f64 / total as f64;

        let grade = if score >= 0.8 {
            EvalGrade::Good
        } else if score >= 0.6 {
            EvalGrade::Acceptable
        } else if score >= 0.4 {
            EvalGrade::Poor
        } else {
            EvalGrade::Failed
        };

        let summary = format!("{passed}/{total} checks passed (score: {score:.2})",);

        EvalResult {
            grade,
            checks,
            score,
            summary,
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_good_response() {
        let result = ResponseEvaluator::evaluate(
            "Who owns example.com?",
            "example.com is owned by Example Inc, registered through Registrar X. \
             The domain was created in 1995 and expires in 2025.",
            &[("whois_lookup".into(), "Registrant: Example Inc".into())],
        );
        assert_eq!(result.grade, EvalGrade::Good);
        assert!(result.score >= 0.8);
    }

    #[test]
    fn test_empty_response() {
        let result = ResponseEvaluator::evaluate("test", "", &[]);
        assert_eq!(result.grade, EvalGrade::Poor);
        assert!(!result.checks[0].passed); // non_empty check
    }

    #[test]
    fn test_ungrounded_response() {
        let result = ResponseEvaluator::evaluate(
            "Tell me about example.com DNS records",
            "The weather today is sunny with a chance of rain.",
            &[],
        );
        // Low grounding score
        let grounding = result
            .checks
            .iter()
            .find(|c| c.name == "grounding")
            .unwrap();
        assert!(!grounding.passed);
    }

    #[test]
    fn test_hallucination_detection() {
        let result = ResponseEvaluator::evaluate(
            "Who owns test.com?",
            "I don't have access to that information, but I think it might be some company.",
            &[],
        );
        let hallucination = result
            .checks
            .iter()
            .find(|c| c.name == "no_hallucination")
            .unwrap();
        assert!(!hallucination.passed);
    }

    #[test]
    fn test_no_tool_results() {
        let result = ResponseEvaluator::evaluate(
            "Hello",
            "Hi there! How can I help you with domain research today?",
            &[],
        );
        let tool_ref = result
            .checks
            .iter()
            .find(|c| c.name == "tool_reference")
            .unwrap();
        assert!(tool_ref.passed); // No tools to reference, so it passes
    }

    #[test]
    fn test_score_calculation() {
        let result = ResponseEvaluator::evaluate(
            "test query",
            "A reasonable test response with query terms",
            &[],
        );
        assert!(result.score > 0.0);
        assert!(result.score <= 1.0);
        assert!(!result.summary.is_empty());
    }
}
