# App documentation

This document describes how the program is structured and the logic behind the chosen structure.

## Basic app structure

Every app file is inside the `app` folder broken down by type, `html`, `css`, `html`...

`main.js` is located at `js` folder root and the "main" `renderer.js` too.

At `js` root there's a `common` folder that includes functions that are not scope exclusive and can be used across different parts of the app like time conversions and helpers, `main`folder that includes all the code executed on main, and `renderer` that includes exclusive renderer code.

Folders or single files correspond to different tabs across the app:

`sw.js`: single whois lookup

`bw`: bulk whois lookup

`bwa`: bulk whois analyser

`to`: tools

`renderer\loadcontents.js`: loads html split files at startup

`sample_lists`: sample lists to test bulk whois

## Tech in use

Jquery is used for functionality across the app from click events to real-time UI manipulation.

Communication between renderer and main is accomplished by using the remote module allowing a fast back and forth communication.

Html is split across different files and is fully loaded at startup with Jquery using `.load`.