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

const debug = debugModule('main.bw.wordlistinput');

/*
  ipcMain.on('bw:input.wordlist', function(...) {...});
    On event: Bulk domain, wordlist input
  parameters
    event (object) - renderer object
 */
ipcMain.on('bw:input.wordlist', function(event) {
  const {
    sender
  } = event;

  debug("Using wordlist input");
  sender.send('bw:wordlistinput.confirmation');
});
