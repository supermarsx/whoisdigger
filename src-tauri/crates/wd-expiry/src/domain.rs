use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

/// The lifecycle phase of a domain with respect to expiry.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExpiryPhase {
    /// Domain is active and well before expiry.
    Active,
    /// Domain expires within the warning window.
    ExpiringAoon,
    /// Domain has expired but is in Auto-Renew Grace Period.
    AutoRenewGrace,
    /// Domain is in Redemption Grace Period.
    RedemptionGrace,
    /// Domain is in Pending Delete phase.
    PendingDelete,
    /// Domain has been deleted and is available.
    Deleted,
    /// Cannot determine phase (missing data).
    Unknown,
}

/// Standard grace-period durations (ICANN defaults, registrar-specific overrides possible).
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GracePeriod {
    /// Auto-Renew Grace Period (typically 0-45 days).
    pub auto_renew_days: i64,
    /// Redemption Grace Period (typically 30 days).
    pub redemption_days: i64,
    /// Pending Delete period (typically 5 days).
    pub pending_delete_days: i64,
}

impl Default for GracePeriod {
    fn default() -> Self {
        Self {
            auto_renew_days: 30,
            redemption_days: 30,
            pending_delete_days: 5,
        }
    }
}

impl GracePeriod {
    /// Total days from expiry to actual deletion.
    pub fn total_days(&self) -> i64 {
        self.auto_renew_days + self.redemption_days + self.pending_delete_days
    }

    /// Create a custom grace period profile for a specific registrar.
    pub fn custom(auto_renew: i64, redemption: i64, pending_delete: i64) -> Self {
        Self {
            auto_renew_days: auto_renew,
            redemption_days: redemption,
            pending_delete_days: pending_delete,
        }
    }

    /// Known grace period profiles by registrar slug.
    pub fn for_registrar(slug: &str) -> Self {
        match slug {
            "godaddy" => Self::custom(25, 30, 5),
            "namecheap" => Self::custom(30, 30, 5),
            "cloudflare" => Self::custom(40, 30, 5),
            "porkbun" => Self::custom(30, 30, 5),
            "dynadot" => Self::custom(30, 30, 5),
            "gandi" => Self::custom(29, 30, 5),
            _ => Self::default(),
        }
    }
}

/// Complete expiry state for a single domain.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DomainExpiry {
    pub domain: String,
    pub expiry_date: Option<DateTime<Utc>>,
    pub registrar: Option<String>,
    pub grace: GracePeriod,
    /// The detected phase at computation time.
    pub phase: ExpiryPhase,
    /// Estimated drop date (expiry + total grace).
    pub estimated_drop: Option<DateTime<Utc>>,
    /// Days until expiry (negative if already expired).
    pub days_until_expiry: Option<i64>,
}

impl DomainExpiry {
    /// Compute the full expiry state for a domain.
    pub fn compute(
        domain: impl Into<String>,
        expiry_date: Option<DateTime<Utc>>,
        registrar: Option<&str>,
        now: DateTime<Utc>,
    ) -> Self {
        let domain = domain.into();
        let grace = registrar
            .map(|r| GracePeriod::for_registrar(r))
            .unwrap_or_default();

        let (phase, days_until, estimated_drop) = match expiry_date {
            Some(exp) => {
                let days = (exp - now).num_days();
                let drop = exp + Duration::days(grace.total_days());
                let phase = compute_phase(exp, &grace, now);
                (phase, Some(days), Some(drop))
            }
            None => (ExpiryPhase::Unknown, None, None),
        };

        Self {
            domain,
            expiry_date,
            registrar: registrar.map(|s| s.to_string()),
            grace,
            phase,
            estimated_drop: estimated_drop,
            days_until_expiry: days_until,
        }
    }

    /// True if the domain is in a phase where it can still be renewed by the owner.
    pub fn is_renewable(&self) -> bool {
        matches!(self.phase, ExpiryPhase::Active | ExpiryPhase::ExpiringAoon | ExpiryPhase::AutoRenewGrace)
    }

    /// True if the domain can potentially be caught (redemption or pending delete).
    pub fn is_catchable(&self) -> bool {
        matches!(self.phase, ExpiryPhase::RedemptionGrace | ExpiryPhase::PendingDelete)
    }

