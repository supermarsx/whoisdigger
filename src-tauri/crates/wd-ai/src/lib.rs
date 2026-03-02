use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

// ─── Naive Bayes Model ──────────────────────────────────────────────────────

/// Availability label for the Naive Bayes classifier.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Label {
    Available,
    Unavailable,
}

/// Serialized model structure, matching the TypeScript `Model` interface.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Model {
    pub vocabulary: Vec<String>,
    #[serde(rename = "classTotals")]
    pub class_totals: HashMap<Label, u64>,
    #[serde(rename = "tokenTotals")]
    pub token_totals: HashMap<Label, u64>,
    #[serde(rename = "tokenCounts")]
    pub token_counts: HashMap<Label, HashMap<String, u64>>,
}

/// Tokenize text: lowercase, strip non-alphanumerics, split on whitespace.
pub fn tokenize(text: &str) -> Vec<String> {
    let cleaned: String = text
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { ' ' })
        .collect();
    cleaned
        .split_whitespace()
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .collect()
}

/// Predict whether a WHOIS reply indicates availability.
///
/// Returns `"available"`, `"unavailable"`, or `"error"` if no model
/// is provided.
pub fn predict(model: &Model, text: &str) -> &'static str {
    let tokens = tokenize(text);
    let vocab_size = model.vocabulary.len() as f64;
    let total_docs = model
        .class_totals
        .get(&Label::Available)
        .copied()
        .unwrap_or(0) as f64
        + model
            .class_totals
            .get(&Label::Unavailable)
            .copied()
            .unwrap_or(0) as f64;

    if total_docs == 0.0 {
        return "error";
    }

    let score = |label: &Label| -> f64 {
        let class_total = *model.class_totals.get(label).unwrap_or(&0) as f64;
        let token_total = *model.token_totals.get(label).unwrap_or(&0) as f64;
        let token_map = model.token_counts.get(label);

        let mut s = (class_total / total_docs).ln();
        for t in &tokens {
            let count = token_map
                .and_then(|m| m.get(t))
                .copied()
                .unwrap_or(0) as f64;
            s += ((count + 1.0) / (token_total + vocab_size)).ln();
        }
        s
    };

    let avail_score = score(&Label::Available);
    let unavail_score = score(&Label::Unavailable);

    if avail_score > unavail_score {
        "available"
    } else {
        "unavailable"
    }
}

/// Load a model from a JSON file under `base_dir`.
pub async fn load_model(base_dir: &Path, model_path: &str) -> Result<Model, String> {
    let dest = safe_path(base_dir, model_path)?;
    let data = tokio::fs::read_to_string(&dest)
        .await
        .map_err(|e| format!("Failed to read model: {}", e))?;
    serde_json::from_str(&data).map_err(|e| format!("Failed to parse model: {}", e))
}

/// Download a model file from `url` to `dest` under `base_dir`.
pub async fn download_model(base_dir: &Path, url: &str, dest: &str) -> Result<(), String> {
    let dest_path = safe_path(base_dir, dest)?;

    if let Some(parent) = dest_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let client = reqwest::Client::new();
    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("HTTP {}", res.status()));
    }

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    tokio::fs::write(&dest_path, &bytes)
        .await
        .map_err(|e| format!("Failed to write model file: {}", e))?;

    Ok(())
}

// ─── OpenAI Suggest ──────────────────────────────────────────────────────────

/// Settings required for OpenAI API calls.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct OpenAiSettings {
    pub url: Option<String>,
    #[serde(rename = "apiKey")]
    pub api_key: Option<String>,
    pub model: Option<String>,
}

