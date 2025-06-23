
import electron from 'electron';
import type { IpcMainEvent, BrowserWindow as ElectronBrowserWindow } from 'electron';
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

import { settings } from '../common/settings';
import type { Settings } from '../common/settings';

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

  misc.onlyCopy ? copyToClipboard(event, domain) : openUrl(domain, settings);

  return;
});

/*
  copyToClipboard
    Copies a domain name to clipboard
  parameters
    event
    domain
 */
function copyToClipboard(event: IpcMainEvent, domain: string): void {
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
    domain
    settings
*/
function openUrl(domain: string, settings: Settings): void {
  const {
    'app.window': appWindow,
  } = settings;

  let target: URL;
  try {
    target = new URL(domain);
  } catch {
    console.warn(`Invalid URL: ${domain}`);
    return;
  }
  const protocol = target.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    console.warn(`Invalid protocol: ${target.protocol}`);
    return;
  }

  debug(formatString('Opening {0} on a new window', domain));

  let hwnd: ElectronBrowserWindow | null = new BrowserWindow({
    frame: true,
    height: appWindow.height,
    width: appWindow.width,
    icon: appWindow.icon
  });

  hwnd.setSkipTaskbar(true);
  hwnd.setMenu(null);
  hwnd.loadURL(target.href);

  hwnd.on('closed', function() {
    hwnd = null;
  });
  
  return;
}
