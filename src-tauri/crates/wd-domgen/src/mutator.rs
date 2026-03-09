use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Types of character mutations for typosquatting / variant generation.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum MutationKind {
    /// Leet speak: o→0, a→4, e→3, i→1, s→5, t→7
    LeetSpeak,
    /// Replace vowels with similar chars: a→@, o→0
    VowelSubstitution,
    /// Insert hyphens between word boundaries / syllables
    Hyphenation,
    /// Remove vowels: "cloud" → "cld"
    VowelRemoval,
    /// Double a consonant: "fast" → "fasst"
    ConsonantDoubling,
    /// Swap adjacent characters: "cloud" → "colud"
    CharSwap,
    /// Drop a single character: "cloud" → "clod"
    CharDrop,
    /// Append common endings: "s", "r", "ly", "er"
    CommonSuffix,
    /// Homoglyph: l→1, O→0, rn→m
    Homoglyph,
}

/// Configuration for the mutator engine.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MutatorConfig {
    /// Which mutation kinds to apply.
    pub kinds: Vec<MutationKind>,
    /// Maximum variants per input domain.
    pub max_variants: usize,
}

impl Default for MutatorConfig {
    fn default() -> Self {
        Self {
            kinds: vec![
                MutationKind::LeetSpeak,
                MutationKind::VowelSubstitution,
                MutationKind::Hyphenation,
                MutationKind::CharSwap,
                MutationKind::VowelRemoval,
            ],
            max_variants: 50,
        }
    }
}

/// Generate mutated variants of a domain label (without TLD).
pub fn mutate_domain(label: &str, config: &MutatorConfig) -> Vec<String> {
    let mut variants = HashSet::new();

    for kind in &config.kinds {
        let new = match kind {
            MutationKind::LeetSpeak => apply_leet(label),
            MutationKind::VowelSubstitution => apply_vowel_sub(label),
            MutationKind::Hyphenation => apply_hyphenation(label),
            MutationKind::VowelRemoval => vec![remove_vowels(label)],
            MutationKind::ConsonantDoubling => apply_consonant_double(label),
            MutationKind::CharSwap => apply_char_swap(label),
            MutationKind::CharDrop => apply_char_drop(label),
            MutationKind::CommonSuffix => apply_common_suffix(label),
            MutationKind::Homoglyph => apply_homoglyph(label),
        };
        for v in new {
            if !v.is_empty() && v != label {
                variants.insert(v);
            }
            if variants.len() >= config.max_variants {
                break;
            }
        }
        if variants.len() >= config.max_variants {
            break;
        }
    }

    let mut out: Vec<String> = variants.into_iter().collect();
    out.sort();
    out.truncate(config.max_variants);
    out
}

// ─── Mutation Implementations ────────────────────────────────────────────────

fn apply_leet(s: &str) -> Vec<String> {
    let mut result = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            'o' | 'O' => result.push('0'),
            'a' | 'A' => result.push('4'),
            'e' | 'E' => result.push('3'),
            'i' | 'I' => result.push('1'),
            's' | 'S' => result.push('5'),
            't' | 'T' => result.push('7'),
            _ => result.push(c),
        }
    }
    vec![result]
}

fn apply_vowel_sub(s: &str) -> Vec<String> {
    let mut result = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            'a' => result.push('4'),
            'e' => result.push('3'),
            'o' => result.push('0'),
            _ => result.push(c),
        }
    }
    vec![result]
}

fn apply_hyphenation(s: &str) -> Vec<String> {
    let mut results = Vec::new();
    let chars: Vec<char> = s.chars().collect();
    // Insert hyphen at each position between chars
    for i in 1..chars.len() {
        let mut v = String::with_capacity(s.len() + 1);
        for (j, c) in chars.iter().enumerate() {
            if j == i {
                v.push('-');
            }
            v.push(*c);
        }
        results.push(v);
    }
    results
}

fn remove_vowels(s: &str) -> String {
    s.chars()
        .filter(|c| !matches!(c, 'a' | 'e' | 'i' | 'o' | 'u' | 'A' | 'E' | 'I' | 'O' | 'U'))
        .collect()
}

