use serde::{Deserialize, Serialize};

/// Kinds of attachments that can be added to a chat message.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AttachmentKind {
    /// Raw WHOIS response text.
    WhoisResult,
    /// DNS lookup result.
    DnsResult,
    /// Domain list (bulk import).
    DomainList,
    /// CSV or exported file content.
    ExportFile,
    /// JSON structured data.
    JsonData,
    /// Plain text.
    Text,
    /// URL reference.
    Url,
}

/// An attachment embedded in a chat session, providing context to the LLM.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Attachment {
    /// Attachment kind.
    pub kind: AttachmentKind,
    /// Short label for display.
    pub label: String,
    /// The attachment content (inline).
    pub content: String,
    /// MIME type hint.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub mime_type: Option<String>,
    /// Character length of content.
    pub size: usize,
}

impl Attachment {
    /// Create a new attachment.
    pub fn new(kind: AttachmentKind, label: &str, content: &str) -> Self {
        Self {
            kind,
            label: label.to_string(),
            size: content.len(),
            content: content.to_string(),
            mime_type: None,
        }
    }

    /// Create from WHOIS result.
    pub fn whois(domain: &str, raw: &str) -> Self {
        Self::new(AttachmentKind::WhoisResult, &format!("WHOIS: {domain}"), raw)
    }

    /// Create from DNS result.
    pub fn dns(domain: &str, records: &str) -> Self {
        Self::new(AttachmentKind::DnsResult, &format!("DNS: {domain}"), records)
    }

    /// Create from a domain list.
    pub fn domain_list(name: &str, domains: &[String]) -> Self {
        let content = domains.join("\n");
        Self::new(AttachmentKind::DomainList, name, &content)
    }

    /// Create a JSON attachment.
    pub fn json(label: &str, value: &serde_json::Value) -> Self {
        let content = serde_json::to_string_pretty(value).unwrap_or_default();
        let mut a = Self::new(AttachmentKind::JsonData, label, &content);
        a.mime_type = Some("application/json".to_string());
        a
    }

    /// Truncate content to a maximum character length.
    pub fn truncate(&mut self, max_chars: usize) {
        if self.content.len() > max_chars {
            self.content = self.content.chars().take(max_chars).collect();
            self.content.push_str("\n… (truncated)");
            self.size = self.content.len();
        }
    }

    /// Format the attachment for inclusion in a prompt.
    pub fn to_prompt_block(&self) -> String {
        format!(
            "<attachment kind=\"{}\" label=\"{}\">\n{}\n</attachment>",
            serde_json::to_string(&self.kind).unwrap_or_default().trim_matches('"'),
            self.label,
            self.content,
        )
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_attachment() {
        let a = Attachment::new(AttachmentKind::Text, "note", "hello world");
        assert_eq!(a.kind, AttachmentKind::Text);
        assert_eq!(a.size, 11);
    }

    #[test]
    fn test_whois_attachment() {
        let a = Attachment::whois("example.com", "Registrant: ...");
        assert_eq!(a.kind, AttachmentKind::WhoisResult);
        assert!(a.label.contains("example.com"));
    }

    #[test]
    fn test_dns_attachment() {
        let a = Attachment::dns("example.com", "A 93.184.216.34");
        assert_eq!(a.kind, AttachmentKind::DnsResult);
    }

    #[test]
    fn test_domain_list_attachment() {
        let domains = vec!["a.com".into(), "b.com".into()];
        let a = Attachment::domain_list("batch", &domains);
        assert!(a.content.contains("a.com"));
        assert!(a.content.contains("b.com"));
    }

    #[test]
    fn test_json_attachment() {
        let val = serde_json::json!({"key": "value"});
        let a = Attachment::json("data", &val);
        assert_eq!(a.kind, AttachmentKind::JsonData);
        assert_eq!(a.mime_type, Some("application/json".into()));
    }

    #[test]
    fn test_truncate() {
        let mut a = Attachment::new(AttachmentKind::Text, "long", &"x".repeat(1000));
        a.truncate(100);
        assert!(a.content.len() < 200);
        assert!(a.content.contains("truncated"));
    }

    #[test]
    fn test_to_prompt_block() {
        let a = Attachment::new(AttachmentKind::Text, "note", "test data");
        let block = a.to_prompt_block();
        assert!(block.contains("<attachment"));
        assert!(block.contains("test data"));
        assert!(block.contains("</attachment>"));
    }

    #[test]
    fn test_serde() {
        let a = Attachment::whois("test.com", "raw whois");
        let j = serde_json::to_string(&a).unwrap();
        let a2: Attachment = serde_json::from_str(&j).unwrap();
        assert_eq!(a2.label, a.label);
    }
}
