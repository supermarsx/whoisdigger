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

    #[test]
    fn test_camel_case() {
        assert_eq!(camel_case("Domain Name"), "domainName");
        assert_eq!(camel_case("REGISTRAR"), "registrar");
        assert_eq!(camel_case("Creation-Date"), "creationDate");
        assert_eq!(camel_case("  leading space"), "leadingSpace");
        assert_eq!(camel_case("!!special char"), "specialChar");
    }

    #[test]
    fn test_pre_string_strip() {
        assert_eq!(pre_string_strip("Domain:\t\tValue"), "Domain: Value");
        assert_eq!(pre_string_strip("Domain:\tValue"), "Domain: Value");
    }

    #[test]
    fn test_filter_colon_char() {
        let input = "Key:\nValue\nNext: Val";
        let expected = "Key: Value\nNext: Val\n";
        assert_eq!(filter_colon_char(input), expected);
    }

    #[test]
    fn test_parse_raw_data() {
        let raw = "Domain Name: example.com\nRegistrar: ABC &amp; Co\nEmpty: \nMulti: Line 1\nLine 2";
        let result = parse_raw_data(raw);
        assert_eq!(result.get("domainName").unwrap(), "example.com");
        assert_eq!(result.get("registrar").unwrap(), "ABC & Co");
    }
}
