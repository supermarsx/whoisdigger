// jshint esversion: 8

const electron = require('electron'),
  debug = require('debug')('main.bw.wordlistinput');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote
} = electron;

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
