// jshint esversion: 8

const electron = require('electron'),
  debug = require('debug')('main.bw');

require('./bw/fileinput'); // File input
require('./bw/wordlistinput'); // Wordlist input
require('./bw/process'); // Process stage
require('./bw/export'); // Export stage
require('../common/stringFormat'); // String format

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;
