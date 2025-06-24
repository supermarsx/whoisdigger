import electron from 'electron';
import debugModule from 'debug';
const debug = debugModule('main.bw');

const { app, BrowserWindow, Menu, ipcMain, dialog, remote } = electron;

import './bw/fileinput'; // File input
import './bw/wordlistinput'; // Wordlist input
import './bw/process'; // Process stage
import './bw/export'; // Export stage
