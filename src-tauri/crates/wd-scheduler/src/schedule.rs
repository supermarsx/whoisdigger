use chrono::{DateTime, Datelike, Duration, Timelike, Utc, Weekday};
use serde::{Deserialize, Serialize};

/// The kind of schedule.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ScheduleKind {
    /// Run once and don't repeat.
    Once,
    /// Run every N minutes.
    IntervalMinutes(u32),
    /// Run every N hours.
    IntervalHours(u32),
    /// Run daily at a given hour (0–23).
    DailyAt(u32),
    /// Run weekly on a given weekday at a given hour.
    WeeklyAt { day: u8, hour: u32 },
    /// Run monthly on a given day-of-month at a given hour.
    MonthlyAt { day: u32, hour: u32 },
    /// Cron-like expression (simplified: "minute hour dom month dow").
    Cron(String),
}

/// Schedule configuration.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Schedule {
    pub kind: ScheduleKind,
    pub enabled: bool,
}

impl Schedule {
    pub fn once() -> Self {
        Self {
            kind: ScheduleKind::Once,
            enabled: true,
        }
    }
    pub fn every_minutes(n: u32) -> Self {
        Self {
            kind: ScheduleKind::IntervalMinutes(n),
            enabled: true,
        }
    }
    pub fn every_hours(n: u32) -> Self {
        Self {
            kind: ScheduleKind::IntervalHours(n),
            enabled: true,
        }
    }
    pub fn daily_at(hour: u32) -> Self {
        Self {
            kind: ScheduleKind::DailyAt(hour.min(23)),
            enabled: true,
        }
    }

    /// Calculate the next occurrence after `after`.
    pub fn next_occurrence(&self, after: DateTime<Utc>) -> Option<DateTime<Utc>> {
        if !self.enabled {
            return None;
        }

        match &self.kind {
            ScheduleKind::Once => None,
            ScheduleKind::IntervalMinutes(n) => Some(after + Duration::minutes(*n as i64)),
            ScheduleKind::IntervalHours(n) => Some(after + Duration::hours(*n as i64)),
            ScheduleKind::DailyAt(hour) => {
                let hour = *hour;
                let today = after
                    .date_naive()
                    .and_hms_opt(hour, 0, 0)
                    .and_then(|ndt| ndt.and_local_timezone(Utc).single());
                match today {
                    Some(t) if t > after => Some(t),
                    Some(t) => Some(t + Duration::days(1)),
                    None => Some(after + Duration::days(1)),
                }
            }
            ScheduleKind::WeeklyAt { day, hour } => {
                let target_weekday = match day {
                    0 => Weekday::Mon,
                    1 => Weekday::Tue,
                    2 => Weekday::Wed,
                    3 => Weekday::Thu,
                    4 => Weekday::Fri,
                    5 => Weekday::Sat,
                    _ => Weekday::Sun,
                };
                let mut candidate = after;
                for _ in 0..8 {
                    if candidate.weekday() == target_weekday && candidate.hour() < *hour {
                        let dt = candidate
                            .date_naive()
                            .and_hms_opt(*hour, 0, 0)
                            .and_then(|ndt| ndt.and_local_timezone(Utc).single());
                        if let Some(dt) = dt {
                            if dt > after {
                                return Some(dt);
                            }
                        }
                    }
                    candidate = candidate + Duration::days(1);
                    if candidate.weekday() == target_weekday {
                        let dt = candidate
                            .date_naive()
                            .and_hms_opt(*hour, 0, 0)
                            .and_then(|ndt| ndt.and_local_timezone(Utc).single());
                        if let Some(dt) = dt {
                            if dt > after {
                                return Some(dt);
                            }
                        }
                    }
                }
                Some(after + Duration::weeks(1))
            }
            ScheduleKind::MonthlyAt { day, hour } => {
                let target_day = (*day).max(1).min(28); // safe for all months
                let this_month = after
                    .date_naive()
                    .with_day(target_day)
                    .and_then(|d| d.and_hms_opt(*hour, 0, 0))
                    .and_then(|ndt| ndt.and_local_timezone(Utc).single());
                match this_month {
                    Some(t) if t > after => Some(t),
                    _ => {
                        // Next month
                        let next = if after.month() == 12 {
                            after
                                .with_year(after.year() + 1)
                                .and_then(|d| d.with_month(1))
                        } else {
                            after.with_month(after.month() + 1)
                        };
                        next.and_then(|d| {
                            d.date_naive()
                                .with_day(target_day)
                                .and_then(|nd| nd.and_hms_opt(*hour, 0, 0))
                                .and_then(|ndt| ndt.and_local_timezone(Utc).single())
                        })
                        .or(Some(after + Duration::days(30)))
                    }
                }
            }
            ScheduleKind::Cron(_expr) => {
                // Simplified: treat as daily interval for now
                Some(after + Duration::days(1))
            }
        }
    }