/// Request word suggestions from an OpenAI-compatible API endpoint.
pub async fn suggest_words(
    settings: &OpenAiSettings,
    prompt: &str,
    count: usize,
) -> Result<Vec<String>, String> {
    if count == 0 {
        return Ok(vec![]);
    }

    let url = settings
        .url
        .as_deref()
        .ok_or("OpenAI URL not configured")?;
    let api_key = settings
        .api_key
        .as_deref()
        .ok_or("OpenAI API key not configured")?;

    if url.is_empty() || api_key.is_empty() {
        return Err("OpenAI API disabled".into());
    }

    let model_name = settings
        .model
        .as_deref()
        .unwrap_or("gpt-3.5-turbo");

    let body = serde_json::json!({
        "model": model_name,
        "messages": [{ "role": "user", "content": prompt }],
        "n": 1,
        "max_tokens": 32
    });

    let client = reqwest::Client::new();
    let res = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("HTTP {}", res.status()));
    }

    let data: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let text = data
        .pointer("/choices/0/message/content")
        .or_else(|| data.pointer("/choices/0/text"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string();

    let words: Vec<String> = text
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .take(count)
        .collect();

    Ok(words)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/// Resolve a relative `sub` path under `base` and ensure it stays within
/// `base` to prevent path traversal attacks.
fn safe_path(base: &Path, sub: &str) -> Result<PathBuf, String> {
    let dest = base.join(sub);
    let canonical_base = base
        .canonicalize()
        .unwrap_or_else(|_| base.to_path_buf());
    let canonical_dest = dest.canonicalize().unwrap_or_else(|_| dest.clone());

    if canonical_dest != canonical_base
        && !canonical_dest.starts_with(&canonical_base)
    {
        return Err("Invalid path: traversal detected".into());
    }

    Ok(dest)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_model() -> Model {
        let mut class_totals = HashMap::new();
        class_totals.insert(Label::Available, 10);
        class_totals.insert(Label::Unavailable, 10);

        let mut token_totals = HashMap::new();
        token_totals.insert(Label::Available, 30);
        token_totals.insert(Label::Unavailable, 30);

        let mut avail_counts = HashMap::new();
        avail_counts.insert("no".into(), 8u64);
        avail_counts.insert("match".into(), 7);
        avail_counts.insert("domain".into(), 5);
        avail_counts.insert("free".into(), 6);

        let mut unavail_counts = HashMap::new();
        unavail_counts.insert("expiration".into(), 8u64);
        unavail_counts.insert("date".into(), 7);
        unavail_counts.insert("registrar".into(), 6);
        unavail_counts.insert("domain".into(), 3);

        let mut token_counts = HashMap::new();
        token_counts.insert(Label::Available, avail_counts);
        token_counts.insert(Label::Unavailable, unavail_counts);

        let vocabulary: Vec<String> = vec![
            "no", "match", "domain", "free", "expiration", "date", "registrar",
        ]
        .into_iter()
        .map(String::from)
        .collect();

        Model {
            vocabulary,
            class_totals,
            token_totals,
            token_counts,
        }
    }

    #[test]
    fn test_tokenize() {
        assert_eq!(tokenize("Hello World!"), vec!["hello", "world"]);
        assert_eq!(tokenize("no-match: 123"), vec!["no", "match", "123"]);
        assert_eq!(tokenize(""), Vec::<String>::new());
    }

    #[test]
    fn test_predict_available() {
        let model = sample_model();
        assert_eq!(predict(&model, "No match for domain"), "available");
    }

    #[test]
    fn test_predict_unavailable() {
        let model = sample_model();
        assert_eq!(predict(&model, "Expiration Date: 2030"), "unavailable");
    }

    #[test]
    fn test_predict_empty_model() {
        let model = Model {
            vocabulary: vec![],
            class_totals: HashMap::new(),
            token_totals: HashMap::new(),
            token_counts: HashMap::new(),
        };
        assert_eq!(predict(&model, "anything"), "error");
    }

    #[test]
    fn test_model_serialization_roundtrip() {
        let model = sample_model();
        let json = serde_json::to_string(&model).unwrap();
        let deserialized: Model = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.vocabulary.len(), model.vocabulary.len());
        assert_eq!(
            deserialized.class_totals.get(&Label::Available),
            model.class_totals.get(&Label::Available)
        );
    }

    #[test]
    fn test_safe_path_normal() {
        let base = Path::new("/tmp/models");
        assert!(safe_path(base, "my_model.json").is_ok());
    }

    #[test]
    fn test_suggest_words_zero_count() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let settings = OpenAiSettings::default();
        let result = rt.block_on(suggest_words(&settings, "test", 0));
        assert_eq!(result.unwrap(), Vec::<String>::new());
    }

    #[test]
    fn test_suggest_words_no_config() {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let settings = OpenAiSettings::default();
        let result = rt.block_on(suggest_words(&settings, "test", 5));
        assert!(result.is_err());
    }
}
