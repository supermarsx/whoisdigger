
import electron from 'electron';
import * as path from 'path';
import * as url from 'url';
import { lookup as whoisLookup } from '../common/lookup';
import debugModule from 'debug';
const debug = debugModule('main.sw');

const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  remote,
  clipboard
} = electron;
import { formatString } from '../common/stringformat';

import { loadSettings } from '../common/settings';
const settings = loadSettings();

/*
  ipcMain.on('sw:lookup', function(...) {...});
    Single whois lookup
 */
ipcMain.on('sw:lookup', async function(event, domain) {
  const {
    sender
  } = event;

  debug('Starting whois lookup');
  whoisLookup(domain)
    .then(function(data) {
      debug('Sending back whois reply');
      sender.send('sw:results', data);
    })
    .catch(function(err) {
      debug('Whois lookup threw an error');
      sender.send('sw:results', err);
    });
});

/*
  ipcMain.on('sw:openlink', function(...) {...});
    Open link or copy to clipboard
 */
ipcMain.on('sw:openlink', function(event, domain) {
  const {
    'lookup.misc': misc
  } = settings;

  misc.onlyCopy ? copyToClipboard(event, domain) : openUrl(event, domain);

  return;
});

/*
  copyToClipboard
    Copies a domain name to clipboard
  parameters
    event
    domain
 */
function copyToClipboard(event, domain) {
  const {
    sender
  } = event;

  debug(formatString('Copied {0} to clipboard', domain));
  clipboard.writeText(domain);
  sender.send('sw:copied');

  return;
}

/*
  openUrl
    Opens a URL in a new browser window (potential security risk)
  parameters
    event
    domain
 */
function openUrl(event, domain) {
  const {
    'app.window': appWindow,
  } = settings;

  debug(formatString('Opening {0} on a new window', domain));

  let hwnd: any = new BrowserWindow({
    frame: true,
    height: appWindow.height,
    width: appWindow.width,
    icon: appWindow.icon
  });

  hwnd.setSkipTaskbar(true);
  hwnd.setMenu(null);
  hwnd.loadURL(domain);

  hwnd.on('closed', function() {
    hwnd = null;
  });
  
  return;
}
