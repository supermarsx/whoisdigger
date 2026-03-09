use serde::{Deserialize, Serialize};

/// Supported import formats.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImportFormat {
    /// One domain per line.
    NewlineDelimited,
    /// CSV with configurable column.
    Csv { domain_column: usize },
    /// JSON array of strings.
    JsonArray,
    /// JSON array of objects with domain key.
    JsonObjects { domain_key: String },
    /// DNS zone file format (extract domain names from records).
    ZoneFile,
    /// Certificate Transparency log JSON format.
    CtLog,
    /// Space or tab separated list.
    SpaceSeparated,
    /// Comma-separated inline list.
    CommaSeparated,
    /// Auto-detect format.
    Auto,
}

impl ImportFormat {
    /// Attempt to detect format from content.
    pub fn detect(content: &str) -> Self {
        let trimmed = content.trim();
        if trimmed.starts_with('[') {
            // JSON array
            if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(trimmed) {
                if arr.first().map(|v| v.is_string()).unwrap_or(false) {
                    return ImportFormat::JsonArray;
                } else if arr.first().map(|v| v.is_object()).unwrap_or(false) {
                    return ImportFormat::JsonObjects {
                        domain_key: detect_domain_key(&arr),
                    };
                }
            }
        }
        if trimmed.contains("\t")
            && (trimmed.contains("IN\tA")
                || trimmed.contains("IN\tNS")
                || trimmed.contains("IN\tSOA"))
        {
            return ImportFormat::ZoneFile;
        }
        let first_line = trimmed.lines().next().unwrap_or("");
        if first_line.contains(',') && trimmed.lines().count() > 1 {
            let commas = first_line.matches(',').count();
            if commas >= 1 {
                return ImportFormat::Csv { domain_column: 0 };
            }
        }
        if first_line.contains(',') && trimmed.lines().count() == 1 {
            return ImportFormat::CommaSeparated;
        }
        if trimmed.lines().count() > 1 {
            return ImportFormat::NewlineDelimited;
        }
        if first_line.contains(' ') || first_line.contains('\t') {
            return ImportFormat::SpaceSeparated;
        }
        ImportFormat::NewlineDelimited
    }
}

/// Import source metadata.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ImportSource {
    pub name: String,
    pub format: ImportFormat,
    pub size_bytes: usize,
    pub line_count: usize,
}

impl ImportSource {
    pub fn from_content(name: impl Into<String>, content: &str, format: ImportFormat) -> Self {
        Self {
            name: name.into(),
            format,
            size_bytes: content.len(),
            line_count: content.lines().count(),
        }
    }
}

fn detect_domain_key(arr: &[serde_json::Value]) -> String {
    if let Some(obj) = arr.first().and_then(|v| v.as_object()) {
        for key in ["domain", "name", "hostname", "host", "fqdn", "dns_name"] {
            if obj.contains_key(key) {
                return key.to_string();
            }
        }
    }
    "domain".to_string()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_newline_delimited() {
        let content = "example.com\nexample.org\nexample.net";
        assert_eq!(
            ImportFormat::detect(content),
            ImportFormat::NewlineDelimited
        );
    }

    #[test]
    fn test_detect_json_array() {
        let content = r#"["example.com", "example.org"]"#;
        assert_eq!(ImportFormat::detect(content), ImportFormat::JsonArray);
    }

    #[test]
    fn test_detect_json_objects() {
        let content = r#"[{"domain": "example.com"}, {"domain": "example.org"}]"#;
        assert_eq!(
            ImportFormat::detect(content),
            ImportFormat::JsonObjects {
                domain_key: "domain".into()
            }
        );
    }

    #[test]
    fn test_detect_csv() {
        let content = "domain,status\nexample.com,active\nexample.org,expired";
        assert_eq!(
            ImportFormat::detect(content),
            ImportFormat::Csv { domain_column: 0 }
        );
    }

    #[test]
    fn test_detect_comma_separated_single_line() {
        let content = "example.com,example.org,example.net";
        assert_eq!(ImportFormat::detect(content), ImportFormat::CommaSeparated);
    }

    #[test]
    fn test_import_source() {
        let src = ImportSource::from_content("test.txt", "a\nb\nc", ImportFormat::NewlineDelimited);
        assert_eq!(src.line_count, 3);
        assert_eq!(src.size_bytes, 5);
    }
}
