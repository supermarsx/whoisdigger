use rand::seq::SliceRandom;
use rand::thread_rng;
use regex::Regex;
use serde::Deserialize;
use std::collections::HashSet;
use std::sync::LazyLock;

/// Compiled regex: match one or more whitespace characters.
static RE_WHITESPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// Compiled regex: leading/trailing non-word characters.
static RE_NON_ALNUM_TRIM: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?:^\W+|\W+$)").unwrap());

/// Compiled regex: any non-word character sequence.
static RE_NON_ALNUM_ALL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\W+").unwrap());

// ─── ProcessOptions ──────────────────────────────────────────────────────────

/// High-level processing options matching the frontend `ProcessOptions` type.
#[derive(Deserialize, Default, Clone, Debug)]
pub struct ProcessOptions {
    pub prefix: Option<String>,
    pub suffix: Option<String>,
    pub affix: Option<AffixOptions>,
    #[serde(rename = "trimSpaces")]
    pub trim_spaces: Option<bool>,
    #[serde(rename = "deleteBlankLines")]
    pub delete_blank_lines: Option<bool>,
    pub dedupe: Option<bool>,
    pub sort: Option<String>,
}

#[derive(Deserialize, Default, Clone, Debug)]
pub struct AffixOptions {
    pub prefix: String,
    pub suffix: String,
}

/// Apply wordlist tool operations sequentially, mirroring the TypeScript
/// `processLines()` function.
pub fn process_lines(lines: &[String], options: &ProcessOptions) -> Vec<String> {
    let mut result: Vec<String> = lines.to_vec();

    if let Some(ref prefix) = options.prefix {
        result = add_prefix(&result, prefix);
    }
    if let Some(ref suffix) = options.suffix {
        result = add_suffix(&result, suffix);
    }
    if let Some(ref affix) = options.affix {
        result = add_affix(&result, &affix.prefix, &affix.suffix);
    }
    if options.trim_spaces.unwrap_or(false) {
        result = trim_spaces(&result);
    }
    if options.delete_blank_lines.unwrap_or(false) {
        result = delete_blank_lines(&result);
    }
    if options.dedupe.unwrap_or(false) {
        result = dedupe_lines(&result);
    }

    match options.sort.as_deref() {
        Some("asc") => result = sort_lines(&result),
        Some("desc") => result = sort_lines_reverse(&result),
        Some("random") => result = shuffle_lines(&result),
        _ => {}
    }

    result
}

// ─── Prefix / Suffix / Affix ─────────────────────────────────────────────────

pub fn add_prefix(lines: &[String], prefix: &str) -> Vec<String> {
    lines.iter().map(|l| format!("{}{}", prefix, l)).collect()
}

pub fn add_suffix(lines: &[String], suffix: &str) -> Vec<String> {
    lines.iter().map(|l| format!("{}{}", l, suffix)).collect()
}

