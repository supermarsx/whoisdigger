// jshint esversion: 8

const electron = require('electron'),
  path = require('path'),
  url = require('url'),
  whois = require('../common/whoiswrapper'),
  debug = require('debug')('main.sw');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote,
  clipboard
} = electron;

var settings = require('../common/settings').load();

/*
  ipcMain.on('sw:lookup', function(...) {...});
    Single whois lookup
 */
ipcMain.on('sw:lookup', function(event, domain) {
  debug('Starting whois lookup');
  whois.lookup(domain)
    .then(function(data) {
      debug('Sending back whois reply');
      event.sender.send('sw:results', data);
    })
    .catch(function(err) {
      debug('Whois lookup threw an error');
      event.sender.send('sw:results', err);
    });
});

/*
  ipcMain.on('sw:openlink', function(...) {...});
    Open link or copy to clipboard
 */
ipcMain.on('sw:openlink', function(event, domain) {
  var {
    'app.window': appWindow,
    'lookup.misc': misc
  } = settings;
  if (misc.onlyCopy) {
    debug('Copied {0} to clipboard'.format(domain));
    clipboard.writeText(domain);
    event.sender.send('sw:copied');
  } else {
    debug('Opening {0} on a new window'.format(domain));
    var hwnd = new BrowserWindow({
      frame: true,
      height: appWindow.height,
      width: appWindow.width,
      icon: appWindow.icon
    });

    hwnd.setSkipTaskbar(true);
    hwnd.setMenu(null);
    hwnd.loadURL(domain);

    hwnd.on('closed', function() {
      win = null;
    });
  }
});
