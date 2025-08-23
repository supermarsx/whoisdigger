import { settings } from './settings.js';
import { isIP } from 'net';
import { randomInt } from '../utils/random.js';

export interface ProxyInfo {
  ipaddress: string;
  port: number;
  auth?: { username: string; password: string };
}

let index = 0;
interface FailureInfo {
  count: number;
  lastFailure: number;
}
const failures = new Map<string, FailureInfo>();
const FAILURE_EXPIRY_MS = 5 * 60 * 1000;

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

  let ip: string | undefined;
  let port: string | undefined;

  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end === -1) {
      return undefined;
    }
    ip = hostPort.slice(1, end);
    const remainder = hostPort.slice(end + 1);
    if (!remainder.startsWith(':')) {
      return undefined;
    }
    port = remainder.slice(1);
  } else {
    [ip, port] = hostPort.split(':');
  }

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
  return isIP(p.ipaddress) === 6 ? `[${p.ipaddress}]:${p.port}` : `${p.ipaddress}:${p.port}`;
}

export function reportProxyFailure(proxy: ProxyInfo): void {
  const key = proxyKey(proxy);
  const prev = failures.get(key);
  failures.set(key, { count: (prev?.count ?? 0) + 1, lastFailure: Date.now() });
}

export function reportProxySuccess(proxy: ProxyInfo): void {
  failures.delete(proxyKey(proxy));
}

function cleanupFailures(now: number = Date.now()): void {
  for (const [key, info] of failures) {
    if (now - info.lastFailure > FAILURE_EXPIRY_MS) {
      failures.delete(key);
    }
  }
}

export function getProxy(): ProxyInfo | undefined {
  cleanupFailures();
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
    const failInfo = failures.get(key);
    if (maxRetries > 0 && (failInfo?.count ?? 0) >= maxRetries) {
      continue;
    }
    return info;
  }

  return undefined;
}
