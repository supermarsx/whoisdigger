use serde::{Deserialize, Serialize};

/// A step in a plan.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PlanStep {
    /// Sequential step number (1-based).
    pub index: usize,
    /// Description of what to do.
    pub description: String,
    /// Tool(s) to call, if applicable.
    pub tool_names: Vec<String>,
    /// Expected input (human-readable).
    pub input_hint: Option<String>,
    /// Whether this step depends on previous step output.
    pub depends_on_previous: bool,
    /// Status of this step.
    pub status: PlanStepStatus,
}

/// Status of a plan step.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum PlanStepStatus {
    Pending,
    InProgress,
    Completed,
    Skipped,
    Failed,
}

/// A complete plan for accomplishing a task.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Plan {
    /// Human-readable goal.
    pub goal: String,
    /// Ordered steps.
    pub steps: Vec<PlanStep>,
    /// Estimated total cost hint.
    pub estimated_cost_hint: Option<String>,
}

impl Plan {
    /// Create a new plan.
    pub fn new(goal: &str) -> Self {
        Self {
            goal: goal.to_string(),
            steps: Vec::new(),
            estimated_cost_hint: None,
        }
    }

    /// Add a step.
    pub fn add_step(
        &mut self,
        description: &str,
        tool_names: Vec<String>,
        depends_on_previous: bool,
    ) {
        let index = self.steps.len() + 1;
        self.steps.push(PlanStep {
            index,
            description: description.to_string(),
            tool_names,
            input_hint: None,
            depends_on_previous,
            status: PlanStepStatus::Pending,
        });
    }

    /// Mark a step as in-progress.
    pub fn start_step(&mut self, index: usize) -> bool {
        if let Some(step) = self.steps.iter_mut().find(|s| s.index == index) {
            step.status = PlanStepStatus::InProgress;
            true
        } else {
            false
        }
    }

    /// Mark a step as completed.
    pub fn complete_step(&mut self, index: usize) -> bool {
        if let Some(step) = self.steps.iter_mut().find(|s| s.index == index) {
            step.status = PlanStepStatus::Completed;
            true
        } else {
            false
        }
    }

    /// Mark a step as failed.
    pub fn fail_step(&mut self, index: usize) -> bool {
        if let Some(step) = self.steps.iter_mut().find(|s| s.index == index) {
            step.status = PlanStepStatus::Failed;
            true
        } else {
            false
        }
    }

    /// Get the next pending step.
    pub fn next_pending(&self) -> Option<&PlanStep> {
        self.steps
            .iter()
            .find(|s| s.status == PlanStepStatus::Pending)
    }

    /// Whether all steps are completed or skipped.
    pub fn is_done(&self) -> bool {
        self.steps.iter().all(|s| {
            s.status == PlanStepStatus::Completed || s.status == PlanStepStatus::Skipped
        })
    }

    /// Count completed steps.
    pub fn completed_count(&self) -> usize {
        self.steps
            .iter()
            .filter(|s| s.status == PlanStepStatus::Completed)
            .count()
    }

    /// Progress as a fraction (0.0 – 1.0).
    pub fn progress(&self) -> f64 {
        if self.steps.is_empty() {
            return 1.0;
        }
        self.completed_count() as f64 / self.steps.len() as f64
    }
}

/// Generates execution plans from a user query.
///
/// In a real implementation this would call the LLM to produce a plan.
/// Here we provide deterministic plan templates for common tasks.
pub struct TaskPlanner;

impl TaskPlanner {
    /// Create a plan for a domain audit.
    pub fn domain_audit(domain: &str) -> Plan {
        let mut plan = Plan::new(&format!("Full audit of {domain}"));
        plan.add_step(
            &format!("WHOIS lookup for {domain}"),
            vec!["whois_lookup".into()],
            false,
        );
        plan.add_step(
            &format!("DNS records for {domain}"),
            vec!["dns_lookup".into()],
            false,
        );
        plan.add_step(
            "Analyse registration and expiry information",
            vec!["parse_whois".into()],
            true,
        );
        plan.add_step(
            "Check for security threats (typosquatting, etc.)",
            vec!["threat_scan".into()],
            true,
        );
        plan.add_step(
            "Produce summary report",
            vec![],
            true,
        );
        plan
    }