pub fn add_affix(lines: &[String], prefix: &str, suffix: &str) -> Vec<String> {
    add_suffix(&add_prefix(lines, prefix), suffix)
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

pub fn sort_lines(lines: &[String]) -> Vec<String> {
    let mut sorted = lines.to_vec();
    sorted.sort();
    sorted
}

pub fn sort_lines_reverse(lines: &[String]) -> Vec<String> {
    let mut sorted = sort_lines(lines);
    sorted.reverse();
    sorted
}

pub fn shuffle_lines(lines: &[String]) -> Vec<String> {
    let mut shuffled = lines.to_vec();
    shuffled.shuffle(&mut thread_rng());
    shuffled
}

// ─── Cleaning ────────────────────────────────────────────────────────────────

pub fn trim_spaces(lines: &[String]) -> Vec<String> {
    lines.iter().map(|l| l.trim().to_string()).collect()
}

pub fn delete_spaces(lines: &[String]) -> Vec<String> {
    lines
        .iter()
        .map(|l| RE_WHITESPACE.replace_all(l, "").to_string())
        .collect()
}

pub fn delete_blank_lines(lines: &[String]) -> Vec<String> {
    lines
        .iter()
        .filter(|l| !l.trim().is_empty())
        .cloned()
        .collect()
}

pub fn trim_non_alnum(lines: &[String]) -> Vec<String> {
    lines
        .iter()
        .map(|l| RE_NON_ALNUM_TRIM.replace_all(l, "").to_string())
        .collect()
}

pub fn delete_non_alnum(lines: &[String]) -> Vec<String> {
    lines
        .iter()
        .map(|l| RE_NON_ALNUM_ALL.replace_all(l, "").to_string())
        .collect()
}

// ─── Deduplication ───────────────────────────────────────────────────────────

pub fn dedupe_lines(lines: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    lines
        .iter()
        .filter(|l| seen.insert((*l).clone()))
        .cloned()
        .collect()
}

// ─── Regex Operations ────────────────────────────────────────────────────────

/// Remove lines matching a regex pattern.
pub fn delete_regex(lines: &[String], pattern: &str) -> Result<Vec<String>, String> {
    let re = Regex::new(pattern).map_err(|e| e.to_string())?;
    Ok(lines.iter().filter(|l| !re.is_match(l)).cloned().collect())
}

/// Replace regex matches within each line.
pub fn trim_regex(lines: &[String], pattern: &str) -> Result<Vec<String>, String> {
    let re = Regex::new(pattern).map_err(|e| e.to_string())?;
    Ok(lines
        .iter()
        .map(|l| re.replace_all(l, "").to_string())
        .collect())
}

/// Delete lines containing a specific substring.
pub fn delete_lines_containing(lines: &[String], substr: &str) -> Vec<String> {
    lines
        .iter()
        .filter(|l| !l.contains(substr))
        .cloned()
        .collect()
}

/// Remove all occurrences of a string from each line.
pub fn delete_string(lines: &[String], target: &str) -> Vec<String> {
    lines.iter().map(|l| l.replace(target, "")).collect()
}

/// Replace all occurrences of a string in each line.
pub fn replace_string(lines: &[String], search: &str, replacement: &str) -> Vec<String> {
    lines
        .iter()
        .map(|l| l.replace(search, replacement))
        .collect()
}

/// Replace regex matches in each line.
pub fn replace_regex(
    lines: &[String],
    pattern: &str,
    replacement: &str,
) -> Result<Vec<String>, String> {
    let re = Regex::new(pattern).map_err(|e| e.to_string())?;
    Ok(lines
        .iter()
        .map(|l| re.replace_all(l, replacement).to_string())
        .collect())
}

// ─── Case Conversion ─────────────────────────────────────────────────────────

pub fn to_lower_case_lines(lines: &[String]) -> Vec<String> {
    lines.iter().map(|l| l.to_lowercase()).collect()
}

pub fn to_upper_case_lines(lines: &[String]) -> Vec<String> {
    lines.iter().map(|l| l.to_uppercase()).collect()
}

// ─── ROT13 ───────────────────────────────────────────────────────────────────

pub fn rot13_lines(lines: &[String]) -> Vec<String> {
    lines.iter().map(|l| rot13(l)).collect()
}

fn rot13(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'a'..='m' | 'A'..='M' => (c as u8 + 13) as char,
            'n'..='z' | 'N'..='Z' => (c as u8 - 13) as char,
            _ => c,
        })
        .collect()
}

// ─── Leetspeak ───────────────────────────────────────────────────────────────

pub fn to_leet_speak_lines(lines: &[String]) -> Vec<String> {
    lines.iter().map(|l| to_leet_speak(l)).collect()
}

