use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::DomainExpiry;

/// Strategy for drop catching.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum DropStrategy {
    /// Poll at regular intervals.
    Polling { interval_secs: u64 },
    /// Aggressive polling that increases as drop date approaches.
    Escalating {
        /// Normal interval in seconds.
        normal_interval_secs: u64,
        /// Interval when within 24h of estimated drop.
        hot_interval_secs: u64,
    },
    /// Wait passively — just estimate and alert.
    PassiveAlert,
}

impl Default for DropStrategy {
    fn default() -> Self {
        Self::Escalating {
            normal_interval_secs: 3600,
            hot_interval_secs: 60,
        }
    }
}

/// Estimated drop window for a domain.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DropEstimate {
    pub domain: String,
    /// Earliest possible drop (expiry + grace total).
    pub earliest_drop: DateTime<Utc>,
    /// Latest reasonable drop (earliest + 2 days buffer for registrar delays).
    pub latest_drop: DateTime<Utc>,
    /// Whether we're currently in the hot zone (within 24h of earliest drop).
    pub is_hot: bool,
    /// Hours until earliest drop (negative if past).
    pub hours_until_drop: i64,
    /// Recommended strategy.
    pub strategy: DropStrategy,
}

impl DropEstimate {
    /// Compute a drop estimate from expiry data.
    pub fn from_expiry(expiry: &DomainExpiry, strategy: DropStrategy) -> Option<Self> {
        Self::from_expiry_at(expiry, strategy, Utc::now())
    }

    /// Compute a drop estimate from expiry data at a specific reference time.
    pub fn from_expiry_at(
        expiry: &DomainExpiry,
        strategy: DropStrategy,
        now: DateTime<Utc>,
    ) -> Option<Self> {
        let estimated_drop = expiry.estimated_drop?;
        let earliest = estimated_drop;
        let latest = estimated_drop + Duration::days(2);
        let hours = (earliest - now).num_hours();
        let is_hot = hours <= 24 && hours > -48;

        Some(Self {
            domain: expiry.domain.clone(),
            earliest_drop: earliest,
            latest_drop: latest,
            is_hot,
            hours_until_drop: hours,
            strategy,
        })
    }

    /// Compute the recommended polling interval in seconds based on proximity to drop.
    pub fn current_interval_secs(&self) -> u64 {
        match &self.strategy {
            DropStrategy::Polling { interval_secs } => *interval_secs,
            DropStrategy::Escalating {
                normal_interval_secs,
                hot_interval_secs,
            } => {
                if self.is_hot {
                    *hot_interval_secs
                } else {
                    *normal_interval_secs
                }
            }
            DropStrategy::PassiveAlert => 86400, // once a day
        }
    }

    /// True if the domain should have dropped by now.
    pub fn is_overdue(&self) -> bool {
        self.hours_until_drop < -48
    }
}

/// Batch-compute drop estimates for a list of expiry records.
pub fn batch_drop_estimates(
    expiries: &[DomainExpiry],
    strategy: DropStrategy,
) -> Vec<DropEstimate> {
    expiries
        .iter()
        .filter_map(|e| DropEstimate::from_expiry(e, strategy.clone()))
        .collect()
}

/// Sort drop estimates by urgency (soonest drop first).
pub fn sorted_by_urgency(estimates: &mut [DropEstimate]) {
    estimates.sort_by_key(|e| e.earliest_drop);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn utc(y: i32, m: u32, d: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, 0, 0, 0).unwrap()
    }

    #[test]
    fn test_drop_estimate_basic() {
        let exp = DomainExpiry::compute("test.com", Some(utc(2026, 1, 1)), None, utc(2026, 1, 15));
        let est = DropEstimate::from_expiry(&exp, DropStrategy::default()).unwrap();
        assert_eq!(est.domain, "test.com");
        // Default grace: 65 days from expiry → March 7, 2026
        assert_eq!(est.earliest_drop, utc(2026, 3, 7));
        assert_eq!(est.latest_drop, utc(2026, 3, 9));
    }

    #[test]
    fn test_drop_estimate_hot_zone() {
        let exp = DomainExpiry::compute("hot.com", Some(utc(2026, 1, 1)), None, utc(2026, 3, 6));
        let est =
            DropEstimate::from_expiry_at(&exp, DropStrategy::default(), utc(2026, 3, 6)).unwrap();
        assert!(est.is_hot);
    }

    #[test]
    fn test_escalating_interval() {
        let strat = DropStrategy::Escalating {
            normal_interval_secs: 3600,
            hot_interval_secs: 30,
        };
        let mut est = DropEstimate {
            domain: "t.com".into(),
            earliest_drop: Utc::now() + Duration::hours(12),
            latest_drop: Utc::now() + Duration::hours(60),
            is_hot: true,
            hours_until_drop: 12,
            strategy: strat,
        };
        assert_eq!(est.current_interval_secs(), 30);
        est.is_hot = false;
        est.strategy = DropStrategy::Escalating {
            normal_interval_secs: 3600,
            hot_interval_secs: 30,
        };
        assert_eq!(est.current_interval_secs(), 3600);
    }

    #[test]
    fn test_batch_drop_estimates() {
        let e1 = DomainExpiry::compute("a.com", Some(utc(2026, 1, 1)), None, utc(2026, 1, 1));
        let e2 = DomainExpiry::compute("b.com", Some(utc(2026, 2, 1)), None, utc(2026, 1, 1));
        let e3 = DomainExpiry::compute("c.com", None, None, utc(2026, 1, 1)); // no expiry
        let estimates = batch_drop_estimates(&[e1, e2, e3], DropStrategy::default());
        assert_eq!(estimates.len(), 2); // c.com has no expiry → filtered
    }

    #[test]
    fn test_sorted_by_urgency() {
        let e1 = DomainExpiry::compute("later.com", Some(utc(2026, 6, 1)), None, utc(2026, 1, 1));
        let e2 = DomainExpiry::compute("sooner.com", Some(utc(2026, 3, 1)), None, utc(2026, 1, 1));
        let mut estimates = batch_drop_estimates(&[e1, e2], DropStrategy::default());
        sorted_by_urgency(&mut estimates);
        assert_eq!(estimates[0].domain, "sooner.com");
    }

    #[test]
    fn test_no_estimate_without_expiry() {
        let exp = DomainExpiry::compute("no.com", None, None, Utc::now());
        assert!(DropEstimate::from_expiry(&exp, DropStrategy::default()).is_none());
    }
}
