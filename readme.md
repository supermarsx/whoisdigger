<p align="center"><img width=30% src="https://github.com/whois-team/brand/blob/master/png/whoisteam_black.png"></p>
<p align="center"><img width=60% src="https://github.com/whois-team/brand/blob/master/png/whoisdigger_black.png"></p>


<p align="center"><a href="https://github.com/whois-team/whoisdigger/blob/master/package.json"><img src="https://img.shields.io/badge/electron-%5E4.0.0-blue.svg"></a>  <a href="https://scrutinizer-ci.com/g/whois-team/whoisdigger/build-status/master"><img src="https://scrutinizer-ci.com/g/whois-team/whoisdigger/badges/build.png?b=master"></a> <a href="https://app.fossa.io/projects/git%2Bgithub.com%2Fwhois-team%2Fwhoisdigger?ref=badge_shield" alt="FOSSA Status"><img src="https://app.fossa.io/api/projects/git%2Bgithub.com%2Fwhois-team%2Fwhoisdigger.svg?type=shield"/></a>
 <a href="https://david-dm.org/whois-team/whoisdigger"><img src="https://david-dm.org/whois-team/whoisdigger/status.svg"></a>  <a href="https://scrutinizer-ci.com/g/whois-team/whoisdigger/?branch=master"><img src="https://scrutinizer-ci.com/g/whois-team/whoisdigger/badges/quality-score.png?b=master"></a>  <a href="https://www.codacy.com/app/eduardomota/whoisdigger"><img src="https://api.codacy.com/project/badge/Grade/2611b6567d054839a88faa504839e63d"></a>  <a href="https://snyk.io/test/github/whois-team/whoisdigger"><img src="https://snyk.io/test/github/whois-team/whoisdigger/badge.svg"></a>  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/github/license/whois-team/whoisdigger.svg?style=flat"></a></p>


<hr>


![Whoisdigger app](https://github.com/whois-team/website/raw/master/images/projects/whoisdigger.gif)  

**This application is in alpha stage..**

Whoisdigger is a bulk whois lookup, cross-platform, desktop application built on Electron. Made with builders and creators in mind, rapidly lookup up your favorite domain mashups without risk of third-party logging, domain squatting and other domain lookup issues.



[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fwhois-team%2Fwhoisdigger.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fwhois-team%2Fwhoisdigger?ref=badge_large)

## Features

- Fast single domain lookup and raw reply
- File or manual wordlist bulk whois
- Drag and drop wordlist file
- Bulk raw whois replies (txt) and/or field formatted replies (.csv)

### Planned features

- Bulk pause/continue mechanism
- Bulk analyser
- Domain monitor
- Misc tools
- Options
- Help page
- Proxy integration


## Be aware that

Its your sole responsibility what you do with this tool, its intended to let anyone have a chance at finding a good domain in a crowded space. Is also known that repeated whois requests to a server will eventually result in IP blacklisting, you should have a conservative value for time between requests and bit of common sense to minimize the risk of blocks, don't do huge bulk lookups at once or with the same ip, preferably use different proxies between requests.


## Quick Start

To stay on the bleeding edge of whoisdigger updates do `git clone` or for more stability download the latest release.

### Latest development changes

For this you'll need to have `node`, `npm` and `git`.

Clone whoisdigger code to your local machine

```
git clone https://github.com/whois-team/whoisdigger
```

After clone, run using

```
npm start
```

Or debug using

Windows Powershell

```
npm run debug-powershell
```
Windows Command Line

```
npm run debug-cmd
```

### Latest built binary

Check out releases and download the latest release for your architecture/OS.


![Latest tag](https://img.shields.io/github/tag/whois-team/whoisdigger.svg?label=Latest%20tag&style=flat)
[![Check out releases](https://img.shields.io/badge/Checkout%20releases-%20-orange.svg)](https://github.com/whois-team/whoisdigger/releases)


### Using wordlists

Wordlist files should have one word per line without TLDs suffixes, spaces or special characters if intended, they should follow the example below:

wordlist.txt (Text file)
```
pow
mow
cow
low
tow
```

Wordlists by manual input should follow the same rules with the only difference of being pasted at input stage.

### Exporting bulk processing results

At export stage the user is given several options, you can decide what domain status to export, if you want domains that threw errors included, their basic information if not available such as creation, expiry and update dates. Exporting as text file will only export invidualized whois replies for each domain in a zip file, as a csv you're able export both basic information and whois replies in text, inline csv or separate csv files in a zip for organization.

### Notes on errors

Errors when doing bulk lookups are common due to the nature of bulk requests, this means that requests will get blocked, throttled or delayed resulting in errors. Errors commonly refer to already registered domains so most times you can assume that they're already taken. Uniregistry has a very low threshold on whois requests resulting in temporary block as soon as 3 rapid requests hit their server, in this case you can also assume its taken.

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


## Built With

<a href="https://electronjs.org/"><img height=40px src="https://electronjs.org/images/electron-logo.svg"></a>

<a href="https://jquery.org/"><img height=40px src="https://upload.wikimedia.org/wikipedia/sco/9/9e/JQuery_logo.svg"></a>

<a href="href="https://bulma.io/"><img height=40px src="https://bulma.io/images/made-with-bulma.png"></a>


## License

Distributed under MIT License. See `license.md` for more information.

Additionally when using WhoisTeam or other GitHub Logos, please refer to [GitHub logo guidelines](https://github.com/logos).