    /// Human-readable description.
    pub fn describe(&self) -> String {
        match &self.kind {
            ScheduleKind::Once => "One-time".into(),
            ScheduleKind::IntervalMinutes(n) => format!("Every {} minute(s)", n),
            ScheduleKind::IntervalHours(n) => format!("Every {} hour(s)", n),
            ScheduleKind::DailyAt(h) => format!("Daily at {}:00 UTC", h),
            ScheduleKind::WeeklyAt { day, hour } => {
                let d = match day {
                    0 => "Mon",
                    1 => "Tue",
                    2 => "Wed",
                    3 => "Thu",
                    4 => "Fri",
                    5 => "Sat",
                    _ => "Sun",
                };
                format!("Weekly on {} at {}:00 UTC", d, hour)
            }
            ScheduleKind::MonthlyAt { day, hour } => {
                format!("Monthly on day {} at {}:00 UTC", day, hour)
            }
            ScheduleKind::Cron(expr) => format!("Cron: {}", expr),
        }
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_once_no_repeat() {
        let s = Schedule::once();
        assert_eq!(s.next_occurrence(Utc::now()), None);
    }

    #[test]
    fn test_interval_minutes() {
        let s = Schedule::every_minutes(30);
        let now = Utc::now();
        let next = s.next_occurrence(now).unwrap();
        let diff = next - now;
        assert_eq!(diff.num_minutes(), 30);
    }

    #[test]
    fn test_interval_hours() {
        let s = Schedule::every_hours(2);
        let now = Utc::now();
        let next = s.next_occurrence(now).unwrap();
        let diff = next - now;
        assert_eq!(diff.num_hours(), 2);
    }

    #[test]
    fn test_daily_at_future_hour() {
        let s = Schedule::daily_at(23);
        let morning = chrono::NaiveDate::from_ymd_opt(2025, 6, 15)
            .unwrap()
            .and_hms_opt(10, 0, 0)
            .unwrap()
            .and_utc();
        let next = s.next_occurrence(morning).unwrap();
        assert_eq!(next.hour(), 23);
        assert_eq!(next.day(), 15); // same day
    }

    #[test]
    fn test_daily_at_past_hour() {
        let s = Schedule::daily_at(8);
        let evening = chrono::NaiveDate::from_ymd_opt(2025, 6, 15)
            .unwrap()
            .and_hms_opt(20, 0, 0)
            .unwrap()
            .and_utc();
        let next = s.next_occurrence(evening).unwrap();
        assert_eq!(next.hour(), 8);
        assert_eq!(next.day(), 16); // next day
    }

    #[test]
    fn test_describe() {
        assert_eq!(Schedule::once().describe(), "One-time");
        assert_eq!(Schedule::every_minutes(5).describe(), "Every 5 minute(s)");
        assert_eq!(Schedule::daily_at(14).describe(), "Daily at 14:00 UTC");
    }

    #[test]
    fn test_disabled_schedule() {
        let s = Schedule {
            kind: ScheduleKind::IntervalMinutes(60),
            enabled: false,
        };
        assert_eq!(s.next_occurrence(Utc::now()), None);
    }
}
