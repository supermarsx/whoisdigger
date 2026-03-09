use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use wd_llm::Message;

/// Persistent working memory for the agent within a run.
#[derive(Default)]
pub struct WorkingMemory {
    /// Key-value facts the agent has discovered.
    pub facts: HashMap<String, String>,
    /// Domain-specific knowledge entries.
    pub domain_knowledge: Vec<DomainKnowledge>,
    /// Scratchpad notes the agent can write to itself.
    pub notes: Vec<String>,
}

impl WorkingMemory {
    pub fn new() -> Self {
        Self::default()
    }

    /// Record a fact.
    pub fn add_fact(&mut self, key: &str, value: &str) {
        self.facts.insert(key.to_string(), value.to_string());
    }

    /// Get a fact by key.
    pub fn get_fact(&self, key: &str) -> Option<&str> {
        self.facts.get(key).map(|s| s.as_str())
    }

    /// Add domain knowledge.
    pub fn add_domain_knowledge(&mut self, knowledge: DomainKnowledge) {
        self.domain_knowledge.push(knowledge);
    }

    /// Add a note.
    pub fn add_note(&mut self, note: &str) {
        self.notes.push(note.to_string());
    }

    /// Get knowledge for a specific domain.
    pub fn knowledge_for(&self, domain: &str) -> Vec<&DomainKnowledge> {
        self.domain_knowledge
            .iter()
            .filter(|k| k.domain == domain)
            .collect()
    }

    /// Convert working memory into a context message for the LLM.
    /// Returns `None` if the memory is empty.
    pub fn to_context_message(&self) -> Option<Message> {
        if self.facts.is_empty() && self.domain_knowledge.is_empty() && self.notes.is_empty() {
            return None;
        }

        let mut content = String::from("<working_memory>\n");

        if !self.facts.is_empty() {
            content.push_str("<facts>\n");
            for (k, v) in &self.facts {
                content.push_str(&format!("- {k}: {v}\n"));
            }
            content.push_str("</facts>\n");
        }

        if !self.domain_knowledge.is_empty() {
            content.push_str("<domain_knowledge>\n");
            for dk in &self.domain_knowledge {
                content.push_str(&format!("- {} ({}): {}\n", dk.domain, dk.kind, dk.summary));
            }
            content.push_str("</domain_knowledge>\n");
        }

        if !self.notes.is_empty() {
            content.push_str("<notes>\n");
            for note in &self.notes {
                content.push_str(&format!("- {note}\n"));
            }
            content.push_str("</notes>\n");
        }

        content.push_str("</working_memory>");
        Some(Message::system(&content))
    }

    /// Clear all memory.
    pub fn clear(&mut self) {
        self.facts.clear();
        self.domain_knowledge.clear();
        self.notes.clear();
    }

    /// Total number of items stored.
    pub fn item_count(&self) -> usize {
        self.facts.len() + self.domain_knowledge.len() + self.notes.len()
    }
}

/// A piece of domain-specific knowledge discovered during a run.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DomainKnowledge {
    /// The domain this knowledge relates to.
    pub domain: String,
    /// Kind of knowledge (e.g. "whois", "dns", "threat").
    pub kind: String,
    /// Human-readable summary.
    pub summary: String,
    /// Structured data (if any).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

impl DomainKnowledge {
    pub fn new(domain: &str, kind: &str, summary: &str) -> Self {
        Self {
            domain: domain.to_string(),
            kind: kind.to_string(),
            summary: summary.to_string(),
            data: None,
        }
    }

    pub fn with_data(mut self, data: serde_json::Value) -> Self {
        self.data = Some(data);
        self
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use wd_llm::Role;

    #[test]
    fn test_empty_memory() {
        let mem = WorkingMemory::new();
        assert_eq!(mem.item_count(), 0);
        assert!(mem.to_context_message().is_none());
    }

    #[test]
    fn test_facts() {
        let mut mem = WorkingMemory::new();
        mem.add_fact("registrar", "Cloudflare");
        assert_eq!(mem.get_fact("registrar"), Some("Cloudflare"));
        assert!(mem.get_fact("missing").is_none());
    }

    #[test]
    fn test_domain_knowledge() {
        let mut mem = WorkingMemory::new();
        mem.add_domain_knowledge(DomainKnowledge::new(
            "example.com",
            "whois",
            "Registered 1995",
        ));
        mem.add_domain_knowledge(DomainKnowledge::new("test.com", "dns", "Has MX records"));
        let knowledge = mem.knowledge_for("example.com");
        assert_eq!(knowledge.len(), 1);
        assert_eq!(knowledge[0].summary, "Registered 1995");
    }

    #[test]
    fn test_notes() {
        let mut mem = WorkingMemory::new();
        mem.add_note("Check privacy protection");
        assert_eq!(mem.notes.len(), 1);
    }

    #[test]
    fn test_context_message() {
        let mut mem = WorkingMemory::new();
        mem.add_fact("key", "val");
        mem.add_note("note 1");
        let msg = mem.to_context_message().unwrap();
        assert_eq!(msg.role, Role::System);
        let content = msg.content.unwrap();
        assert!(content.contains("<working_memory>"));
        assert!(content.contains("key: val"));
        assert!(content.contains("note 1"));
    }

    #[test]
    fn test_clear() {
        let mut mem = WorkingMemory::new();
        mem.add_fact("a", "b");
        mem.add_note("n");
        mem.clear();
        assert_eq!(mem.item_count(), 0);
    }

    #[test]
    fn test_domain_knowledge_with_data() {
        let dk = DomainKnowledge::new("test.com", "dns", "A records")
            .with_data(serde_json::json!({"a": "1.2.3.4"}));
        assert!(dk.data.is_some());
    }
}
