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
    let re = Regex::new(r"(?m):\s*\n(?=((?![^:]*:).)*$)").unwrap();
    re.replace_all(raw_data, ": ").to_string()
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
