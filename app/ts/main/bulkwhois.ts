import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bw');

const { app, BrowserWindow, Menu, ipcMain, dialog, remote } = electron;

import './bulkwhois/fileinput.js'; // File input
import './bulkwhois/wordlistinput.js'; // Wordlist input
import './bulkwhois/process.js'; // Process stage
import './bulkwhois/export.js'; // Export stage
