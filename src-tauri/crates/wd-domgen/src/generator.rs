use serde::{Deserialize, Serialize};

/// A generated domain suggestion with metadata.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GeneratedDomain {
    pub domain: String,
    /// How this domain was generated.
    pub source: GenerationSource,
    /// Optional relevance or quality score (0.0 – 1.0).
    pub score: Option<f64>,
    /// Tags describing the generation method.
    #[serde(default)]
    pub tags: Vec<String>,
}

/// How a domain was generated.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum GenerationSource {
    Combinator,
    Mutation,
    AiSuggestion,
    Synonym,
    Abbreviation,
    Rhyme,
    Custom(String),
}

/// Configuration for the generator engine.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GeneratorConfig {
    /// Base keywords/concepts the user wants the domain to convey.
    pub keywords: Vec<String>,
    /// TLDs to expand across.
    pub tlds: Vec<String>,
    /// Industry or theme context (e.g., "tech", "food", "finance").
    pub industry: Option<String>,
    /// Maximum total suggestions to return.
    pub max_results: usize,
    /// Use AI for additional suggestions (requires external API).
    pub use_ai: bool,
    /// AI prompt template (default provided).
    pub ai_prompt_template: Option<String>,
}

impl Default for GeneratorConfig {
    fn default() -> Self {
        Self {
            keywords: Vec::new(),
            tlds: vec![".com".into()],
            industry: None,
            max_results: 100,
            use_ai: false,
            ai_prompt_template: None,
        }
    }
}

/// The main generator engine that orchestrates combinator + mutator + rules.
pub struct GeneratorEngine {
    config: GeneratorConfig,
}

impl GeneratorEngine {
    pub fn new(config: GeneratorConfig) -> Self {
        Self { config }
    }

    /// Generate domain suggestions using rule-based logic.
    /// AI suggestions require a separate async API call — this method returns
    /// a prompt string via `ai_prompt()` that can be sent to an LLM.
    pub fn generate(&self) -> Vec<GeneratedDomain> {
        let mut results = Vec::new();

        // 1. Generate from combinator
        let combo_config = crate::combinator::CombinatorConfig {
            words: self.config.keywords.clone(),
            prefixes: Self::default_prefixes(),
            suffixes: Self::default_suffixes(),
            tlds: self.config.tlds.clone(),
            ..Default::default()
        };
        for domain in crate::combinator::expand_combinations(&combo_config) {
            results.push(GeneratedDomain {
                domain,
                source: GenerationSource::Combinator,
                score: None,
                tags: vec!["combinator".into()],
            });
        }

        // 2. Abbreviations from keywords
        if self.config.keywords.len() >= 2 {
            let abbrev: String = self
                .config
                .keywords
                .iter()
                .map(|w| w.chars().next().unwrap_or('x'))
                .collect();
            for tld in &self.config.tlds {
                let tld = if tld.starts_with('.') {
                    tld.clone()
                } else {
                    format!(".{tld}")
                };
                results.push(GeneratedDomain {
                    domain: format!("{abbrev}{tld}").to_lowercase(),
                    source: GenerationSource::Abbreviation,
                    score: Some(0.5),
                    tags: vec!["abbreviation".into()],
                });
            }
        }

        // 3. Mutations of first keyword
        if let Some(kw) = self.config.keywords.first() {
            let mut_config = crate::mutator::MutatorConfig {
                max_variants: 20,
                ..Default::default()
            };
            for variant in crate::mutator::mutate_domain(kw, &mut_config) {
                for tld in &self.config.tlds {
                    let tld = if tld.starts_with('.') {
                        tld.clone()
                    } else {
                        format!(".{tld}")
                    };
                    results.push(GeneratedDomain {
                        domain: format!("{variant}{tld}").to_lowercase(),
                        source: GenerationSource::Mutation,
                        score: Some(0.3),
                        tags: vec!["mutation".into()],
                    });
                }
            }
        }

        results.truncate(self.config.max_results);
        results
    }

