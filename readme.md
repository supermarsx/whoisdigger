<p align="center"><img width=60% src="https://github.com/whois-team/brand/blob/master/png/whoisdigger_black.png"></p>
<p align="center"><img src="https://img.shields.io/github/package-json/v/whois-team/whoisdigger"> <img src="https://img.shields.io/github/downloads/whois-team/whoisdigger/total"> <img src="https://img.shields.io/github/issues-raw/whois-team/whoisdigger"></p>
<p align="center"><a href="https://github.com/whois-team/whoisdigger/blob/master/package.json"><img src="https://img.shields.io/github/package-json/dependency-version/whois-team/whoisdigger/electron"></a>  <a href="https://scrutinizer-ci.com/g/whois-team/whoisdigger/build-status/master"><img src="https://scrutinizer-ci.com/g/whois-team/whoisdigger/badges/build.png?b=master"></a>  <a href="https://david-dm.org/whois-team/whoisdigger"><img src="https://david-dm.org/whois-team/whoisdigger/status.svg"></a>  <a href="https://scrutinizer-ci.com/g/whois-team/whoisdigger/?branch=master"><img src="https://scrutinizer-ci.com/g/whois-team/whoisdigger/badges/quality-score.png?b=master"></a></p>
<p align="center"><a href="https://www.codacy.com/app/eduardomota/whoisdigger"><img src="https://api.codacy.com/project/badge/Grade/2611b6567d054839a88faa504839e63d"></a>  <a href="https://snyk.io/test/github/whois-team/whoisdigger"><img src="https://snyk.io/test/github/whois-team/whoisdigger/badge.svg"></a>  <a href="https://app.fossa.io/projects/git%2Bgithub.com%2Fwhois-team%2Fwhoisdigger"><img src="https://app.fossa.io/api/projects/git%2Bgithub.com%2Fwhois-team%2Fwhoisdigger.svg?type=shield"></a>  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/github/license/whois-team/whoisdigger.svg?style=flat"></a></p>
<hr>





![Whoisdigger app](https://github.com/whois-team/website/raw/master/images/projects/whoisdigger.gif)  

This application is in **alpha stage**, you may encounter false positives and/or negatives.

Whoisdigger is a bulk whois lookup, cross-platform, desktop application built on Electron. Made with builders and creators in mind, rapidly lookup up your favorite domain mashups without risking third-party logging, domain squatting and a few other common issues that come with using third-party platforms. The faster, reliable and most private way of looking for domains.

### Important notice

If you clone this repo please patch `node_modules\whois\index.js` and remove the first line containing `#!/usr/bin/env node`.

## Index

- [Features](#features)
- [Important notice](#important-notice)
- [Quick start](#quick-start)
- [Building](#building)
- [Built with](#built-with)
- [License](#license)

## Features

- Fast whois lookup
- Better privacy
- Raw text whois replies
- Bulk whois lookup
- Bulk DNS sweep lookup
- Wordlist capabilities with drag n' drop
- IDNA 2003/2008 (UTS46), Punycode, non-ASCII character filter support
- Public Suffix List (PSL) and wildcard filtering
- Basic bulk whois result analyser (csv import)
- Persistent settings through json file preload

### Planned features

- Domain monitor
- Misc tools
- Options
- Help page
- Proxy integration

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

### Latest changes

Basic whoisdigger requirements are `node`, `npm` and `git`.

Clone whoisdigger code and install dependencies

```
git clone https://github.com/whois-team/whoisdigger
cd whoisdigger
npm install
```

After clone, run using

```
npm start
```

### Debug

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

### Notes on errors

Errors during bulk lookups are pretty common due to sheer request volume, this means that you'll have requests periodically getting blocked, rejected, throttled or delayed (might result in false negatives, false positives in rare cases or errors). Errors may and usually signal that a domain is already registered, at times you can assume that but take into account the domain name, tld and probability of it being registered. Whoisdigger includes assumptions settings that you can tweak for specific scenarios, see assumptions below for more.

## Settings

Whoisdigger uses a settings file that rules how the application behaves overall, this can be achieved by either using the preload settings file or change the `appSettings.js` inside `js`.

### Assumptions

You can use assumptions (`lookup.assumptions` settings section) to make more reliable searches in cases where you're getting inconsistencies across different tests.

`uniregistry`, Assume a domain is unavailable when uniregistry query limit is reached, default: true.

​	Note: Uniregistry whois has a very low threshold on whois requests, a few requests with relative small timings in between will result in a sure temporary block, by assuming a rate limiting reply from uniregistry as a taken domain, you ensure that you're not getting a false/undetermined reply error.

`ratelimit`, Assume a domain is unavailable when getting rate limit reply, default: false

`unparsable`, Assume a domain as available if reply is unparsable, it may help correcting malformed, unusual or unhandled whois replies, default: false

`dnsFailureUnavailable`, Assume a domain is unavailable in a DNS sweep if request fails, this avoids having false positives on availability, default: true

## Building

Whoisdigger uses electron-packager for builds.

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

## Built with

<a href="https://electronjs.org/"><img height=40px src="https://electronjs.org/images/electron-logo.svg"></a>

<a href="https://jquery.org/"><img height=40px src="https://upload.wikimedia.org/wikipedia/en/9/9e/JQuery_logo.svg"></a>

<a href="https://bulma.io/"><img height=40px src="https://bulma.io/images/made-with-bulma.png"></a>

## License

Distributed under MIT License. See `license.md` for more information.

Additionally when using WhoisTeam or other GitHub Logos, please refer to [GitHub logo guidelines](https://github.com/logos).
