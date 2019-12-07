# App documentation

This document describes how the program is structured and the logic behind the chosen structure.

## Basic app structure

Every app file is inside the `app` folder broken down by type, `html`, `css`, `html`...

`main.js` is located at `js` folder root and the "main" `renderer.js` too.

At `js` root there's a `common` folder that includes functions that are not renderer or main exclusive and can be used across different parts of the app, such as time conversions and helpers, `main`folder that includes all the code executed on main, and `renderer` that includes exclusive renderer code.

Folders or single files correspond to different tabs across the app:

`sw.js`: single whois lookup

`bw`: bulk whois lookup

`bwa`: bulk whois analyzer

`to`: tools

`renderer\loadcontents.js`: loads html split files at startup

`sample_lists`: sample lists to test bulk whois

## Inner workings

`common\whoiswrapper.js`:

- Contains a common domain availability checker and domain data parser.
- `isDomainAvailable` is a function that check within the whois reply for availability, expression checks for "available" take precedence over "unavailable" and "error" results, always defaulting to "error" if no valid expression has been found.

## Tech in use

Jquery is used for functionality across the app from click events to real-time UI manipulation.

Communication between renderer and main is accomplished by using the remote module allowing a fast back and forth communication.

Html is split across different files and is fully loaded at startup with Jquery using `.load`.

#### App flow

Tab Single Whois

- Single Whois Panel, `#swMainContainer`, `tabs\sw.html`, search for domain using input.

Tab Bulk Whois

 - Bulk Whois Entry, `#bwEntry`, `tabs\bw\bwEntry.html`
    - [If file wordlist is chosen], File loading,
      	- [If file is selected], file input confirm
      	- [If confirmed, go to processing]
    - [If manual wordlist is chosen], Wordlist Input,
      	- [If wordlist is confirmed], Wordlist loading, 
      	- [after loading], wordlist confirm
      	- [If confirmed, go to processing]
- Bulk whois processing,
  - [If processing is complete], Export
  - [If export is selected], export loading
  - [after export complete, go to bulk whosi entry]

Tab Bulk Whois Analyser