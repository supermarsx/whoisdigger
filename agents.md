# Whoisdigger Development Guide

A complete internal guide for contributors to the `supermarsx/whoisdigger` project. Built using Electron and TypeScript, it adheres to an agent-driven modular structure, following [AgentsMD](https://agentsmd.net/) principles. This guide covers project layout, agent patterns, IPC design, development workflow, and quality standards.

---

## 🔧 Tech Stack

* **Platform:** Electron 22+
* **Language:** TypeScript (strict mode)
* **Frontend:** HTML/CSS with vanilla JS or jQuery
* **Backend Libraries:** `node-whois`, `dns/promises`, `sqlite3`, `fs-extra`
* **Build Tools:** Vite (dev), Electron Builder (prod)
* **Testing:** Jest (unit), Playwright (integration recommended)
* **Linting/Formatting:** ESLint + Prettier

---

## 📁 Project Structure

```
whoisdigger/
├── assets/                 # Static files (icons, images, branding)
├── build/                  # Electron-builder output
├── cache/                  # SQLite-based WHOIS cache
├── logs/                   # Rotating logs and debug output
├── public/                 # Static web resources
├── src/
│   ├── analyser/           # CSV and result analysis logic
│   ├── bulkwhois/          # Bulk domain WHOIS and DNS query agent
│   ├── components/         # UI components and helpers
│   ├── context/            # Context provider for shared settings
│   ├── export/             # Export logic for TXT/CSV/ZIP
│   ├── pages/              # UI pages (Single, Bulk, Options, etc.)
│   ├── settings/           # Settings persistence and reactivity
│   ├── singlewhois/        # WHOIS agent for single queries
│   ├── static/             # Embedded JS/CSS assets for UI
│   └── utils/              # Shared helpers (logging, parsing, proxy)
├── tests/                  # Unit and integration tests
├── index.html              # Main HTML UI
├── main.ts                 # Electron main entrypoint
├── preload.ts              # Preload script for main-renderer IPC
├── renderer.ts             # Frontend logic
├── tsconfig.json
├── package.json
└── electron-builder.yml
```

---

## 🧠 Agent Architecture

Agents are logic-first modules responsible for:

* WHOIS lookups (bulk/single)
* Proxy use and selection
* Result parsing and analysis
* File exports (CSV, ZIP, JSON)
* Settings loading and persistence

Agents follow these rules:

* Stateless when possible
* Accept explicit config and dependency inputs
* Use callbacks or IPC for async updates
* Catch and surface all external errors cleanly

---

## 💬 IPC Patterns

Communication between Electron main and renderer follows a strict contract:

* Use `ipcMain.handle()` + `ipcRenderer.invoke()` for req-res flows
* Use `ipcRenderer.send()` + `ipcMain.on()` for status streaming

All IPC events must:

* Have a distinct `type`
* Return typed payloads
* Handle cancellation gracefully

Example:

```ts
ipcMain.handle('bw:lookup', async (e, data) => await runBulkLookup(data));
ipcRenderer.invoke('settings:get').then(set => applySettings(set));
```

---

## ✅ PR Requirements

To merge a PR, the following must be true:

* ✅ Code passes **TypeScript** type checks
* ✅ Code passes **ESLint** (`pnpm lint`)
* ✅ Code passes **Prettier** formatting (`pnpm format`)
* ✅ All unit tests pass (`pnpm test`)
* ✅ New logic includes test coverage
* ✅ No production `console.log`s or `debugger` statements
* ✅ PR follows conventional commits (`feat:`, `fix:`, `refactor:`)
* ✅ Public-facing changes must be reflected in the README when relevant

If any of these checks fail, the PR must be fixed before merging.

---

## 🎨 Code Style

* Enforced via ESLint and Prettier
* Use `interface` and `type` for structured values
* Avoid `any` unless explicitly justified
* Keep each file single-purpose
* Naming: kebab-case for files, camelCase for vars, PascalCase for types
* Add inline comments where behavior or usage is non-obvious
* Suggest documentation or contextual comments if a feature would benefit from clarity

---

## 🧪 Testing Strategy

* All critical logic must have **unit tests**
* WHOIS parsing, expiry detection, and export logic are priority targets
* Use Playwright to test UI interactions (bulk > export, etc.)

Example test:

```ts
test('parses WHOIS expiry date', () => {
  const raw = 'Expiry Date: 2026-12-31';
  expect(parseExpiryDate(raw)).toEqual(new Date('2026-12-31'));
});
```

---

## 🚀 Build & Release

```bash
pnpm build:main      # Compile backend
pnpm build:renderer  # Compile frontend
pnpm dist            # Create OS installers
```

Ensure the build includes:

* SQLite cache file
* Static icon resources
* Platform-specific build config in `electron-builder.yml`

---

## 📦 Deployment Checklist

* [ ] Clean build passes
* [ ] Settings persist and reload correctly
* [ ] WHOIS lookups succeed (single + bulk)
* [ ] Export feature generates valid CSV/ZIP
* [ ] UI tested with real and fake proxies

---

## 🔮 Roadmap & Ideas

* [ ] AI WHOIS interpreter (Codex)
* [ ] Agent health status in UI (green/red)
* [ ] Proxy configuration per WHOIS region
* [ ] CLI-compatible mode for automation
* [ ] Dark mode toggle and i18n

---

## 🤝 Contribution Workflow

* Create branches per feature/fix: `feat/bulk-status`, `fix/export-bug`
* Include meaningful PR titles and descriptions
* Update this guide if you add new agents
* Mark as `draft` if not ready

---

## 💡 Suggestion Guidelines

Suggestions for improvements, features, or fixes are welcome. Follow these rules:

* Use GitHub Issues with label `suggestion`
* Keep scope clear: what, why, and expected outcome
* Attach examples or mockups when relevant
* If implementation is easy, consider a PR instead
* Suggestion titles should be action-oriented: `Improve WHOIS output parsing`, `Add proxy pool tester`, etc.
* Features should aim to be **as complete as possible** in scope and design
* If a suggestion is trivial or self-contained, you're encouraged to go ahead and implement it instead
* When asked for general suggestions, think in terms of: `CI`, `code quality`, `features`, `UX`, `bugfixes`, and `tooling`
* When fixing a bug, prefer the **most definitive and long-term solution**—if complex, provide a prioritized list of possible fixes
* When implementing a new feature, aim to produce a **comprehensive and robust version** from the start
* Suggest inline comments where needed and improve documentation proactively
* Edit the project README for changes with significant user-visible impact (e.g. features, UI behavior, major CLI usage changes)

Suggestions that align with the roadmap or architectural direction are more likely to be accepted.

---

## 📘 Glossary

| Term  | Description                                  |
| ----- | -------------------------------------------- |
| Agent | Modular process that handles a specific task |
| IPC   | Communication between Electron main and UI   |
| WHOIS | Domain ownership and registration query      |
| Proxy | External IP mask used to avoid rate limits   |
| Cache | Local storage of prior query results         |

---

Let the code serve the mission. Ship clean, ship tested. 🚀
