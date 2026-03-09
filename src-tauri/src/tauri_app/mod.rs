pub mod commands;
pub mod state;
pub mod support;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .manage(state::AppData::new())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::lookup::whois_lookup,
            commands::lookup::whois_lookup_with_settings,
            commands::lookup::dns_lookup_cmd,
            commands::lookup::rdap_lookup_cmd,
            commands::lookup::availability_check,
            commands::lookup::availability_check_with_settings,
            commands::lookup::availability_params,
            commands::lookup::whois_parse,
            commands::fs::fs_read_file,
            commands::fs::fs_exists,
            commands::fs::fs_stat,
            commands::fs::fs_readdir,
            commands::fs::fs_unlink,
            commands::fs::fs_access,
            commands::fs::fs_write_file,
            commands::fs::fs_mkdir,
            commands::fs::file_info,
            commands::fs::bulk_estimate_time,
            commands::fs::convert_file_size,
            commands::fs::convert_duration,
            commands::shell::shell_open_path,
            commands::app::i18n_load,
            commands::app::app_get_base_dir,
            commands::app::app_get_user_data_path,
            commands::history::db_gui_history_get,
            commands::history::db_gui_history_get_filtered,
            commands::history::db_gui_history_clear,
            commands::history::history_merge,
            commands::cache::db_gui_cache_get,
            commands::cache::db_gui_cache_set,
            commands::cache::db_gui_cache_clear,
            commands::cache::cache_merge,
            commands::bulk::bulk_whois_lookup,
            commands::bulk::bulk_whois_lookup_from_file,
            commands::bulk::bulk_whois_lookup_from_content,
            commands::bulk::bulk_whois_pause,
            commands::bulk::bulk_whois_continue,
            commands::bulk::bulk_whois_stop,
            commands::bulk::bulk_whois_export,
            commands::settings::settings_load,
            commands::settings::settings_save,
            commands::settings::config_delete,
            commands::settings::config_export,
            commands::settings::config_import,
            commands::settings::proxy_set_settings,
            commands::settings::proxy_get_settings,
            commands::settings::lookup_set_settings,
            commands::settings::lookup_get_settings,
            commands::profiles::profiles_list,
            commands::profiles::profiles_create,
            commands::profiles::profiles_rename,
            commands::profiles::profiles_delete,
            commands::profiles::profiles_set_current,
            commands::profiles::profiles_get_current,
            commands::profiles::profiles_export,
            commands::profiles::profiles_import,
            commands::stats::stats_get,
            commands::stats::stats_start,
            commands::stats::stats_refresh,
            commands::stats::stats_stop,
            commands::monitor::monitor_start,
            commands::monitor::monitor_stop,
            commands::monitor::monitor_lookup,
            commands::text::to_process,
            commands::text::csv_parse,
            commands::text::csv_parse_file,
            commands::analysis::bwa_analyser_start,
            commands::analysis::bwa_render_table_html,
            commands::text::count_lines,
            commands::path::path_join,
            commands::path::path_basename,
            commands::ai::ai_suggest,
            commands::ai::ai_suggest_with_settings,
            commands::ai::ai_download_model,
            commands::ai::ai_predict,
            commands::wordlist::wordlist_transform
        ])
        .setup(|app| {
            if let Ok(data_dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(data_dir.join("profiles").join("default"));
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
