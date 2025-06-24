import { settings } from './settings';

export interface ProxyInfo {
  ipaddress: string;
  port: number;
  type?: number;
}

let index = 0;

export function resetProxyRotation(): void {
  index = 0;
}

export function getProxy(): ProxyInfo | undefined {
  const proxy = settings.lookupProxy;
  if (!proxy || !proxy.enable) {
    return undefined;
  }

  let list: string[] = [];
  if (proxy.mode === 'single' && typeof proxy.single === 'string') {
    list = [proxy.single];
  } else if (proxy.mode === 'multi' && Array.isArray(proxy.list)) {
    list = proxy.list;
  }

  if (list.length === 0) {
    return undefined;
  }

  let entry: string;
  switch (proxy.multimode) {
    case 'random':
      entry = list[Math.floor(Math.random() * list.length)];
      break;
    case 'ascending':
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

  const [ip, port] = entry.split(':');
  const portNum = parseInt(port ?? '0', 10);
  if (!ip || !portNum) return undefined;
  return { ipaddress: ip, port: portNum, type: 5 };
}
