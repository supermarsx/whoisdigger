import { handle } from './ipc.js';
import { lookup } from '../common/lookup.js';
import { isDomainAvailable } from '../common/availability.js';
import DomainStatus from '../common/status.js';
import { getSettings } from './settings-main.js';
import { debugFactory } from '../common/logger.js';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import { IpcChannel } from '../common/ipcChannels.js';

const debug = debugFactory('main.monitor');

let timer: NodeJS.Timeout | undefined;
const lastStatuses = new Map<string, DomainStatus>();
let sender: WebContents | null = null;

async function checkDomains(): Promise<void> {
  const { monitor } = getSettings();
  if (!monitor?.list?.length) return;

  for (const domain of monitor.list) {
    try {
      const data = await lookup(domain);
      const status = isDomainAvailable(data);
      if (lastStatuses.get(domain) !== status) {
        lastStatuses.set(domain, status);
        sender?.send(IpcChannel.MonitorUpdate, domain, status);
        debug(`Domain ${domain} status changed to ${status}`);
      }
    } catch (e) {
      debug(`Lookup failed for ${domain}: ${e}`);
    }
  }
}

handle(IpcChannel.MonitorStart, async (event: IpcMainInvokeEvent) => {
  sender = event.sender;
  const { monitor } = getSettings();
  const interval = monitor?.interval ?? 60000;
  if (timer) clearInterval(timer);
  await checkDomains();
  timer = setInterval(checkDomains, interval);
});

handle(IpcChannel.MonitorStop, async () => {
  if (timer) clearInterval(timer);
  timer = undefined;
});

export const _test = {
  checkDomains,
  lastStatuses,
  getTimer: () => timer
};