    /// True if the domain has been fully deleted.
    pub fn is_deleted(&self) -> bool {
        self.phase == ExpiryPhase::Deleted
    }
}

fn compute_phase(expiry: DateTime<Utc>, grace: &GracePeriod, now: DateTime<Utc>) -> ExpiryPhase {
    let days_since_expiry = (now - expiry).num_days();

    if days_since_expiry < -30 {
        ExpiryPhase::Active
    } else if days_since_expiry < 0 {
        ExpiryPhase::ExpiringAoon
    } else if days_since_expiry < grace.auto_renew_days {
        ExpiryPhase::AutoRenewGrace
    } else if days_since_expiry < grace.auto_renew_days + grace.redemption_days {
        ExpiryPhase::RedemptionGrace
    } else if days_since_expiry < grace.total_days() {
        ExpiryPhase::PendingDelete
    } else {
        ExpiryPhase::Deleted
    }
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
    fn test_active_domain() {
        let exp = utc(2027, 6, 1);
        let now = utc(2026, 1, 1);
        let de = DomainExpiry::compute("test.com", Some(exp), None, now);
        assert_eq!(de.phase, ExpiryPhase::Active);
        assert!(de.is_renewable());
        assert!(!de.is_catchable());
    }

    #[test]
    fn test_expiring_soon() {
        let exp = utc(2026, 1, 20);
        let now = utc(2026, 1, 1);
        let de = DomainExpiry::compute("test.com", Some(exp), None, now);
        assert_eq!(de.phase, ExpiryPhase::ExpiringAoon);
        assert_eq!(de.days_until_expiry, Some(19));
    }

    #[test]
    fn test_auto_renew_grace() {
        let exp = utc(2026, 1, 1);
        let now = utc(2026, 1, 15);
        let de = DomainExpiry::compute("test.com", Some(exp), None, now);
        assert_eq!(de.phase, ExpiryPhase::AutoRenewGrace);
        assert!(de.is_renewable());
    }

    #[test]
    fn test_redemption_grace() {
        let exp = utc(2026, 1, 1);
        let now = utc(2026, 2, 5); // 35 days after expiry
        let de = DomainExpiry::compute("test.com", Some(exp), None, now);
        assert_eq!(de.phase, ExpiryPhase::RedemptionGrace);
        assert!(de.is_catchable());
    }

    #[test]
    fn test_pending_delete() {
        let exp = utc(2026, 1, 1);
        let now = utc(2026, 3, 3); // ~61 days after expiry
        let de = DomainExpiry::compute("test.com", Some(exp), None, now);
        assert_eq!(de.phase, ExpiryPhase::PendingDelete);
        assert!(de.is_catchable());
    }

    #[test]
    fn test_deleted() {
        let exp = utc(2026, 1, 1);
        let now = utc(2026, 4, 1); // ~90 days after expiry
        let de = DomainExpiry::compute("test.com", Some(exp), None, now);
        assert_eq!(de.phase, ExpiryPhase::Deleted);
        assert!(de.is_deleted());
    }

    #[test]
    fn test_unknown_no_expiry() {
        let de = DomainExpiry::compute("test.com", None, None, Utc::now());
        assert_eq!(de.phase, ExpiryPhase::Unknown);
    }

    #[test]
    fn test_estimated_drop_date() {
        let exp = utc(2026, 6, 1);
        let de = DomainExpiry::compute("test.com", Some(exp), Some("godaddy"), utc(2026, 1, 1));
        // GoDaddy: 25 + 30 + 5 = 60 days after expiry
        let expected = utc(2026, 7, 31);
        assert_eq!(de.estimated_drop.unwrap(), expected);
    }

    #[test]
    fn test_grace_period_total() {
        assert_eq!(GracePeriod::default().total_days(), 65);
        assert_eq!(GracePeriod::for_registrar("cloudflare").total_days(), 75);
    }

    #[test]
    fn test_registrar_grace_profiles() {
        let gd = GracePeriod::for_registrar("godaddy");
        assert_eq!(gd.auto_renew_days, 25);
        let unknown = GracePeriod::for_registrar("unknown_registrar");
        assert_eq!(unknown.auto_renew_days, 30); // default
    }
}
