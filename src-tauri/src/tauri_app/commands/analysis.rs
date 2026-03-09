use std::collections::HashMap;

use rayon::prelude::*;

use crate::tauri_app::support::{extract_tld, get_initials, html_escape};

#[tauri::command]
pub async fn bwa_analyser_start(data: serde_json::Value) -> Result<serde_json::Value, String> {
    let results = data.as_object().ok_or("Invalid data")?;

    let domains = results
        .get("domain")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let statuses = results
        .get("status")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let registrars = results
        .get("registrar")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .map(|v| v.as_str().unwrap_or("").to_string())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let expiry_dates = results
        .get("expirydate")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .map(|v| v.as_str().unwrap_or("").to_string())
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let total = domains.len();
    let available = statuses
        .iter()
        .filter(|s| s.as_str() == "available")
        .count();
    let unavailable = statuses
        .iter()
        .filter(|s| s.as_str() == "unavailable")
        .count();
    let expired = statuses.iter().filter(|s| s.as_str() == "expired").count();
    let errors = statuses.iter().filter(|s| s.starts_with("error")).count();

    let mut status_breakdown: HashMap<String, usize> = HashMap::new();
    for s in &statuses {
        *status_breakdown.entry(s.clone()).or_insert(0) += 1;
    }
    let status_breakdown_json: serde_json::Map<String, serde_json::Value> = status_breakdown
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    let mut tld_distribution: HashMap<String, usize> = HashMap::new();
    for domain in &domains {
        let tld = extract_tld(domain);
        *tld_distribution.entry(tld).or_insert(0) += 1;
    }
    let tld_json: serde_json::Map<String, serde_json::Value> = tld_distribution
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    let mut tld_available: HashMap<String, usize> = HashMap::new();
    let mut tld_unavailable: HashMap<String, usize> = HashMap::new();
    for (i, domain) in domains.iter().enumerate() {
        let tld = extract_tld(domain);
        let status = statuses.get(i).map(|s| s.as_str()).unwrap_or("");
        if status == "available" {
            *tld_available.entry(tld).or_insert(0) += 1;
        } else if status == "unavailable" {
            *tld_unavailable.entry(tld).or_insert(0) += 1;
        }
    }
    let tld_available_json: serde_json::Map<String, serde_json::Value> = tld_available
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();
    let tld_unavailable_json: serde_json::Map<String, serde_json::Value> = tld_unavailable
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    let mut registrar_dist: HashMap<String, usize> = HashMap::new();
    for reg in &registrars {
        if !reg.is_empty() {
            *registrar_dist.entry(reg.clone()).or_insert(0) += 1;
        }
    }
    let mut registrar_vec: Vec<(String, usize)> = registrar_dist.into_iter().collect();
    registrar_vec.sort_by(|a, b| b.1.cmp(&a.1));
    registrar_vec.truncate(20);
    let registrar_json: serde_json::Map<String, serde_json::Value> = registrar_vec
        .into_iter()
        .map(|(k, v)| (k, serde_json::Value::Number(serde_json::Number::from(v))))
        .collect();

    let mut table_data = Vec::new();
    for i in 0..total {
        let mut row = serde_json::Map::new();
        row.insert(
            "domain".into(),
            serde_json::Value::String(domains.get(i).cloned().unwrap_or_default()),
        );
        row.insert(
            "status".into(),
            serde_json::Value::String(statuses.get(i).cloned().unwrap_or_default()),
        );
        row.insert(
            "registrar".into(),
            serde_json::Value::String(registrars.get(i).cloned().unwrap_or_default()),
        );
        row.insert(
            "expiryDate".into(),
            serde_json::Value::String(expiry_dates.get(i).cloned().unwrap_or_default()),
        );
        row.insert(
            "tld".into(),
            serde_json::Value::String(extract_tld(
                domains.get(i).map(|d| d.as_str()).unwrap_or(""),
            )),
        );
        table_data.push(serde_json::Value::Object(row));
    }

    Ok(serde_json::json!({
        "total": total,
        "available": available,
        "unavailable": unavailable,
        "expired": expired,
        "errors": errors,
        "availablePercent": if total > 0 { (available as f64 / total as f64) * 100.0 } else { 0.0 },
        "unavailablePercent": if total > 0 { (unavailable as f64 / total as f64) * 100.0 } else { 0.0 },
        "errorPercent": if total > 0 { (errors as f64 / total as f64) * 100.0 } else { 0.0 },
        "statusBreakdown": serde_json::Value::Object(status_breakdown_json),
        "tldDistribution": serde_json::Value::Object(tld_json),
        "tldAvailable": serde_json::Value::Object(tld_available_json),
        "tldUnavailable": serde_json::Value::Object(tld_unavailable_json),
        "topRegistrars": serde_json::Value::Object(registrar_json),
        "data": table_data,
        "domains": domains,
        "statuses": statuses,
    }))
}

#[tauri::command]
pub async fn bwa_render_table_html(
    records: Vec<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    if records.is_empty() {
        return Ok(serde_json::json!({ "thead": "", "tbody": "" }));
    }

    let columns: Vec<String> = records[0]
        .as_object()
        .map(|m| m.keys().cloned().collect())
        .unwrap_or_default();

    let thead = {
        let mut html = String::from("<tr>");
        for col in &columns {
            let initials = get_initials(col, 1);
            html.push_str(&format!(
                "<th><abbr title=\"{}\">{}</abbr></th>",
                html_escape(col),
                html_escape(&initials)
            ));
        }
        html.push_str("</tr>");
        html
    };

    let cols = columns.clone();
    let tbody = tokio::task::spawn_blocking(move || {
        let rows: Vec<String> = records
            .par_iter()
            .map(|record| {
                let mut row = String::from("<tr>");
                for col in &cols {
                    let val = record.get(col).and_then(|v| v.as_str()).unwrap_or("");
                    row.push_str("<td>");
                    row.push_str(&html_escape(val));
                    row.push_str("</td>");
                }
                row.push_str("</tr>");
                row
            })
            .collect();
        rows.join("")
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "thead": thead, "tbody": tbody }))
}
