<p align="center"><img width=60% src="https://github.com/whois-team/brand/blob/master/png/whoisdigger_black.png"></p>

<hr>

![Whoisdigger app](https://github.com/whois-team/website/raw/master/images/projects/whoisdigger.gif)

Whoisdigger is a cross-platform bulk WHOIS lookup desktop app built on Electron.

Whoisdigger is a bulk whois lookup, cross-platform, desktop application built on Electron. Made with builders and creators in mind, rapidly lookup up your favorite domain mashups without risking third-party logging, domain squatting and a few other common issues that come with using third-party platforms. The faster, reliable and most private way of looking for domains.

### Important notice

If you clone this repo please patch `node_modules\whois\index.js` and remove the first line containing `#!/usr/bin/env node`.

## Index

- [Features](#features)
- [Important notice](#important-notice)
- [Quick start](#quick-start)
- [Setup](#setup)
- [Development setup](#development-setup)
- [Building](#building)
- [Docker](#docker)
- [Built with](#built-with)
- [License](#license)

## Features

- Fast whois lookup
- Better privacy
- Raw text whois replies
- Bulk whois lookup
- Bulk DNS sweep lookup
- Optional request caching with configurable SQLite backend
- Proxy support for outgoing requests
- Wordlist capabilities with drag n' drop
- IDNA 2003/2008 (UTS46), Punycode, non-ASCII character filter support
- Public Suffix List (PSL) and wildcard filtering
- Basic bulk whois result analyser (csv import)
- Experimental AI domain availability checks
- Persistent settings through JSON file preload with live updates
- Redesigned options interface with auto-save
- Dark mode toggle
- Follow system theme option
- Exit confirmation prompt

### Planned features

- Domain monitor
- Misc tools
- Options
- Help page

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

## Important notice

Its your sole responsibility of what you do with this tool, check the licence section for more information. This tool intended use is to let anyone have a chance at finding a good domain in a crowded space, such as a good `.com`. A non conforming practice and use of the tool according to your local laws may land you criminal or civil liabilities. Other than that keep in mind that repeated whois requests to a server will eventually result in IP blacklisting for example, you should have a conservative values for time between requests and bit of common sense to minimize your risks, don't do huge bulk lookups at once and/or with the same IP, preferably use different proxies between requests.

## Quick start

Stay on the bleeding edge of whoisdigger commits using `git clone` or for slightly tested version download the latest built release.

### Latest built binary

Check out and download the latest release for your architecture/OS.

![Latest tag](https://img.shields.io/github/tag/whois-team/whoisdigger.svg?label=Latest%20tag&style=flat)
[![Check out releases](https://img.shields.io/badge/Checkout%20releases-%20-orange.svg)](https://github.com/whois-team/whoisdigger/releases)
[![Coverage](https://img.shields.io/badge/coverage-generated%20in%20CI-blue.svg)](https://github.com/whois-team/whoisdigger/actions/workflows/node.js.yml)

### Latest changes

Basic whoisdigger requirements are Node.js v18 or later (tested with v20), `npm` and `git`.

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

which will compile the source to `dist` and launch the application.

### Debug

Run with debugging enabled:

```
npm run debug
```

Windows Powershell

```
npm run debug-powershell
```

Windows Command Line

```
npm run debug-cmd
```

### Using wordlists

You can use wordlists by either using a file wordlist in text format or manually input using the text area option. Wordlists should follow sanitization requirements below for the best results although they're not mandatory. Not following the requirements will result in adverse or unwanted results.

Wordlist requirements:

- Deduplicated
- No spaces
- No subdomains
- One domain per line
- No TLDs
- UTF-8 encoded
- No reserved characters such as dots

Example wordlist

wordlist.txt (Text file)

```
pow
mow
cow
low
tow
```

Wordlists by manual input should follow the same rules with the only difference of being pasted at input stage.

#### Sample wordlists

Whoisdigger provides sample wordlists as example for testing purposes inside `sample_lists` folder.

### Exporting bulk processing results

When choosing export options, you can decide what domain status to export, if you want errors included, only basic domain information such as creation, expiration and update dates.

Exporting as text will only export raw replies for each domain in a zip file, as a csv you're able to see both both basic information and whois replies (in text, inline csv or separate csv inside a zip file).

### CLI usage

After building the project you can run lookups from the command line:

```bash
# single domain
node dist/app/ts/cli.js --domain example.com

# bulk search using a wordlist
node dist/app/ts/cli.js --wordlist words.txt --tlds com net --format csv --out results.csv

# using a proxy
node dist/app/ts/cli.js --domain example.com --proxy 127.0.0.1:9050

# purge expired cache
node dist/app/ts/cli.js --purge-cache

# clear entire cache
node dist/app/ts/cli.js --clear-cache
```

### Notes on errors

Errors during bulk lookups are pretty common due to sheer request volume, this means that you'll have requests periodically getting blocked, rejected, throttled or delayed (might result in false negatives, false positives in rare cases or errors). Errors may and usually signal that a domain is already registered, at times you can assume that but take into account the domain name, tld and probability of it being registered. Whoisdigger includes assumptions settings that you can tweak for specific scenarios, see assumptions below for more.

## Setup

Run `npm ci` before testing or linting to install the exact dependency versions
listed in `package-lock.json`.
If `node_modules` is missing, `npm run prebuild` will automatically fetch
dependencies before building. This script runs whenever you execute `npm run build`.

## Development setup

Run `nvm use` to switch to the Node version defined in `.nvmrc`.
Run `npm install` or `npm ci` before testing or linting to ensure all dependencies are installed.
After installing, execute `npm test` to run the project's unit tests.
Run `npm run test:e2e` to execute end-to-end tests that ensure the application starts cleanly.
Running tests also generates a coverage report in the `coverage/` directory.
Development packages such as `@types/node` and `@types/jest` are required for TypeScript compilation and running tests. The `prebuild` script will auto-install dependencies if `node_modules` is missing.
Use `npm run dev` to watch source files and automatically reload the application during development. Static assets such as stylesheets are synced to `dist` while this command runs, so CSS changes are picked up without rebuilding.

Run `npm run format -- --write` before committing to apply Prettier formatting. CI will verify formatting with `npm run format -- --check`.

## Settings

Whoisdigger uses a settings file that rules how the application behaves overall, this can be achieved by either using the preload settings file or change the `appsettings.ts` inside `js`.

Context isolation is always enabled for security purposes and cannot be disabled in configuration.

### Theme

The options screen provides a **Follow system theme** toggle. When enabled the application automatically switches between dark and light modes according to your operating system preference. This behaviour is controlled by the `theme.followSystem` setting which can be set to `true` or `false` in the configuration file.

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
Add a new `<lang>.json` file (e.g. `fr.json`) with your translations and include the language code in
`ui.language` inside `appsettings.ts`. Templates reference strings using the `{{t}}` helper.

## Docker

Build the Docker image:

```bash
docker build -t whoisdigger .
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
docker-compose up
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

Distributed under MIT License. See `license.md` for more information.

Additionally when using WhoisTeam or other GitHub Logos, please refer to [GitHub logo guidelines](https://github.com/logos).
