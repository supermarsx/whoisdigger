use std::collections::HashSet;

use rand::seq::SliceRandom;

use crate::tauri_app::support::ProcessOptions;

#[tauri::command]
pub async fn to_process(content: String, options: ProcessOptions) -> Result<String, String> {
    let mut lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();

    if let Some(ref prefix) = options.prefix {
        lines = lines
            .into_iter()
            .map(|l| format!("{}{}", prefix, l))
            .collect();
    }
    if let Some(ref suffix) = options.suffix {
        lines = lines
            .into_iter()
            .map(|l| format!("{}{}", l, suffix))
            .collect();
    }
    if options.trim_spaces.unwrap_or(false) {
        lines = lines.into_iter().map(|l| l.trim().to_string()).collect();
    }
    if options.delete_blank_lines.unwrap_or(false) {
        lines.retain(|l| !l.trim().is_empty());
    }
    if options.dedupe.unwrap_or(false) {
        let mut seen = HashSet::new();
        lines.retain(|l| seen.insert(l.clone()));
    }

    match options.sort.as_deref() {
        Some("asc") => lines.sort(),
        Some("desc") => lines.sort_by(|a, b| b.cmp(a)),
        Some("random") => {
            let mut rng = rand::thread_rng();
            lines.shuffle(&mut rng);
        }
        _ => {}
    }

    Ok(lines.join("\n"))
}

#[tauri::command]
pub async fn csv_parse(content: String) -> Result<serde_json::Value, String> {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .from_reader(content.as_bytes());

    let headers: Vec<String> = reader
        .headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(|h| h.to_string())
        .collect();

    let mut records = Vec::new();
    for result in reader.records() {
        let record = result.map_err(|e| e.to_string())?;
        let mut map = serde_json::Map::new();
        for (i, field) in record.iter().enumerate() {
            let key = headers
                .get(i)
                .cloned()
                .unwrap_or_else(|| format!("col{}", i));
            map.insert(key, serde_json::Value::String(field.to_string()));
        }
        records.push(serde_json::Value::Object(map));
    }

    Ok(serde_json::Value::Array(records))
}

#[tauri::command]
pub async fn csv_parse_file(path: String) -> Result<serde_json::Value, String> {
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path, e))?;
    csv_parse(content).await
}

#[tauri::command]
pub fn count_lines(text: String) -> usize {
    if text.is_empty() {
        0
    } else {
        text.as_bytes().iter().filter(|&&b| b == b'\n').count() + 1
    }
}
