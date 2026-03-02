use serde::{Deserialize, Serialize};
use std::io::Write;
use wd_availability::WhoisParams;
use zip::write::SimpleFileOptions;

#[derive(Serialize, Deserialize, Clone)]
pub struct BulkResult {
    pub domain: String,
    pub data: Option<String>,
    pub error: Option<String>,
    pub status: String,
    pub params: Option<WhoisParams>,
}

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct ExportOpts {
    pub filetype: String,
    #[serde(rename = "whoisreply", default)]
    pub whois_reply: String,
    #[serde(default)]
    pub domains: String,
    #[serde(default)]
    pub errors: String,
    #[serde(default)]
    pub information: String,
}

/// Build a CSV string from bulk lookup results.
pub fn build_csv(results: &[BulkResult]) -> String {
    let mut csv = String::from(
        "\"Domain\",\"Status\",\"Registrar\",\"Company\",\"Creation Date\",\"Expiry Date\"\n",
    );
    for r in results {
        let reg = r
            .params
            .as_ref()
            .and_then(|p| p.registrar.as_deref())
            .unwrap_or("");
        let co = r
            .params
            .as_ref()
            .and_then(|p| p.company.as_deref())
            .unwrap_or("");
        let cr = r
            .params
            .as_ref()
            .and_then(|p| p.creation_date.as_deref())
            .unwrap_or("");
        let ex = r
            .params
            .as_ref()
            .and_then(|p| p.expiry_date.as_deref())
            .unwrap_or("");
        csv.push_str(&format!(
            "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
            r.domain, r.status, reg, co, cr, ex
        ));
    }
    csv
}

/// Export bulk results to a file at the given path.
///
/// When the export includes WHOIS reply text (filetype "txt" or whois_reply
/// contains "yes"), the output is a ZIP archive containing individual `.txt`
/// files per domain plus an optional `results.csv`. Otherwise a plain CSV file
/// is written.
pub fn export_results(
    results: &[BulkResult],
    options: &ExportOpts,
    path: &str,
) -> Result<(), String> {
    let include_whois = options.filetype == "txt" || options.whois_reply.contains("yes");

    if include_whois {
        let file = std::fs::File::create(path).map_err(|e| e.to_string())?;
        let mut zip = zip::ZipWriter::new(file);
        let zip_opts =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

        if options.filetype == "csv" {
            zip.start_file("results.csv", zip_opts)
                .map_err(|e| e.to_string())?;
            zip.write_all(build_csv(results).as_bytes())
                .map_err(|e| e.to_string())?;
        }

        for r in results {
            if let Some(data) = &r.data {
                zip.start_file(format!("{}.txt", r.domain), zip_opts)
                    .map_err(|e| e.to_string())?;
                zip.write_all(data.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
        }
        zip.finish().map_err(|e| e.to_string())?;
    } else {
        std::fs::write(path, build_csv(results)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── CSV builder ──────────────────────────────────────────────────────

    #[test]
    fn test_build_csv_empty() {
        let csv = build_csv(&[]);
        assert!(csv.starts_with("\"Domain\""));
        assert_eq!(csv.lines().count(), 1);
    }

    #[test]
    fn test_build_csv_single_result() {
        let results = vec![BulkResult {
            domain: "example.com".into(),
            data: Some("raw whois".into()),
            error: None,
            status: "unavailable".into(),
            params: Some(WhoisParams {
                domain: Some("example.com".into()),
                status: None,
                registrar: Some("GoDaddy".into()),
                company: Some("ACME Corp".into()),
                creation_date: Some("2020-01-01".into()),
                update_date: None,
                expiry_date: Some("2030-01-01".into()),
                whoisreply: None,
                whois_json: None,
            }),
        }];
        let csv = build_csv(&results);
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 2);
        assert!(lines[0].contains("Domain"));
        assert!(lines[1].contains("example.com"));
        assert!(lines[1].contains("GoDaddy"));
        assert!(lines[1].contains("ACME Corp"));
        assert!(lines[1].contains("2020-01-01"));
        assert!(lines[1].contains("2030-01-01"));
    }

    #[test]
    fn test_build_csv_multiple_results() {
        let results = vec![
            BulkResult {
                domain: "a.com".into(),
                data: None,
                error: Some("timeout".into()),
                status: "error".into(),
                params: None,
            },
            BulkResult {
                domain: "b.com".into(),
                data: Some("data".into()),
                error: None,
                status: "available".into(),
                params: None,
            },
        ];
        let csv = build_csv(&results);
        assert_eq!(csv.lines().count(), 3);
        assert!(csv.contains("a.com"));
        assert!(csv.contains("b.com"));
    }

    #[test]
    fn test_build_csv_no_params() {
        let results = vec![BulkResult {
            domain: "x.com".into(),
            data: None,
            error: None,
            status: "available".into(),
            params: None,
        }];
        let csv = build_csv(&results);
        assert!(csv.contains("x.com"));
        assert!(csv.contains("available"));
    }

    #[test]
    fn test_build_csv_special_characters_in_domain() {
        let results = vec![BulkResult {
            domain: "éxàmple.com".into(),
            data: None,
            error: None,
            status: "unavailable".into(),
            params: None,
        }];
        let csv = build_csv(&results);
        assert!(csv.contains("éxàmple.com"));
    }

    // ── Export results ───────────────────────────────────────────────────

    #[test]
    fn test_export_results_csv() {
        let dir = std::env::temp_dir().join("wd_test_export_csv_crate");
        let _ = std::fs::create_dir_all(&dir);
        let out_path = dir.join("output.csv");

        let results = vec![BulkResult {
            domain: "test.com".into(),
            data: None,
            error: None,
            status: "available".into(),
            params: None,
        }];

        let opts = ExportOpts {
            filetype: "csv".into(),
            whois_reply: "no".into(),
            domains: "".into(),
            errors: "".into(),
            information: "".into(),
        };

        let result = export_results(&results, &opts, &out_path.to_string_lossy());
        assert!(result.is_ok());
        assert!(out_path.exists());

        let content = std::fs::read_to_string(&out_path).unwrap();
        assert!(content.contains("test.com"));
        assert!(content.contains("Domain"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn test_export_results_zip_with_whois_reply() {
        let dir = std::env::temp_dir().join("wd_test_export_zip_crate");
        let _ = std::fs::create_dir_all(&dir);
        let out_path = dir.join("output.zip");

        let results = vec![BulkResult {
            domain: "example.com".into(),
            data: Some("WHOIS reply data for example.com".into()),
            error: None,
            status: "unavailable".into(),
            params: None,
        }];

        let opts = ExportOpts {
            filetype: "txt".into(),
            whois_reply: "yes".into(),
            domains: "".into(),
            errors: "".into(),
            information: "".into(),
        };

        let result = export_results(&results, &opts, &out_path.to_string_lossy());
        assert!(result.is_ok());
        assert!(out_path.exists());

        let file = std::fs::File::open(&out_path).unwrap();
        let archive = zip::ZipArchive::new(file).unwrap();
        assert!(archive.len() > 0);

        let _ = std::fs::remove_dir_all(&dir);
    }

    // ── BulkResult serialization ─────────────────────────────────────────

    #[test]
    fn test_bulk_result_serialization() {
        let result = BulkResult {
            domain: "test.com".into(),
            data: Some("whois data".into()),
            error: None,
            status: "available".into(),
            params: None,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"domain\":\"test.com\""));
        assert!(json.contains("\"status\":\"available\""));
    }
}
