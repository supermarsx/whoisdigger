# Project Status: Whoisdigger Tauri Migration

## Completed
- [x] **Project Initialization**: Created `src-tauri` directory and standard Tauri structure.
- [x] **Configuration**: 
    - Created `src-tauri/Cargo.toml` with `whois-rust`, `rusqlite`, `serde`, etc.
    - Created `src-tauri/tauri.conf.json` mimicking Electron window settings.
    - Created `src-tauri/build.rs`.
- [x] **Basic Backend**: 
    - Implemented `src-tauri/src/main.rs`.
    - Added `whois_lookup` command using `whois-rust`.
    - Added basic FS commands: `fs_read_file`, `fs_exists`.
    - Added `app_get_base_dir`.
- [x] **Frontend Bridge**:
    - Created `app/html/tauri-shim.js` to map `window.electron` calls to `window.__TAURI__.core.invoke`.
    - Injected `tauri-shim.js` into `app/html/templates/mainPanel.hbs`.
- [x] **Build**: Successfully compiled the application (`npx tauri build`).

## Pending / Next Steps

### IPC & Core Features
- [ ] **Filesystem Completeness**: Implement `fs_stat`, `fs_readdir`, `fs_unlink`, `fs_access` in Rust.
- [ ] **I18n**: Port `i18n:load` to Rust (reading locale JSONs).
- [ ] **Stats/Monitoring**: Implement `stats:start`, `stats:refresh`, `stats:stop`, `stats:get` (currently mocked in shim).
- [ ] **Path Utils**: Ensure `path:join` and `path:basename` work reliably (currently rudimentary JS shim).

### Database & Persistence (Critical)
- [ ] **SQLite Migration**: 
    - Port `better-sqlite3` logic to `rusqlite`.
    - Implement `history` table management (insert/read).
    - Implement `cache` (request cache) table management.
- [ ] **Settings**: 
    - Port `settings-main.ts` logic to Rust.
    - Implement loading/saving of `settings.json` and custom profiles.

### Bulk Processing (Performance)
- [ ] **Bulk Whois**: Port the heavy lifting of bulk domain processing from Node.js to Rust threads.
- [ ] **Export**: Implement CSV/Text export in Rust.

### Cleanup
- [ ] **Remove Electron**: Once functional, remove `electron`, `electron-builder`, and related npm scripts.
- [ ] **Refactor Frontend**: specific `electron` checks in frontend code might need cleanup.