fn apply_consonant_double(s: &str) -> Vec<String> {
    let chars: Vec<char> = s.chars().collect();
    let mut results = Vec::new();
    for (i, c) in chars.iter().enumerate() {
        if !matches!(c, 'a' | 'e' | 'i' | 'o' | 'u' | 'A' | 'E' | 'I' | 'O' | 'U')
            && c.is_alphabetic()
        {
            let mut v = String::with_capacity(s.len() + 1);
            for (j, ch) in chars.iter().enumerate() {
                v.push(*ch);
                if j == i {
                    v.push(*ch);
                }
            }
            results.push(v);
        }
    }
    results
}

fn apply_char_swap(s: &str) -> Vec<String> {
    let chars: Vec<char> = s.chars().collect();
    let mut results = Vec::new();
    for i in 0..chars.len().saturating_sub(1) {
        let mut swapped = chars.clone();
        swapped.swap(i, i + 1);
        let v: String = swapped.into_iter().collect();
        if v != s {
            results.push(v);
        }
    }
    results
}

fn apply_char_drop(s: &str) -> Vec<String> {
    let chars: Vec<char> = s.chars().collect();
    let mut results = Vec::new();
    for i in 0..chars.len() {
        let v: String = chars
            .iter()
            .enumerate()
            .filter(|(j, _)| *j != i)
            .map(|(_, c)| *c)
            .collect();
        if !v.is_empty() {
            results.push(v);
        }
    }
    results
}

fn apply_common_suffix(s: &str) -> Vec<String> {
    vec![
        format!("{s}s"),
        format!("{s}r"),
        format!("{s}er"),
        format!("{s}ly"),
        format!("{s}ify"),
        format!("{s}app"),
    ]
}

fn apply_homoglyph(s: &str) -> Vec<String> {
    let mut result = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            'l' => result.push('1'),
            'O' | 'o' => result.push('0'),
            'I' => result.push('l'),
            _ => result.push(c),
        }
    }
    // Also handle rn→m
    let rn_replaced = s.replace("rn", "m");
    let mut variants = vec![result];
    if rn_replaced != s {
        variants.push(rn_replaced);
    }
    variants
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_leet_speak() {
        let results = apply_leet("cloudstore");
        assert_eq!(results[0], "cl0ud570r3");
    }

    #[test]
    fn test_vowel_removal() {
        assert_eq!(remove_vowels("facebook"), "fcbk");
    }

    #[test]
    fn test_char_swap() {
        let results = apply_char_swap("abc");
        assert!(results.contains(&"bac".to_string()));
        assert!(results.contains(&"acb".to_string()));
    }

    #[test]
    fn test_char_drop() {
        let results = apply_char_drop("abc");
        assert_eq!(results.len(), 3);
        assert!(results.contains(&"bc".to_string()));
        assert!(results.contains(&"ac".to_string()));
        assert!(results.contains(&"ab".to_string()));
    }

    #[test]
    fn test_hyphenation() {
        let results = apply_hyphenation("cloud");
        assert!(results.contains(&"c-loud".to_string()));
        assert!(results.contains(&"cl-oud".to_string()));
    }

    #[test]
    fn test_homoglyph_rn_to_m() {
        let results = apply_homoglyph("burning");
        assert!(results.iter().any(|v| v.contains('m')));
    }

    #[test]
    fn test_mutate_domain_limits() {
        let config = MutatorConfig {
            max_variants: 5,
            ..Default::default()
        };
        let results = mutate_domain("cloudflare", &config);
        assert!(results.len() <= 5);
    }

    #[test]
    fn test_mutate_no_self() {
        let config = MutatorConfig::default();
        let results = mutate_domain("xyz", &config);
        assert!(!results.contains(&"xyz".to_string()));
    }

    #[test]
    fn test_consonant_doubling() {
        let results = apply_consonant_double("fast");
        assert!(results.iter().any(|v| v.contains("ff")));
        assert!(results.iter().any(|v| v.contains("ss")));
    }

    #[test]
    fn test_common_suffix() {
        let results = apply_common_suffix("cloud");
        assert!(results.contains(&"clouds".to_string()));
        assert!(results.contains(&"cloudapp".to_string()));
    }
}
