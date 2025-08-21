import { settings } from './settings.js';
import { isIP } from 'net';
import { randomInt } from '../utils/random.js';

export interface ProxyInfo {
  ipaddress: string;
  port: number;
  auth?: { username: string; password: string };
}

let index = 0;
const failures = new Map<string, number>();

export function resetProxyRotation(): void {
  index = 0;
  failures.clear();
}

interface ProxySettingsEntry {
  proxy: string;
  username?: string;
  password?: string;
}

function parseEntry(
  entry: string | ProxySettingsEntry,
  defUser?: string,
  defPass?: string
): ProxyInfo | undefined {
  let authUser: string | undefined = defUser;
  let authPass: string | undefined = defPass;
  let hostPort: string;

  if (typeof entry === 'string') {
    hostPort = entry;
  } else {
    hostPort = entry.proxy;
    authUser = entry.username ?? authUser;
    authPass = entry.password ?? authPass;
  }

  if (hostPort.includes('@')) {
    const [authPart, hostPart] = hostPort.split('@');
    hostPort = hostPart;
    const [u, p] = authPart.split(':');
    if (u && p) {
      authUser = u;
      authPass = p;
    }
  }

  const [ip, port] = hostPort.split(':');
  const portNum = parseInt(port ?? '', 10);

  if (!ip || isIP(ip) === 0) {
    return undefined;
  }
  if (!port || Number.isNaN(portNum) || portNum < 1 || portNum > 65535) {
    return undefined;
  }

  const info: ProxyInfo = { ipaddress: ip, port: portNum };
  if (authUser && authPass) {
    info.auth = { username: authUser, password: authPass };
  }
  return info;
}

function proxyKey(p: ProxyInfo): string {
  return `${p.ipaddress}:${p.port}`;
}

export function reportProxyFailure(proxy: ProxyInfo): void {
  const key = proxyKey(proxy);
  failures.set(key, (failures.get(key) ?? 0) + 1);
}

export function getProxy(): ProxyInfo | undefined {
  const proxy = settings.lookupProxy;
  if (!proxy || !proxy.enable) {
    return undefined;
  }

  let list: (string | ProxySettingsEntry)[] = [];
  if (proxy.mode === 'single' && proxy.single) {
    list = [proxy.single];
  } else if (proxy.mode === 'multi' && Array.isArray(proxy.list)) {
    list = proxy.list;
  }

  if (list.length === 0) {
    return undefined;
  }

  const maxRetries = proxy.retries ?? 0;
  for (let attempts = 0; attempts < list.length; attempts++) {
    let entry: string | ProxySettingsEntry;
    switch (proxy.multimode) {
      case 'random':
        entry = list[randomInt(0, list.length - 1)];
        break;
      case 'ascending':
        // Use the current proxy before moving to the next to start from the first entry
        entry = list[index];
        index = (index + 1) % list.length;
        break;
      case 'descending':
        index = index <= 0 ? list.length - 1 : index - 1;
        entry = list[index];
        break;
      default:
        entry = list[index];
        index = (index + 1) % list.length;
        break;
    }

    const info = parseEntry(entry, proxy.username, proxy.password);
    if (!info) {
      continue;
    }
    const key = proxyKey(info);
    if (maxRetries > 0 && (failures.get(key) ?? 0) >= maxRetries) {
      continue;
    }
    return info;
  }

  return undefined;
}
