use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use wd_llm::{Message, Role};

use crate::attachment::Attachment;
use crate::persona::{Persona, PersonaKind};

/// High-level status of a session.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Active,
    Archived,
    Deleted,
}

/// Aggregate metadata for a session.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SessionMetadata {
    pub total_messages: usize,
    pub total_tokens: usize,
    pub estimated_cost_usd: f64,
    pub model: Option<String>,
    pub last_model: Option<String>,
}

impl Default for SessionMetadata {
    fn default() -> Self {
        Self {
            total_messages: 0,
            total_tokens: 0,
            estimated_cost_usd: 0.0,
            model: None,
            last_model: None,
        }
    }
}

/// A single chat session (conversation).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ChatSession {
    pub id: String,
    pub title: String,
    pub persona: Persona,
    pub system_prompt: String,
    pub messages: Vec<Message>,
    pub attachments: Vec<Attachment>,
    pub status: SessionStatus,
    pub metadata: SessionMetadata,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub tags: Vec<String>,
}

impl ChatSession {
    /// Create a new session with a persona and optional title.
    pub fn new(persona_kind: PersonaKind, title: Option<&str>) -> Self {
        let persona = Persona::from_kind(persona_kind.clone());
        let system_prompt = crate::prompt::PromptLibrary::system_prompt(&persona_kind);
        let now = Utc::now();
        Self {
            id: Uuid::new_v4().to_string(),
            title: title.unwrap_or("New Chat").to_string(),
            persona,
            system_prompt,
            messages: Vec::new(),
            attachments: Vec::new(),
            status: SessionStatus::Active,
            metadata: SessionMetadata::default(),
            created_at: now,
            updated_at: now,
            tags: Vec::new(),
        }
    }

    /// Append a user message.
    pub fn add_user_message(&mut self, content: &str) {
        self.messages.push(Message::user(content));
        self.metadata.total_messages += 1;
        self.updated_at = Utc::now();
    }

    /// Append an assistant message.
    pub fn add_assistant_message(&mut self, content: &str) {
        self.messages.push(Message::assistant(content));
        self.metadata.total_messages += 1;
        self.updated_at = Utc::now();
    }

    /// Add a tag to the session.
    pub fn add_tag(&mut self, tag: &str) {
        if !self.tags.contains(&tag.to_string()) {
            self.tags.push(tag.to_string());
        }
    }

    /// Remove a tag from the session.
    pub fn remove_tag(&mut self, tag: &str) -> bool {
        let before = self.tags.len();
        self.tags.retain(|t| t != tag);
        self.tags.len() != before
    }

    /// Build the full message list including the system prompt.
    pub fn build_messages(&self) -> Vec<Message> {
        let mut msgs = Vec::with_capacity(self.messages.len() + 1);
        if !self.system_prompt.is_empty() {
            msgs.push(Message::system(&self.system_prompt));
        }
        msgs.extend(self.messages.iter().cloned());
        msgs
    }

    /// Count user messages.
    pub fn user_message_count(&self) -> usize {
        self.messages
            .iter()
            .filter(|m| m.role == Role::User)
            .count()
    }

    /// Count assistant messages.
    pub fn assistant_message_count(&self) -> usize {
        self.messages
            .iter()
            .filter(|m| m.role == Role::Assistant)
            .count()
    }

    /// Archive this session.
    pub fn archive(&mut self) {
        self.status = SessionStatus::Archived;
        self.updated_at = Utc::now();
    }

    /// Soft-delete this session.
    pub fn delete(&mut self) {
        self.status = SessionStatus::Deleted;
        self.updated_at = Utc::now();
    }

    /// Total character length of all messages.
    pub fn total_text_length(&self) -> usize {
        self.messages.iter().map(|m| m.text_len()).sum()
    }

