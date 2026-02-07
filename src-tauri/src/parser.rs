use std::collections::HashMap;
use regex::Regex;
use html_escape::decode_html_entities;

pub fn camel_case(input: &str) -> String {
    let re = Regex::new(r"^[^a-zA-Z0-9]+").unwrap();
    let cleaned = re.replace(input, "");
    
    let parts: Vec<&str> = cleaned.split(|c: char| !c.is_alphanumeric()).filter(|s| !s.is_empty()).collect();
    
    let mut result = String::new();
    for (i, part) in parts.iter().enumerate() {
        if i == 0 {
            result.push_str(&part.to_lowercase());
        } else {
            let mut chars = part.chars();
            if let Some(first) = chars.next() {
                result.push(first.to_uppercase().next().unwrap());
                result.push_str(&chars.as_str().to_lowercase());
            }
        }
    }
    result
}

pub fn pre_string_strip(str: &str) -> String {
    let re = Regex::new(r":\t{1,2}").unwrap();
    re.replace_all(str, ": ").to_string()
}

pub fn filter_colon_char(raw_data: &str) -> String {
    // Procedural implementation to replace /:\s*\n(?=((?!:).)*$)/gm
    // This joined lines that had a colon at the end but the next line didn't seem to be a new key.
    // Actually, let's just do a simpler version: if a line ends with a colon, join it with the next if the next doesn't have a colon.
    let lines: Vec<&str> = raw_data.lines().collect();
    let mut result = String::new();
    for i in 0..lines.len() {
        let line = lines[i].trim_end();
        if line.ends_with(':') && i + 1 < lines.len() && !lines[i+1].contains(':') {
            result.push_str(line);
            result.push(' ');
        } else {
            result.push_str(line);
            result.push('\n');
        }
    }
    result
}

