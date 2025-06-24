# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] - 0.2.0

### Added
- Request caching with a configurable SQLite backend.
- Proxy support for outgoing requests.
- DNS sweep capability alongside analyzer improvements.
- Dark mode toggle and redesigned options interface with auto-save.
- Cross-platform packaging workflows and debug script.
- Continuous integration workflows with Node.js matrix builds.
- WebdriverIO and Jest test suites with coverage reporting.
- Settings persistence with automatic saves and live updates.

### Changed
- Codebase migrated to TypeScript and integrated with Prettier.
- Updated major libraries such as better-sqlite3 and TypeScript ESLint.
- Enhanced content security policies and build scripts.

### Fixed
- Runtime script loading and main window path resolution issues.
- Addressed missing module errors causing console noise.
- Resolved export and open link failures in the renderer.

## [0.0.4] - 2019-11-18
### Changed
- Overall checker rebuild with readability improvements.
### Fixed
- Subdomain parsing errors and default server settings.
- Added error and shorten cases.
- Minor fixes related to issue #6.
### Added
- New availability cases.

## [0.0.3] - 2019-04-04
### Added
- Initial analyzer alpha.
### Changed
- Electron dependencies updated.
### Fixed
- Minor build typos and analyzer improvements.

## [0.0.1] - 2019-02-08
### Added
- Initial alpha release.
