/**
 * Tests for proxy module (app/ts/common/proxy.ts)
 *
 * We test parseEntry indirectly via getProxy, and also the
 * reportProxyFailure/Success + resetProxyRotation helpers.
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));
jest.mock('../app/ts/common/settings.js', () => ({
  settings: {
    lookupProxy: {
      enable: false,
      mode: 'single',
      multimode: 'ascending',
      single: '',
      list: [],
      username: '',
      password: '',
      retries: 0,
    },
  },
}));
jest.mock('../app/ts/utils/random.js', () => ({
  randomInt: (min: number, max: number) => min,
}));
// net.isIP is used for IP validation
jest.mock('net', () => ({
  isIP: (ip: string) => {
    // Simplified IPv4/v6 detection
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return 4;
    if (ip.includes(':')) return 6;
    return 0;
  },
}));

import {
  getProxy,
  resetProxyRotation,
  reportProxyFailure,
  reportProxySuccess,
} from '../app/ts/common/proxy.js';

const mockSettings = jest.requireMock('../app/ts/common/settings.js').settings;

function setProxy(overrides: Record<string, unknown>) {
  Object.assign(mockSettings.lookupProxy, {
    enable: true,
    mode: 'single',
    multimode: 'ascending',
    single: '',
    list: [],
    username: '',
    password: '',
    retries: 0,
    ...overrides,
  });
}

beforeEach(() => {
  resetProxyRotation();
  mockSettings.lookupProxy = {
    enable: false,
    mode: 'single',
    multimode: 'ascending',
    single: '',
    list: [],
    username: '',
    password: '',
    retries: 0,
  };
});

describe('getProxy()', () => {
  it('returns undefined when proxy disabled', () => {
    expect(getProxy()).toBeUndefined();
  });

  it('returns undefined when enabled but no entries', () => {
    setProxy({ enable: true, single: '' });
    expect(getProxy()).toBeUndefined();
  });

  it('parses a valid single proxy', () => {
    setProxy({ single: '127.0.0.1:8080' });
    const p = getProxy();
    expect(p).toBeDefined();
    expect(p!.ipaddress).toBe('127.0.0.1');
    expect(p!.port).toBe(8080);
    expect(p!.auth).toBeUndefined();
  });

  it('parses a proxy with auth from settings fields', () => {
    setProxy({ single: '10.0.0.1:3128', username: 'user', password: 'pass' });
    const p = getProxy();
    expect(p).toBeDefined();
    expect(p!.auth).toEqual({ username: 'user', password: 'pass' });
  });

  it('parses inline auth (user:pass@ip:port)', () => {
    setProxy({ single: 'admin:secret@192.168.1.1:9999' });
    const p = getProxy();
    expect(p).toBeDefined();
    expect(p!.ipaddress).toBe('192.168.1.1');
    expect(p!.port).toBe(9999);
    expect(p!.auth).toEqual({ username: 'admin', password: 'secret' });
  });

  it('returns undefined for invalid IP', () => {
    setProxy({ single: 'notanip:8080' });
    expect(getProxy()).toBeUndefined();
  });

  it('returns undefined for invalid port', () => {
    setProxy({ single: '127.0.0.1:99999' });
    expect(getProxy()).toBeUndefined();
  });

  it('returns undefined for missing port', () => {
    setProxy({ single: '127.0.0.1' });
    expect(getProxy()).toBeUndefined();
  });

  it('handles IPv6 addresses in brackets', () => {
    setProxy({ single: '[::1]:8080' });
    const p = getProxy();
    expect(p).toBeDefined();
    expect(p!.ipaddress).toBe('::1');
    expect(p!.port).toBe(8080);
  });

  it('returns undefined for malformed IPv6 (no closing bracket)', () => {
    setProxy({ single: '[::1:8080' });
    expect(getProxy()).toBeUndefined();
  });
});

describe('multi proxy list', () => {
  it('rotates ascending through list', () => {
    setProxy({
      mode: 'multi',
      multimode: 'ascending',
      list: ['10.0.0.1:1111', '10.0.0.2:2222', '10.0.0.3:3333'],
    });
    const p1 = getProxy();
    expect(p1!.ipaddress).toBe('10.0.0.1');
    const p2 = getProxy();
    expect(p2!.ipaddress).toBe('10.0.0.2');
    const p3 = getProxy();
    expect(p3!.ipaddress).toBe('10.0.0.3');
    const p4 = getProxy();
    expect(p4!.ipaddress).toBe('10.0.0.1'); // wraps
  });

  it('supports object entries in list', () => {
    setProxy({
      mode: 'multi',
      multimode: 'ascending',
      list: [
        { proxy: '10.0.0.1:1111', username: 'u', password: 'p' },
      ],
    });
    const p = getProxy();
    expect(p).toBeDefined();
    expect(p!.auth).toEqual({ username: 'u', password: 'p' });
  });
});

describe('reportProxyFailure / reportProxySuccess', () => {
  it('skips failed proxy when retries exceeded', () => {
    setProxy({
      mode: 'multi',
      multimode: 'ascending',
      list: ['10.0.0.1:1111', '10.0.0.2:2222'],
      retries: 1,
    });
    // Fail first proxy once
    reportProxyFailure({ ipaddress: '10.0.0.1', port: 1111 });

    const p = getProxy();
    // Should skip the failed proxy and return the next one
    expect(p!.ipaddress).toBe('10.0.0.2');
  });

  it('restores proxy after success report', () => {
    setProxy({
      mode: 'multi',
      multimode: 'ascending',
      list: ['10.0.0.1:1111'],
      retries: 1,
    });
    reportProxyFailure({ ipaddress: '10.0.0.1', port: 1111 });
    reportProxySuccess({ ipaddress: '10.0.0.1', port: 1111 });

    const p = getProxy();
    expect(p).toBeDefined();
    expect(p!.ipaddress).toBe('10.0.0.1');
  });
});

describe('resetProxyRotation()', () => {
  it('resets index and failures', () => {
    setProxy({
      mode: 'multi',
      multimode: 'ascending',
      list: ['10.0.0.1:1111', '10.0.0.2:2222'],
    });
    getProxy(); // advance index
    resetProxyRotation();
    const p = getProxy();
    expect(p!.ipaddress).toBe('10.0.0.1'); // back to start
  });
});
