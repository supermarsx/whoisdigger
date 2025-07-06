import electron from 'electron';
import { debugFactory } from '../common/logger.js';
const debug = debugFactory('bulkwhois');

const { app, BrowserWindow, Menu, ipcMain, dialog, remote } = electron;

import './bulkwhois/fileinput.js'; // File input
import './bulkwhois/wordlistinput.js'; // Wordlist input
import './bulkwhois/process.js'; // Process stage
import './bulkwhois/export.js'; // Export stage
