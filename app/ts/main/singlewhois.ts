import electron from 'electron';
import type { IpcMainEvent } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { lookup as whoisLookup } from '../common/lookup.js';
import { isDomainAvailable } from '../common/availability.js';
import { addEntry as addHistoryEntry } from '../common/history.js';
import debugModule from 'debug';
const debug = debugModule('main.singlewhois');

const { app, Menu, ipcMain, dialog, remote, clipboard, shell } = electron;
import { formatString } from '../common/stringformat.js';

import { settings } from './settings-main.js';
import type { Settings } from './settings-main.js';
import { IpcChannel } from '../common/ipcChannels.js';

/*
  ipcMain.on('singlewhois:lookup', function(...) {...});
    Single whois lookup
 */
ipcMain.handle(IpcChannel.SingleWhoisLookup, async (_event, domain) => {
  debug('Starting whois lookup');
  try {
    const data = await whoisLookup(domain);
    try {
      const status = isDomainAvailable(data);
      addHistoryEntry(domain, status);
    } catch {
      addHistoryEntry(domain, 'error');
    }
    return data;
  } catch (err) {
    debug('Whois lookup threw an error');
    addHistoryEntry(domain, 'error');
    throw err;
  }
});

/*
  ipcMain.on('singlewhois:openlink', function(...) {...});
    Open link or copy to clipboard
 */
ipcMain.on('singlewhois:openlink', function (event, domain) {
  const misc = settings.lookupMisc;

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
  const { sender } = event;

  debug(formatString('Copied {0} to clipboard', domain));
  clipboard.writeText(domain);
  sender.send('singlewhois:copied');

  return;
}

/*
  openUrl
    Opens a URL in the user's default browser
  parameters
    domain
    settings
*/
function openUrl(domain: string, settings: Settings): void {
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

  debug(formatString('Opening {0}', domain));
  shell.openExternal(target.href);

  return;
}
