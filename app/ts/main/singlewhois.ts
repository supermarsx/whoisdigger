import { ipcMain, clipboard, shell } from 'electron';
import type { IpcMainEvent } from 'electron';
import { lookup as whoisLookup } from '../common/lookup.js';
import { isDomainAvailable } from '../common/availability.js';
import DomainStatus from '../common/status.js';
import { addEntry as addHistoryEntry } from '../common/history.js';
import { debugFactory } from '../common/logger.js';
const debug = debugFactory('main.singlewhois');
import { formatString } from '../common/stringformat.js';

import { settings } from './settings-main.js';
import type { Settings } from './settings-main.js';
import { IpcChannel } from '../common/ipcChannels.js';
import { handle } from './ipc.js';

/*
  ipcMain.on('singlewhois:lookup', function(...) {...});
    Single whois lookup
 */
handle(IpcChannel.SingleWhoisLookup, async (_event, domain) => {
  debug('Starting whois lookup');
  try {
    const data = await whoisLookup(domain);
    try {
      const status = isDomainAvailable(data);
      addHistoryEntry(domain, status);
    } catch {
      addHistoryEntry(domain, DomainStatus.Error);
    }
    return data;
  } catch (err) {
    debug('Whois lookup threw an error');
    addHistoryEntry(domain, DomainStatus.Error);
    throw err;
  }
});

/*
  ipcMain.on('singlewhois:openlink', function(...) {...});
    Open link or copy to clipboard
 */
ipcMain.on('singlewhois:openlink', function (event, domain) {
  const misc = settings.lookupMisc;

  misc.onlyCopy ? copyToClipboard(event, domain) : openUrl(event, domain, settings);

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
function openUrl(event: IpcMainEvent, domain: string, _settings: Settings): void {
  let target: URL;
  try {
    target = new URL(domain);
  } catch {
    debug(`Invalid URL rejected: ${domain}`);
    event.sender.send('singlewhois:invalid-url');
    return;
  }
  const protocol = target.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    debug(`Invalid protocol rejected: ${target.protocol}`);
    event.sender.send('singlewhois:invalid-url');
    return;
  }

  debug(formatString('Opening {0}', domain));
  shell.openExternal(target.href);

  return;
}