fn to_leet_speak(s: &str) -> String {
    s.chars()
        .map(|c| match c.to_ascii_lowercase() {
            'a' => '4',
            'e' => '3',
            'i' => '1',
            'o' => '0',
            's' => '5',
            't' => '7',
            _ => c,
        })
        .collect()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn lines(strs: &[&str]) -> Vec<String> {
        strs.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn test_add_prefix() {
        assert_eq!(add_prefix(&lines(&["a", "b"]), "x"), lines(&["xa", "xb"]));
    }

    #[test]
    fn test_add_suffix() {
        assert_eq!(add_suffix(&lines(&["a", "b"]), "z"), lines(&["az", "bz"]));
    }

    #[test]
    fn test_add_affix() {
        assert_eq!(
            add_affix(&lines(&["a", "b"]), "x", "z"),
            lines(&["xaz", "xbz"])
        );
    }

    #[test]
    fn test_sort_lines() {
        assert_eq!(
            sort_lines(&lines(&["b", "a", "c"])),
            lines(&["a", "b", "c"])
        );
    }

    #[test]
    fn test_sort_lines_reverse() {
        assert_eq!(
            sort_lines_reverse(&lines(&["b", "a", "c"])),
            lines(&["c", "b", "a"])
        );
    }

    #[test]
    fn test_shuffle_lines_preserves_count() {
        let input = lines(&["a", "b", "c", "d"]);
        let shuffled = shuffle_lines(&input);
        assert_eq!(shuffled.len(), input.len());
        for item in &input {
            assert!(shuffled.contains(item));
        }
    }

    #[test]
    fn test_trim_spaces() {
        assert_eq!(trim_spaces(&lines(&["  a  ", " b"])), lines(&["a", "b"]));
    }

    #[test]
    fn test_delete_spaces() {
        assert_eq!(
            delete_spaces(&lines(&["a b c", " d "])),
            lines(&["abc", "d"])
        );
    }

    #[test]
    fn test_delete_blank_lines() {
        assert_eq!(
            delete_blank_lines(&lines(&["a", "", "  ", "b"])),
            lines(&["a", "b"])
        );
    }

    #[test]
    fn test_trim_non_alnum() {
        assert_eq!(
            trim_non_alnum(&lines(&["--hello--", "..world.."])),
            lines(&["hello", "world"])
        );
    }

    #[test]
    fn test_delete_non_alnum() {
        assert_eq!(
            delete_non_alnum(&lines(&["h-e-l-l-o", "w.o.r.l.d"])),
            lines(&["hello", "world"])
        );
    }

    #[test]
    fn test_dedupe_lines() {
        assert_eq!(
            dedupe_lines(&lines(&["a", "b", "a", "c", "b"])),
            lines(&["a", "b", "c"])
        );
    }

    #[test]
    fn test_delete_regex() {
        assert_eq!(
            delete_regex(&lines(&["abc", "def", "abx"]), "^ab").unwrap(),
            lines(&["def"])
        );
    }

    #[test]
    fn test_trim_regex() {
        assert_eq!(
            trim_regex(&lines(&["abc123", "def456"]), r"\d+").unwrap(),
            lines(&["abc", "def"])
        );
    }

    #[test]
    fn test_delete_lines_containing() {
        assert_eq!(
            delete_lines_containing(&lines(&["hello world", "foo bar", "hello again"]), "hello"),
            lines(&["foo bar"])
        );
    }

    #[test]
    fn test_delete_string() {
        assert_eq!(
            delete_string(&lines(&["hello world", "world cup"]), "world"),
            lines(&["hello ", " cup"])
        );
    }

    #[test]
    fn test_replace_string() {
        assert_eq!(
            replace_string(&lines(&["hello world"]), "world", "rust"),
            lines(&["hello rust"])
        );
    }

    #[test]
    fn test_replace_regex() {
        assert_eq!(
            replace_regex(&lines(&["abc123"]), r"\d+", "NUM").unwrap(),
            lines(&["abcNUM"])
        );
    }

    #[test]
    fn test_to_lower_case_lines() {
        assert_eq!(
            to_lower_case_lines(&lines(&["HELLO", "World"])),
            lines(&["hello", "world"])
        );
    }

    #[test]
    fn test_to_upper_case_lines() {
        assert_eq!(
            to_upper_case_lines(&lines(&["hello", "World"])),
            lines(&["HELLO", "WORLD"])
        );
    }

    #[test]
    fn test_rot13_lines() {
        assert_eq!(rot13_lines(&lines(&["hello"])), lines(&["uryyb"]));
        assert_eq!(
            rot13_lines(&rot13_lines(&lines(&["test"]))),
            lines(&["test"])
        );
    }

    #[test]
    fn test_to_leet_speak_lines() {
        assert_eq!(to_leet_speak_lines(&lines(&["aeiost"])), lines(&["431057"]));
    }

    #[test]
    fn test_process_lines_combined() {
        let input = lines(&["  hello  ", "  ", "  hello  ", "  world  "]);
        let opts = ProcessOptions {
            prefix: Some(">>".into()),
            suffix: Some("<<".into()),
            trim_spaces: Some(true),
            delete_blank_lines: Some(true),
            dedupe: Some(true),
            sort: Some("asc".into()),
            ..Default::default()
        };
        let result = process_lines(&input, &opts);
        // After prefix+suffix: ">>  hello  <<", ">>  <<", ">>  hello  <<", ">>  world  <<"
        // After trim: ">>  hello  <<", ">>  <<", ">>  hello  <<", ">>  world  <<"
        // trim_spaces trims: ">>  hello  <<" -> ">>  hello  <<" (already has content)
        // Actually trim operates on each line: ">>  hello  <<".trim() -> ">>  hello  <<"
        // delete_blank_lines: all non-blank
        // dedupe: removes duplicate ">>  hello  <<"
        // sort asc: sorts remaining
        assert_eq!(result.len(), 3); // >>  <<, >>  hello  <<, >>  world  <<
    }

    #[test]
    fn test_process_lines_affix() {
        let input = lines(&["domain"]);
        let opts = ProcessOptions {
            affix: Some(AffixOptions {
                prefix: "www.".into(),
                suffix: ".com".into(),
            }),
            ..Default::default()
        };
        assert_eq!(process_lines(&input, &opts), lines(&["www.domain.com"]));
    }

    #[test]
    fn test_delete_regex_invalid() {
        assert!(delete_regex(&lines(&["a"]), "[invalid").is_err());
    }
}
