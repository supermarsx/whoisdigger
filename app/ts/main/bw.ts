import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bw');

const { app, BrowserWindow, Menu, ipcMain, dialog, remote } = electron;

import './bw/fileinput.js'; // File input
import './bw/wordlistinput.js'; // Wordlist input
import './bw/process.js'; // Process stage
import './bw/export.js'; // Export stage