pub fn parse_raw_data(raw_data: &str) -> HashMap<String, String> {
    let mut result = HashMap::new();
    let delimiter = ":";

    let raw_data = decode_html_entities(raw_data).to_string();
    let raw_data = filter_colon_char(&raw_data);
    let raw_data = raw_data.replace("\r\n", "\n").replace('\r', "\n");
    
    for line in raw_data.lines() {
        let line = line.trim();
        if !line.is_empty() && line.contains(&(delimiter.to_owned() + " ")) {
            let parts: Vec<&str> = line.splitn(2, delimiter).collect();
            if parts.len() >= 2 {
                let key = camel_case(parts[0]);
                let value = parts[1].trim().to_string();
                
                result.entry(key)
                    .and_modify(|e: &mut String| { e.push(' '); e.push_str(&value); })
                    .or_insert(value);
            }
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── camelCase ────────────────────────────────────────────────────────

    #[test]
    fn test_camel_case() {
        assert_eq!(camel_case("Domain Name"), "domainName");
        assert_eq!(camel_case("REGISTRAR"), "registrar");
        assert_eq!(camel_case("Creation-Date"), "creationDate");
        assert_eq!(camel_case("  leading space"), "leadingSpace");
        assert_eq!(camel_case("!!special char"), "specialChar");
    }

    #[test]
    fn test_camel_case_single_word() {
        assert_eq!(camel_case("hello"), "hello");
        assert_eq!(camel_case("HELLO"), "hello");
    }

    #[test]
    fn test_camel_case_empty() {
        assert_eq!(camel_case(""), "");
    }

    #[test]
    fn test_camel_case_numbers() {
        assert_eq!(camel_case("ipv4 address"), "ipv4Address");
        assert_eq!(camel_case("12 Foo Bar"), "12FooBar");
    }

    #[test]
    fn test_camel_case_multiple_delimiters() {
        assert_eq!(camel_case("foo--bar__baz"), "fooBarBaz");
    }

    // ── pre_string_strip ─────────────────────────────────────────────────

    #[test]
    fn test_pre_string_strip() {
        assert_eq!(pre_string_strip("Domain:\t\tValue"), "Domain: Value");
        assert_eq!(pre_string_strip("Domain:\tValue"), "Domain: Value");
    }

    #[test]
    fn test_pre_string_strip_no_tabs() {
        assert_eq!(pre_string_strip("Domain: Value"), "Domain: Value");
    }

    #[test]
    fn test_pre_string_strip_multiple() {
        assert_eq!(
            pre_string_strip("A:\tB\nC:\t\tD"),
            "A: B\nC: D"
        );
    }

    // ── filter_colon_char ────────────────────────────────────────────────

    #[test]
    fn test_filter_colon_char() {
        let input = "Key:\nValue\nNext: Val";
        let expected = "Key: Value\nNext: Val\n";
        assert_eq!(filter_colon_char(input), expected);
    }

    #[test]
    fn test_filter_colon_char_no_joining() {
        let input = "Key1: Val1\nKey2: Val2";
        let result = filter_colon_char(input);
        assert!(result.contains("Key1: Val1"));
        assert!(result.contains("Key2: Val2"));
    }

    #[test]
    fn test_filter_colon_char_empty() {
        assert_eq!(filter_colon_char(""), "");
    }

    #[test]
    fn test_filter_colon_char_multiline_continuation() {
        let input = "Address:\nLine 1\nLine 2\nNext Key: Value";
        let result = filter_colon_char(input);
        // "Address:" should be joined with next line
        assert!(result.contains("Address: Line 1"));
    }

    // ── parse_raw_data ───────────────────────────────────────────────────

    #[test]
    fn test_parse_raw_data() {
        let raw = "Domain Name: example.com\nRegistrar: ABC &amp; Co\nEmpty: \nMulti: Line 1\nLine 2";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("domainName").unwrap(), "example.com");
        assert_eq!(result.get("registrar").unwrap(), "ABC & Co");
    }

    #[test]
    fn test_parse_raw_data_crlf() {
        let raw = "Domain Name: test.com\r\nRegistrar: ABC";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("domainName").unwrap(), "test.com");
        assert_eq!(result.get("registrar").unwrap(), "ABC");
    }

    #[test]
    fn test_parse_raw_data_cr_only() {
        let raw = "Domain Name: test.com\rRegistrar: ABC";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("domainName").unwrap(), "test.com");
    }

    #[test]
    fn test_parse_raw_data_html_entities() {
        let raw = "Registrar: A &amp; B &lt;LLC&gt;";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("registrar").unwrap(), "A & B <LLC>");
    }

    #[test]
    fn test_parse_raw_data_urls_with_colons() {
        let raw = "Referral URL: https://registrar.example.com";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("referralUrl").unwrap(), "https://registrar.example.com");
    }

    #[test]
    fn test_parse_raw_data_duplicate_keys_appended() {
        let raw = "Name Server: ns1.example.com\nName Server: ns2.example.com";
        let result = parse_raw_data(raw);
        let ns = result.get("nameServer").unwrap();
        assert!(ns.contains("ns1.example.com"));
        assert!(ns.contains("ns2.example.com"));
    }

    #[test]
    fn test_parse_raw_data_tab_delimited() {
        // pre_string_strip converts :\t to ": " but parse_raw_data doesn't call it.
        // So we test with already-stripped input (as the caller would do).
        let raw = pre_string_strip("Registrar:\tGoDaddy");
        let result = parse_raw_data(&raw);
        assert_eq!(result.get("registrar").unwrap(), "GoDaddy");
    }

    #[test]
    fn test_parse_raw_data_whitespace_lines() {
        let raw = "\n   \n  Domain Name: test.com  \n   \n";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("domainName").unwrap(), "test.com");
    }

    #[test]
    fn test_parse_raw_data_realistic_whois() {
        let raw = "\
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.registrar.com
Registrar URL: http://www.registrar.com
Updated Date: 2024-08-14T07:01:44Z
Creation Date: 1995-08-14T04:00:00Z
Registry Expiry Date: 2025-08-13T04:00:00Z
Registrar: RESERVED-Internet Assigned Numbers Authority
Name Server: A.IANA-SERVERS.NET
Name Server: B.IANA-SERVERS.NET";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("domainName").unwrap(), "EXAMPLE.COM");
        assert!(result.get("registrar").is_some());
        assert!(result.get("creationDate").is_some());
        assert!(result.get("registryExpiryDate").is_some());
        assert!(result.get("nameServer").is_some());
        let ns = result.get("nameServer").unwrap();
        assert!(ns.contains("A.IANA-SERVERS.NET"));
        assert!(ns.contains("B.IANA-SERVERS.NET"));
    }

    // ── Edge cases ───────────────────────────────────────────────────────

    #[test]
    fn test_parser_edge_cases() {
        // Empty input
        assert!(parse_raw_data("").is_empty());

        // No colons
        assert!(parse_raw_data("no colons here").is_empty());

        // Only colons
        assert!(parse_raw_data(":::").is_empty());

        // Malformed line (colon but no space after)
        assert!(parse_raw_data("Key:Value").is_empty());

        // Duplicate keys (should append)
        let dup = "Key: Val1\nKey: Val2";
        let res = parse_raw_data(dup);
        assert_eq!(res.get("key").unwrap(), "Val1 Val2");

        // Very large input
        let large = "Key: ".to_string() + &"a".repeat(10000);
        let res_large = parse_raw_data(&large);
        assert_eq!(res_large.get("key").unwrap().len(), 10000);
    }

    #[test]
    fn test_parse_raw_data_many_keys() {
        let mut lines = Vec::new();
        for i in 0..100 {
            lines.push(format!("Key{}: Value{}", i, i));
        }
        let raw = lines.join("\n");
        let result = parse_raw_data(&raw);
        assert_eq!(result.len(), 100);
    }

    #[test]
    fn test_parse_raw_data_unicode() {
        let raw = "Registrar: 日本レジストラ\nOrganization: 例え会社";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("registrar").unwrap(), "日本レジストラ");
    }
}
