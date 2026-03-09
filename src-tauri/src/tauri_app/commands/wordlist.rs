use crate::wordlist as wd_wordlist_mod;

#[tauri::command]
pub async fn wordlist_transform(
    content: String,
    operation: String,
    arg1: Option<String>,
    arg2: Option<String>,
) -> Result<String, String> {
    let lines: Vec<String> = content.lines().map(|s| s.to_string()).collect();

    let result = match operation.as_str() {
        "addPrefix" => wd_wordlist_mod::add_prefix(&lines, arg1.as_deref().unwrap_or("")),
        "addSuffix" => wd_wordlist_mod::add_suffix(&lines, arg1.as_deref().unwrap_or("")),
        "sort" => wd_wordlist_mod::sort_lines(&lines),
        "sortReverse" => wd_wordlist_mod::sort_lines_reverse(&lines),
        "shuffle" => wd_wordlist_mod::shuffle_lines(&lines),
        "trimSpaces" => wd_wordlist_mod::trim_spaces(&lines),
        "deleteSpaces" => wd_wordlist_mod::delete_spaces(&lines),
        "deleteBlankLines" => wd_wordlist_mod::delete_blank_lines(&lines),
        "trimNonAlnum" => wd_wordlist_mod::trim_non_alnum(&lines),
        "deleteNonAlnum" => wd_wordlist_mod::delete_non_alnum(&lines),
        "dedupe" => wd_wordlist_mod::dedupe_lines(&lines),
        "deleteLinesContaining" => {
            wd_wordlist_mod::delete_lines_containing(&lines, arg1.as_deref().unwrap_or(""))
        }
        "deleteString" => wd_wordlist_mod::delete_string(&lines, arg1.as_deref().unwrap_or("")),
        "toLowerCase" => wd_wordlist_mod::to_lower_case_lines(&lines),
        "toUpperCase" => wd_wordlist_mod::to_upper_case_lines(&lines),
        "rot13" => wd_wordlist_mod::rot13_lines(&lines),
        "leetSpeak" => wd_wordlist_mod::to_leet_speak_lines(&lines),
        "replaceString" => wd_wordlist_mod::replace_string(
            &lines,
            arg1.as_deref().unwrap_or(""),
            arg2.as_deref().unwrap_or(""),
        ),
        "deleteRegex" => wd_wordlist_mod::delete_regex(&lines, arg1.as_deref().unwrap_or(""))?,
        "trimRegex" => wd_wordlist_mod::trim_regex(&lines, arg1.as_deref().unwrap_or(""))?,
        "replaceRegex" => wd_wordlist_mod::replace_regex(
            &lines,
            arg1.as_deref().unwrap_or(""),
            arg2.as_deref().unwrap_or(""),
        )?,
        _ => return Err(format!("Unknown operation: {}", operation)),
    };

    Ok(result.join("\n"))
}
