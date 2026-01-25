![whoisdigger](https://github.com/user-attachments/assets/4879093d-73a6-4bc8-b1d3-87b0f1bbc007)

[![CI Status](https://github.com/whois-team/whoisdigger/actions/workflows/node.js.yml/badge.svg)](https://github.com/whois-team/whoisdigger/actions/workflows/node.js.yml)
[![Coverage](https://img.shields.io/github/actions/coverage/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/actions/workflows/node.js.yml)
[![Latest Release](https://img.shields.io/github/v/release/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/releases)
[![Downloads](https://img.shields.io/github/downloads/whois-team/whoisdigger/total)](https://github.com/whois-team/whoisdigger/releases)
[![Stars](https://img.shields.io/github/stars/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/stargazers)
[![Forks](https://img.shields.io/github/forks/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/network/members)
[![Watchers](https://img.shields.io/github/watchers/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/watchers)
[![Issues](https://img.shields.io/github/issues/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/issues)
[![Commit activity](https://img.shields.io/github/commit-activity/m/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/pulse)
[![Total commits](https://img.shields.io/github/commit-activity/total/whois-team/whoisdigger)](https://github.com/whois-team/whoisdigger/commits/master)
[![Made with Electron](https://img.shields.io/badge/Made%20with-Electron-2b2e3b?logo=electron&logoColor=white)](https://electronjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](license.md)

Whoisdigger is a cross-platform bulk WHOIS lookup desktop app built on **Tauri v2** with a **Rust** backend. Now written in TypeScript and Rust.

Whoisdigger is a bulk whois lookup, cross-platform, desktop application. Made with builders and creators in mind, rapidly lookup up your favorite domain mashups without risking third-party logging, domain squatting and a few other common issues that come with using third-party platforms. The faster, reliable and most private way of looking for domains.

## Index

- [Features](#features)
- [Quick start](#quick-start)
- [Development setup](#development-setup)
- [Building](#building)
- [Docker](#docker)
- [Built with](#built-with)
- [License](#license)

## Features

- Fast WHOIS lookup using native Rust `whois-rust`
- Better search privacy
- Raw text WHOIS replies
- Bulk WHOIS lookup with multi-threaded performance
- Bulk DNS sweep lookup
- Optional request caching with SQLite backend (`rusqlite`)
- Proxy support for outgoing requests
- Wordlist capabilities with drag n' drop
- IDNA 2003/2008 (UTS46), Punycode, non-ASCII character filter support
- Public Suffix List (PSL) and wildcard filtering
- Basic bulk WHOIS result analyser (csv import)
- Persistent settings through JSON file with live updates
- Redesigned settings interface with auto-save
- Dark mode toggle
- Follow system theme option

### Planned features

- Domain monitor (Rust implementation)
- Misc tools
- Settings
- Help page
- Experimental AI domain availability checks

### Features QA

Q: Can i search for emojis?

A: Yes, whoisdigger has IDNA and Punycode support

Q: Can i do a million word list lookup?

A: Yes, but be aware that big wordlists come with a humongous time penalty using purely whois (that to avoid unintentional DDOSing or blocking), use DNS sweep with care for large lookups if you only need availability.

Q: How long will it take doing a million word list DNS sweep?

A: Close to 14 hours on a 50ms delay, i wouldn't ever recommend doing such a thing. Be responsible.

Q: How does DNS sweep work?

A: DNS sweep as it says, sweeps through NS records of every domain on the wordlist, availability is based off of NS record presence for that domain.

Q: How much faster is DNS sweep?

A: It will largely depend on the set time between requests but on average is between 10x to 100x faster.

## Quick start

Stay on the bleeding edge of whoisdigger commits using `git clone` or for slightly tested version download the latest built release.

### Latest built binary

Check out and download the latest release for your architecture/OS.

![Latest tag](https://img.shields.io/github/tag/whois-team/whoisdigger.svg?label=Latest%20tag&style=flat)
[![Check out releases](https://img.shields.io/badge/Checkout%20releases-%20-orange.svg)](https://github.com/whois-team/whoisdigger/releases)

### Latest changes

Basic whoisdigger requirements are Node.js v20 or later, Rust, `npm` and `git`.

Clone whoisdigger code and install dependencies

```
git clone https://github.com/supermarx/whoisdigger
cd whoisdigger
npm install
```

After clone, run using

```
npm start
```

which will launch the application in development mode using Tauri.

## Building

Whoisdigger uses a build step before packaging. 

```bash
npm run build:app
```

This will compile the TypeScript frontend and build the Rust backend into a production bundle.

### Adding translations

Translation files live under `app/locales/` and are simple JSON maps of keys to translated strings.
Add a new `<lang>.json` file (e.g. `fr.json`) with your translations. When `ui.language` is
omitted, the application falls back to `navigator.language` (first segment before `-`) to select the
locale file. To force a specific language, set `ui.language` inside `appsettings.ts`. Templates
reference strings using the `{{t}}` helper.

## Built with

<a href="https://tauri.app/"><img height=40px src="https://tauri.app/img/tauri-logo.svg"></a>

<a href="https://www.rust-lang.org/"><img height=40px src="https://www.rust-lang.org/static/images/rust-logo-blk.svg"></a>

<a href="https://jquery.org/"><img height=40px src="https://upload.wikimedia.org/wikipedia/en/9/9e/JQuery_logo.svg"></a>

<a href="https://bulma.io/"><img height=40px src="https://bulma.io/images/made-with-bulma.png"></a>

## Development setup

Run `nvm use` to switch to the Node version defined in `.nvmrc`.
Run `npm install` or `npm ci` before testing or linting to ensure all dependencies are installed.
After installing, execute `npm test` to run the project's unit tests.
Run `npm run test:e2e` to execute end-to-end tests that ensure the application starts cleanly.
Running tests also generates a coverage report in the `coverage/` directory.
Development packages such as `@types/node` and `@types/jest` are required for TypeScript compilation and running tests. The `prebuild` script will auto-install dependencies if `node_modules` is missing.
Use `npm run dev` to watch source files and automatically reload the application during development. Static assets such as stylesheets are synced to `dist` while this command runs, so CSS changes are picked up without rebuilding.

Run `npm run format` before committing to apply Prettier formatting. CI will verify formatting with `npm run format:check`.

### Resolving paths

Modules within Whoisdigger may execute in both CommonJS and ESM contexts. Use
`dirnameCompat()` from `app/ts/utils/dirnameCompat.ts` to obtain a directory
name that works in either environment. Pass `import.meta.url` when calling from
an ES module:

```ts
import { dirnameCompat } from './utils/dirnameCompat';
const __dirname = dirnameCompat(import.meta.url);
```

The helper checks for a globally defined `__dirname`, falls back to the provided
`import.meta.url` (or the current module's `__dirname` in CommonJS), then tries
`__filename`, `process.mainModule?.filename` or `process.argv[1]` before
falling back to `process.cwd()`.

## Settings

Whoisdigger uses a settings file that rules how the application behaves overall, this can be achieved by either using the preload settings file or change the `appsettings.ts` inside `js`.

Context isolation is always enabled for security purposes and cannot be disabled in configuration. Node integration is enabled by default, allowing renderer scripts to access Node.js directly. You can disable it through the configuration if required.

### Theme

The settings screen provides a **Follow system theme** toggle. When enabled the application automatically switches between dark and light modes according to your operating system preference. This behaviour is controlled by the `theme.followSystem` setting which can be set to `true` or `false` in the configuration file.

### User interface

Enable **Confirm before exiting** to receive a prompt before Whoisdigger closes. Toggle this option in the interface or set `ui.confirmExit` in the configuration file.

### Assumptions

You can use assumptions (`lookup.assumptions` settings section) to make more reliable searches in cases where you're getting inconsistencies across different tests.

`uniregistry`, Assume a domain is unavailable when uniregistry query limit is reached, default: true.

​ Note: Uniregistry whois has a very low threshold on whois requests, a few requests with relative small timings in between will result in a sure temporary block, by assuming a rate limiting reply from uniregistry as a taken domain, you ensure that you're not getting a false/undetermined reply error.

`ratelimit`, Assume a domain is unavailable when getting rate limit reply, default: false

`unparsable`, Assume a domain as available if reply is unparsable, it may help correcting malformed, unusual or unhandled whois replies, default: false

`dnsFailureUnavailable`, Assume a domain is unavailable in a DNS sweep if request fails, this avoids having false positives on availability, default: true

### AI

Whoisdigger can optionally use a local ONNX model or OpenAI to predict domain availability.
Configure these features in the `ai` section of `appsettings.ts`:

- `ai.enabled` - toggle AI features
- `ai.modelPath` and `ai.dataPath` - local model and data locations
- `ai.modelURL` - remote URL to download the model
- `ai.openai.url` and `ai.openai.apiKey` - OpenAI endpoint and API key

Train a local model from a labelled dataset via the CLI:

```
node dist/app/cli.js --train-model path/to/dataset.json
```

The dataset format is documented in [docs/ai.md](docs/ai.md).

## Building

Whoisdigger uses a small build step before packaging. Each packaging command
compiles the application into the `dist` folder and then invokes
`@electron/packager`.
Running `npm run build` automatically executes the `prebuild` script. `scripts/prebuild.js` installs dependencies using `npm install` if `node_modules` is missing.
If you need a fresh build, run `npm run clean` first to remove the `dist`, `release_builds` and `app/compiled-templates` directories.
`scripts/postbuild.js` then bundles CSS using PostCSS by calling `npm run build:css`,
which minifies files from `app/css` into `dist/app/css`.
It also precompiles Handlebars templates and writes `dist/app/html/mainPanel.html`
from `app/html/templates/mainPanel.hbs`.
The prebuild step automatically regenerates vendor scripts under `app/vendor`. Run
`npm run regen:vendor` if you need to refresh them without a full build.

MacOS

```
npm run package-mac
```

Windows

```
npm run package-win
```

Linux

```
npm run package-linux
```

For convenience a single command builds packages for all platforms:

```
npm run package-all
```

### Adding translations

Translation files live under `app/locales/` and are simple JSON maps of keys to translated strings.
Add a new `<lang>.json` file (e.g. `fr.json`) with your translations. When `ui.language` is
omitted, the application falls back to `navigator.language` (first segment before `-`) to select the
locale file. To force a specific language, set `ui.language` inside `appsettings.ts`. Templates
reference strings using the `{{t}}` helper.

## Docker

Build the Docker image:

```bash
docker build -t whoisdigger -f docker/Dockerfile .
```

Run the application (requires X11 forwarding to display Electron).
Ensure an X server is active on the host and allow local connections:

```bash
xhost +local:
docker run --rm -it \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  whoisdigger
```

Alternatively, start with docker-compose:

```bash
docker compose -f docker/docker-compose.yml up
```

Execute the test suite inside a container:

```bash
docker run --rm -it whoisdigger npm test
```

## Built with

<a href="https://electronjs.org/"><img height=40px src="https://electronjs.org/images/electron-logo.svg"></a>

<a href="https://jquery.org/"><img height=40px src="https://upload.wikimedia.org/wikipedia/en/9/9e/JQuery_logo.svg"></a>

<a href="https://bulma.io/"><img height=40px src="https://bulma.io/images/made-with-bulma.png"></a>

## License

Distributed under the MIT License. See [license.md](license.md) for more information.

Additionally when using WhoisTeam or other GitHub Logos, please refer to [GitHub logo guidelines](https://github.com/logos).
