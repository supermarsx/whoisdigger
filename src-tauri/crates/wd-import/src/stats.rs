use serde::{Deserialize, Serialize};

/// Statistics about an import operation.
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ImportStats {
    /// Total lines in the source.
    pub total_lines: usize,
    /// Total domains extracted before dedup.
    pub total_parsed: usize,
    /// Valid unique domains after all processing.
    pub valid: usize,
    /// Duplicates removed.
    pub duplicates_removed: usize,
    /// Invalid domains removed during validation.
    pub invalid_removed: usize,
}

impl ImportStats {
    /// Combine stats (e.g. from parsing + validation).
    pub fn merge(&self, validation_removed: usize) -> Self {
        Self {
            total_lines: self.total_lines,
            total_parsed: self.total_parsed,
            valid: self.valid - validation_removed,
            duplicates_removed: self.duplicates_removed,
            invalid_removed: validation_removed,
        }
    }

    /// Summary string.
    pub fn summary(&self) -> String {
        format!(
            "Parsed {} domains from {} lines. {} valid, {} duplicates removed, {} invalid removed.",
            self.total_parsed, self.total_lines, self.valid, self.duplicates_removed, self.invalid_removed
        )
    }

    /// Success rate.
    pub fn success_rate(&self) -> f64 {
        if self.total_parsed == 0 { return 0.0; }
        self.valid as f64 / self.total_parsed as f64
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stats_summary() {
        let stats = ImportStats {
            total_lines: 100,
            total_parsed: 95,
            valid: 80,
            duplicates_removed: 10,
            invalid_removed: 5,
        };
        let s = stats.summary();
        assert!(s.contains("80 valid"));
        assert!(s.contains("10 duplicates"));
    }

    #[test]
    fn test_merge_stats() {
        let stats = ImportStats {
            total_lines: 100,
            total_parsed: 90,
            valid: 85,
            duplicates_removed: 5,
            invalid_removed: 0,
        };
        let merged = stats.merge(3);
        assert_eq!(merged.valid, 82);
        assert_eq!(merged.invalid_removed, 3);
    }

    #[test]
    fn test_success_rate() {
        let stats = ImportStats { total_parsed: 100, valid: 75, ..Default::default() };
        assert!((stats.success_rate() - 0.75).abs() < 0.001);
    }

    #[test]
    fn test_empty_stats() {
        let stats = ImportStats::default();
        assert_eq!(stats.success_rate(), 0.0);
    }
}
