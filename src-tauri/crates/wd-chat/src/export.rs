use chrono::Utc;
use serde::{Deserialize, Serialize};

use wd_llm::Role;

use crate::session::ChatSession;

/// Supported export formats.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExportFormat {
    Markdown,
    Json,
    PlainText,
    Html,
}

/// Exports a chat session to various text formats.
pub struct SessionExporter;

impl SessionExporter {
    /// Export a session to the requested format.
    pub fn export(session: &ChatSession, format: &ExportFormat) -> String {
        match format {
            ExportFormat::Markdown => Self::to_markdown(session),
            ExportFormat::Json => Self::to_json(session),
            ExportFormat::PlainText => Self::to_plain_text(session),
            ExportFormat::Html => Self::to_html(session),
        }
    }

    /// Export to Markdown.
    pub fn to_markdown(session: &ChatSession) -> String {
        let mut out = String::new();
        out.push_str(&format!("# {}\n\n", session.title));
        out.push_str(&format!(
            "_Persona: {} | Created: {}_\n\n",
            session.persona.name,
            session.created_at.format("%Y-%m-%d %H:%M UTC")
        ));
        out.push_str("---\n\n");

        for msg in &session.messages {
            let role_label = role_label(&msg.role);
            let content = msg.content.as_deref().unwrap_or("");
            out.push_str(&format!("**{role_label}:**\n\n{content}\n\n"));
        }

        if session.metadata.total_tokens > 0 {
            out.push_str("---\n\n");
            out.push_str(&format!(
                "_Total tokens: {} | Estimated cost: ${:.4}_\n",
                session.metadata.total_tokens, session.metadata.estimated_cost_usd
            ));
        }

        out
    }

    /// Export to JSON (pretty-printed).
    pub fn to_json(session: &ChatSession) -> String {
        serde_json::to_string_pretty(session).unwrap_or_else(|_| "{}".to_string())
    }

    /// Export to plain text.
    pub fn to_plain_text(session: &ChatSession) -> String {
        let mut out = String::new();
        out.push_str(&format!("{}\n", session.title));
        out.push_str(&format!("Persona: {}\n", session.persona.name));
        out.push_str(&format!(
            "Created: {}\n\n",
            session.created_at.format("%Y-%m-%d %H:%M UTC")
        ));

        for msg in &session.messages {
            let role_label = role_label(&msg.role);
            let content = msg.content.as_deref().unwrap_or("");
            out.push_str(&format!("[{role_label}]\n{content}\n\n"));
        }

        out
    }

    /// Export to HTML.
    pub fn to_html(session: &ChatSession) -> String {
        let mut out = String::new();
        out.push_str("<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\">");
        out.push_str(&format!("<title>{}</title>", html_escape(&session.title)));
        out.push_str(
            "<style>body{font-family:sans-serif;max-width:800px;margin:auto;padding:20px}",
        );
        out.push_str(".msg{margin-bottom:16px;padding:12px;border-radius:8px}");
        out.push_str(".user{background:#e3f2fd}.assistant{background:#f5f5f5}");
        out.push_str(".system{background:#fff3e0;font-style:italic}");
        out.push_str(".tool{background:#e8f5e9}");
        out.push_str(".role{font-weight:bold;margin-bottom:4px}");
        out.push_str("</style></head><body>");
        out.push_str(&format!("<h1>{}</h1>", html_escape(&session.title)));
        out.push_str(&format!(
            "<p><em>Persona: {} | Created: {}</em></p><hr>",
            html_escape(&session.persona.name),
            session.created_at.format("%Y-%m-%d %H:%M UTC")
        ));

        for msg in &session.messages {
            let role_label = role_label(&msg.role);
            let css_class = match msg.role {
                Role::User => "user",
                Role::Assistant => "assistant",
                Role::System => "system",
                Role::Tool => "tool",
            };
            let content = msg.content.as_deref().unwrap_or("");
            out.push_str(&format!(
                "<div class=\"msg {css_class}\"><div class=\"role\">{role_label}</div><div>{}</div></div>",
                html_escape(content).replace('\n', "<br>")
            ));
        }

        if session.metadata.total_tokens > 0 {
            out.push_str(&format!(
                "<hr><p><em>Total tokens: {} | Estimated cost: ${:.4}</em></p>",
                session.metadata.total_tokens, session.metadata.estimated_cost_usd
            ));
        }

        out.push_str("</body></html>");
        out
    }

    /// Generate a suggested filename for the export.
    pub fn filename(session: &ChatSession, format: &ExportFormat) -> String {
        let slug: String = session
            .title
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == '-' {
                    c
                } else {
                    '_'
                }
            })
            .take(40)
            .collect();
        let date = Utc::now().format("%Y%m%d");
        let ext = match format {
            ExportFormat::Markdown => "md",
            ExportFormat::Json => "json",
            ExportFormat::PlainText => "txt",
            ExportFormat::Html => "html",
        };
        format!("{slug}_{date}.{ext}")
    }
}

fn role_label(role: &Role) -> &'static str {
    match role {
        Role::System => "System",
        Role::User => "User",
        Role::Assistant => "Assistant",
        Role::Tool => "Tool",
    }
}

fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::persona::PersonaKind;

    fn sample_session() -> ChatSession {
        let mut s = ChatSession::new(PersonaKind::WhoisAnalyst, Some("Test"));
        s.add_user_message("Who owns example.com?");
        s.add_assistant_message("The registrant is Example Inc.");
        s.record_usage(100, 50, 0.005);
        s
    }

    #[test]
    fn test_markdown_export() {
        let md = SessionExporter::to_markdown(&sample_session());
        assert!(md.contains("# Test"));
        assert!(md.contains("**User:**"));
        assert!(md.contains("example.com"));
        assert!(md.contains("Total tokens: 150"));
    }

    #[test]
    fn test_json_export() {
        let j = SessionExporter::to_json(&sample_session());
        let parsed: serde_json::Value = serde_json::from_str(&j).unwrap();
        assert_eq!(parsed["title"], "Test");
    }

    #[test]
    fn test_plain_text_export() {
        let txt = SessionExporter::to_plain_text(&sample_session());
        assert!(txt.contains("[User]"));
        assert!(txt.contains("example.com"));
    }

    #[test]
    fn test_html_export() {
        let html = SessionExporter::to_html(&sample_session());
        assert!(html.contains("<!DOCTYPE html>"));
        assert!(html.contains("<h1>Test</h1>"));
        assert!(html.contains("class=\"msg user\""));
    }

    #[test]
    fn test_html_escapes() {
        let mut s = ChatSession::new(
            PersonaKind::GeneralAssistant,
            Some("<script>alert</script>"),
        );
        s.add_user_message("x < y & z > w");
        let html = SessionExporter::to_html(&s);
        assert!(html.contains("&lt;script&gt;"));
        assert!(html.contains("&lt; y &amp; z &gt;"));
    }

    #[test]
    fn test_filename_generation() {
        let s = sample_session();
        let fname = SessionExporter::filename(&s, &ExportFormat::Markdown);
        assert!(fname.ends_with(".md"));
        assert!(fname.starts_with("Test_"));
    }

    #[test]
    fn test_export_dispatch() {
        let s = sample_session();
        for fmt in &[
            ExportFormat::Markdown,
            ExportFormat::Json,
            ExportFormat::PlainText,
            ExportFormat::Html,
        ] {
            let out = SessionExporter::export(&s, fmt);
            assert!(!out.is_empty(), "Empty export for {fmt:?}");
        }
    }
}
