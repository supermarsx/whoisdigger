# Whoisdigger



![Build Status](https://travis-ci.org/eduardomota/whoisdigger.svg?branch=master)  ![https://david-dm.org/eduardomota/whoisdigger.svg](https://david-dm.org/eduardomota/whoisdigger.svg) ![https://scrutinizer-ci.com/g/eduardomota/whoisdigger/badges/quality-score.png](https://scrutinizer-ci.com/g/eduardomota/whoisdigger/badges/quality-score.png)

**Be aware that this application is in alpha stage..**

Whoisdigger is bulk whois lookup, cross-platform, desktop application built on Electron. Made with builders and creators in mind allowing anyone to look for their favorite domain mashups without risk of third-party logging, domain squatting and other domain lookup related issues.

### Things you should be aware

Its your sole responsibility what you do with this tool, its intended to let anyone have a chance at finding a good domain in a crowded space. Is also known that repeated whois requests to a server will eventually result in a IP block, you should have a conservative value for time between requests to minimize the risk of blocks and don't do huge bulk lookups at once or with the same ip, preferably use proxies for requests.

### Things that work right now

- [x] Single domain whois lookup
- [x] Bulk whois - file wordlist input
- [x] Bulk whois - manual wordlist
- [x] Bulk whois - drag & drop file input
- [x] Bulk whois - lookup processing
- [ ] Bulk whois - lookup pause/continue mechanism
- [ ] Bulk whois - csv/txt export mechanism

### How to run direct from source

Open a command prompt at app root folder and run:

```
npm start
```

Verbose debug use 

(Windows powershell):

```
npm run debug-powershell
```

(Windows cmd/command line):

```
npm run debug-cmd
```

### Installation

#### macOS

#### Windows

#### Linux

### Compiling from source

#### macOS

```
npm run package-mac
```

#### Windows

```
npm run package-win
```

#### Linux

```
npm run package-linux
```