    /// Create a plan for a portfolio analysis.
    pub fn portfolio_analysis(domains: &[String]) -> Plan {
        let mut plan = Plan::new(&format!("Portfolio analysis of {} domains", domains.len()));
        plan.add_step(
            "Bulk WHOIS lookup for all domains",
            vec!["bulk_whois".into()],
            false,
        );
        plan.add_step(
            "Extract expiry dates and classify urgency",
            vec!["parse_whois".into(), "check_expiry".into()],
            true,
        );
        plan.add_step(
            "Identify domains nearing expiry",
            vec!["expiry_alert".into()],
            true,
        );
        plan.add_step(
            "Generate portfolio summary with recommendations",
            vec![],
            true,
        );
        plan
    }

    /// Create a plan for a security scan.
    pub fn security_scan(domain: &str) -> Plan {
        let mut plan = Plan::new(&format!("Security scan for {domain}"));
        plan.add_step(
            &format!("WHOIS lookup for {domain}"),
            vec!["whois_lookup".into()],
            false,
        );
        plan.add_step(
            "Generate typosquat candidates",
            vec!["generate_typosquats".into()],
            false,
        );
        plan.add_step(
            "Check typosquat availability",
            vec!["bulk_whois".into()],
            true,
        );
        plan.add_step(
            "Homoglyph and IDN analysis",
            vec!["homoglyph_check".into()],
            true,
        );
        plan.add_step(
            "Produce threat assessment report",
            vec![],
            true,
        );
        plan
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plan_lifecycle() {
        let mut plan = Plan::new("Test goal");
        plan.add_step("Step 1", vec!["tool_a".into()], false);
        plan.add_step("Step 2", vec![], true);
        assert_eq!(plan.steps.len(), 2);
        assert!(!plan.is_done());
        assert!((plan.progress() - 0.0).abs() < f64::EPSILON);

        plan.start_step(1);
        assert_eq!(plan.steps[0].status, PlanStepStatus::InProgress);

        plan.complete_step(1);
        assert_eq!(plan.completed_count(), 1);
        assert!((plan.progress() - 0.5).abs() < f64::EPSILON);

        plan.complete_step(2);
        assert!(plan.is_done());
        assert!((plan.progress() - 1.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_next_pending() {
        let mut plan = Plan::new("test");
        plan.add_step("A", vec![], false);
        plan.add_step("B", vec![], false);
        assert_eq!(plan.next_pending().unwrap().index, 1);
        plan.complete_step(1);
        assert_eq!(plan.next_pending().unwrap().index, 2);
        plan.complete_step(2);
        assert!(plan.next_pending().is_none());
    }

    #[test]
    fn test_fail_step() {
        let mut plan = Plan::new("test");
        plan.add_step("A", vec![], false);
        plan.fail_step(1);
        assert_eq!(plan.steps[0].status, PlanStepStatus::Failed);
        assert!(!plan.is_done());
    }

    #[test]
    fn test_domain_audit_plan() {
        let plan = TaskPlanner::domain_audit("example.com");
        assert!(plan.goal.contains("example.com"));
        assert!(plan.steps.len() >= 4);
        assert_eq!(plan.steps[0].tool_names, vec!["whois_lookup"]);
    }

    #[test]
    fn test_portfolio_plan() {
        let domains = vec!["a.com".into(), "b.com".into()];
        let plan = TaskPlanner::portfolio_analysis(&domains);
        assert!(plan.goal.contains("2 domains"));
    }

    #[test]
    fn test_security_scan_plan() {
        let plan = TaskPlanner::security_scan("example.com");
        assert!(plan.steps.iter().any(|s| s.tool_names.contains(&"generate_typosquats".to_string())));
    }

    #[test]
    fn test_empty_plan_is_done() {
        let plan = Plan::new("empty");
        assert!(plan.is_done());
        assert!((plan.progress() - 1.0).abs() < f64::EPSILON);
    }
}