    /// Build an AI prompt for domain suggestions.
    /// The caller is responsible for sending this to an LLM and parsing the results.
    pub fn ai_prompt(&self) -> String {
        if let Some(ref template) = self.config.ai_prompt_template {
            template
                .replace("{keywords}", &self.config.keywords.join(", "))
                .replace(
                    "{industry}",
                    self.config.industry.as_deref().unwrap_or("general"),
                )
                .replace("{tlds}", &self.config.tlds.join(", "))
        } else {
            format!(
                "Suggest 20 creative, brandable domain names for a {} project \
                 related to: {}. Use these TLDs: {}. \
                 Return one domain per line, no explanations.",
                self.config.industry.as_deref().unwrap_or("general"),
                self.config.keywords.join(", "),
                self.config.tlds.join(", "),
            )
        }
    }

    /// Parse AI response text into `GeneratedDomain` entries.
    pub fn parse_ai_response(text: &str, _tlds: &[String]) -> Vec<GeneratedDomain> {
        text.lines()
            .map(|line| {
                line.trim().trim_start_matches(|c: char| {
                    c.is_ascii_digit() || c == '.' || c == ')' || c == '-' || c == ' '
                })
            })
            .map(|line| line.trim().to_lowercase())
            .filter(|line| !line.is_empty() && line.contains('.'))
            .map(|domain| GeneratedDomain {
                domain,
                source: GenerationSource::AiSuggestion,
                score: Some(0.8),
                tags: vec!["ai".into()],
            })
            .collect()
    }

    fn default_prefixes() -> Vec<String> {
        vec![
            "get".into(),
            "my".into(),
            "go".into(),
            "try".into(),
            "use".into(),
        ]
    }

    fn default_suffixes() -> Vec<String> {
        vec![
            "hub".into(),
            "lab".into(),
            "app".into(),
            "hq".into(),
            "io".into(),
        ]
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generator_basic() {
        let config = GeneratorConfig {
            keywords: vec!["cloud".into()],
            tlds: vec![".com".into()],
            max_results: 200,
            ..Default::default()
        };
        let engine = GeneratorEngine::new(config);
        let results = engine.generate();
        assert!(!results.is_empty());
        assert!(results.iter().any(|d| d.domain == "cloud.com"));
        assert!(results
            .iter()
            .any(|d| d.source == GenerationSource::Combinator));
    }

    #[test]
    fn test_generator_mutations_included() {
        let config = GeneratorConfig {
            keywords: vec!["fast".into()],
            tlds: vec![".io".into()],
            max_results: 200,
            ..Default::default()
        };
        let results = GeneratorEngine::new(config).generate();
        assert!(results
            .iter()
            .any(|d| d.source == GenerationSource::Mutation));
    }

    #[test]
    fn test_abbreviation() {
        let config = GeneratorConfig {
            keywords: vec!["cloud".into(), "net".into(), "work".into()],
            tlds: vec![".com".into()],
            max_results: 500,
            ..Default::default()
        };
        let results = GeneratorEngine::new(config).generate();
        assert!(results.iter().any(|d| d.domain == "cnw.com"));
    }

    #[test]
    fn test_ai_prompt() {
        let config = GeneratorConfig {
            keywords: vec!["cloud".into(), "speed".into()],
            industry: Some("tech".into()),
            tlds: vec![".com".into(), ".io".into()],
            ..Default::default()
        };
        let prompt = GeneratorEngine::new(config).ai_prompt();
        assert!(prompt.contains("cloud"));
        assert!(prompt.contains("tech"));
    }

    #[test]
    fn test_parse_ai_response() {
        let text = "1. cloudspeed.com\n2. fastnet.io\n3. gocloud.dev\n";
        let results = GeneratorEngine::parse_ai_response(text, &[".com".into()]);
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].domain, "cloudspeed.com");
        assert_eq!(results[0].source, GenerationSource::AiSuggestion);
    }

    #[test]
    fn test_max_results_limit() {
        let config = GeneratorConfig {
            keywords: vec!["test".into()],
            tlds: vec![".com".into()],
            max_results: 5,
            ..Default::default()
        };
        let results = GeneratorEngine::new(config).generate();
        assert!(results.len() <= 5);
    }

    #[test]
    fn test_custom_ai_prompt_template() {
        let config = GeneratorConfig {
            keywords: vec!["x".into()],
            ai_prompt_template: Some(
                "Generate domains for {keywords} in {industry} using {tlds}".into(),
            ),
            industry: Some("finance".into()),
            tlds: vec![".com".into()],
            ..Default::default()
        };
        let prompt = GeneratorEngine::new(config).ai_prompt();
        assert!(prompt.contains("finance"));
        assert!(prompt.contains(".com"));
    }
}
