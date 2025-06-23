// jshint esversion: 8

import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote,
} from 'electron';
import debugModule from 'debug';

import './bw/fileinput'; // File input
import './bw/wordlistinput'; // Wordlist input
import './bw/process'; // Process stage
import './bw/export'; // Export stage
import '../common/stringformat'; // String format

const debug = debugModule('main.bw');