    /// Update token costs from a completed response.
    pub fn record_usage(&mut self, prompt_tokens: usize, completion_tokens: usize, cost_usd: f64) {
        self.metadata.total_tokens += prompt_tokens + completion_tokens;
        self.metadata.estimated_cost_usd += cost_usd;
    }

    /// Set or auto-generate a title from the first user message.
    pub fn auto_title(&mut self) {
        if self.title == "New Chat" {
            if let Some(first) = self.messages.iter().find(|m| m.role == Role::User) {
                if let Some(content) = &first.content {
                    let truncated: String = content.chars().take(60).collect();
                    self.title = if content.len() > 60 {
                        format!("{truncated}…")
                    } else {
                        truncated
                    };
                }
            }
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_session() {
        let s = ChatSession::new(PersonaKind::DomainExpert, Some("Test"));
        assert_eq!(s.title, "Test");
        assert_eq!(s.status, SessionStatus::Active);
        assert!(!s.system_prompt.is_empty());
        assert!(s.messages.is_empty());
    }

    #[test]
    fn test_add_messages() {
        let mut s = ChatSession::new(PersonaKind::WhoisAnalyst, None);
        s.add_user_message("Who owns example.com?");
        s.add_assistant_message("The registrant is …");
        assert_eq!(s.messages.len(), 2);
        assert_eq!(s.user_message_count(), 1);
        assert_eq!(s.assistant_message_count(), 1);
        assert_eq!(s.metadata.total_messages, 2);
    }

    #[test]
    fn test_build_messages_includes_system() {
        let s = ChatSession::new(PersonaKind::DomainExpert, None);
        let msgs = s.build_messages();
        assert_eq!(msgs.len(), 1); // only system
        assert_eq!(msgs[0].role, Role::System);
    }

    #[test]
    fn test_tags() {
        let mut s = ChatSession::new(PersonaKind::DomainExpert, None);
        s.add_tag("important");
        s.add_tag("important"); // dup
        assert_eq!(s.tags.len(), 1);
        assert!(s.remove_tag("important"));
        assert!(!s.remove_tag("missing"));
    }

    #[test]
    fn test_archive_and_delete() {
        let mut s = ChatSession::new(PersonaKind::DomainExpert, None);
        s.archive();
        assert_eq!(s.status, SessionStatus::Archived);
        s.delete();
        assert_eq!(s.status, SessionStatus::Deleted);
    }

    #[test]
    fn test_record_usage() {
        let mut s = ChatSession::new(PersonaKind::DomainExpert, None);
        s.record_usage(100, 50, 0.01);
        assert_eq!(s.metadata.total_tokens, 150);
        assert!((s.metadata.estimated_cost_usd - 0.01).abs() < f64::EPSILON);
    }

    #[test]
    fn test_auto_title() {
        let mut s = ChatSession::new(PersonaKind::DomainExpert, None);
        assert_eq!(s.title, "New Chat");
        s.add_user_message("Hello world");
        s.auto_title();
        assert_eq!(s.title, "Hello world");
    }

    #[test]
    fn test_auto_title_truncate() {
        let mut s = ChatSession::new(PersonaKind::DomainExpert, None);
        let long = "a".repeat(100);
        s.add_user_message(&long);
        s.auto_title();
        assert!(s.title.len() <= 64); // 60 chars + ellipsis
    }

    #[test]
    fn test_total_text_length() {
        let mut s = ChatSession::new(PersonaKind::DomainExpert, None);
        s.add_user_message("hello"); // 5
        s.add_assistant_message("world!"); // 6
        assert_eq!(s.total_text_length(), 11);
    }

    #[test]
    fn test_session_serde() {
        let mut s = ChatSession::new(PersonaKind::SecurityResearcher, Some("sec"));
        s.add_user_message("test");
        let j = serde_json::to_string(&s).unwrap();
        let s2: ChatSession = serde_json::from_str(&j).unwrap();
        assert_eq!(s2.title, "sec");
        assert_eq!(s2.messages.len(), 1);
    }
}
