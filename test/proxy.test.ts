import './electronMock';
import { settings } from '../app/ts/renderer/settings-renderer';
import {
  getProxy,
  resetProxyRotation,
  reportProxyFailure,
  reportProxySuccess
} from '../app/ts/common/proxy';

describe('proxy helper', () => {
  afterEach(() => {
    resetProxyRotation();
    settings.lookupProxy.enable = false;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.multimode = 'sequential';
    settings.lookupProxy.single = '';
    settings.lookupProxy.list = [];
    settings.lookupProxy.username = '';
    settings.lookupProxy.password = '';
    settings.lookupProxy.retries = 3;
  });

  test('returns undefined when disabled', () => {
    settings.lookupProxy.enable = false;
    expect(getProxy()).toBeUndefined();
  });

  test('returns single proxy when enabled', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.single = '1.2.3.4:1080';
    const proxy = getProxy();
    expect(proxy).toEqual({ ipaddress: '1.2.3.4', port: 1080 });
  });

  test('rotates proxies sequentially', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080'];
    settings.lookupProxy.multimode = 'sequential';
    const first = getProxy();
    const second = getProxy();
    const third = getProxy();
    expect(first).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080 });
    expect(third).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
  });

  test('returns first proxy on first call in ascending mode', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080'];
    settings.lookupProxy.multimode = 'ascending';
    const first = getProxy();
    expect(first).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
  });

  test('cycles proxies ascending', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080', '3.3.3.3:8080'];
    settings.lookupProxy.multimode = 'ascending';
    const first = getProxy();
    const second = getProxy();
    const third = getProxy();
    const fourth = getProxy();
    expect(first).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080 });
    expect(third).toEqual({ ipaddress: '3.3.3.3', port: 8080 });
    expect(fourth).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
  });

  test('cycles proxies descending', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080', '3.3.3.3:8080'];
    settings.lookupProxy.multimode = 'descending';
    const first = getProxy();
    const second = getProxy();
    const third = getProxy();
    const fourth = getProxy();
    expect(first).toEqual({ ipaddress: '3.3.3.3', port: 8080 });
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080 });
    expect(third).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
    expect(fourth).toEqual({ ipaddress: '3.3.3.3', port: 8080 });
  });

  test('returns undefined for invalid ip address', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.single = 'invalid_ip:8080';
    expect(getProxy()).toBeUndefined();
  });

  test('returns undefined for invalid port', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.single = '1.2.3.4:70000';
    expect(getProxy()).toBeUndefined();
    settings.lookupProxy.single = '1.2.3.4:0';
    expect(getProxy()).toBeUndefined();
  });
  test('parses credentials from proxy string', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.single = 'user:pass@1.2.3.4:1080';
    const proxy = getProxy();
    expect(proxy).toEqual({
      ipaddress: '1.2.3.4',
      port: 1080,
      auth: { username: 'user', password: 'pass' }
    });
  });

  test('uses credentials from proxy object', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = [{ proxy: '1.2.3.4:1080', username: 'user', password: 'pass' }];
    const proxy = getProxy();
    expect(proxy).toEqual({
      ipaddress: '1.2.3.4',
      port: 1080,
      auth: { username: 'user', password: 'pass' }
    });
  });

  test('uses global credentials', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.username = 'user';
    settings.lookupProxy.password = 'pass';
    settings.lookupProxy.single = '1.2.3.4:1080';
    const proxy = getProxy();
    expect(proxy).toEqual({
      ipaddress: '1.2.3.4',
      port: 1080,
      auth: { username: 'user', password: 'pass' }
    });
  });

  test('skips proxies exceeding retry limit', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080'];
    settings.lookupProxy.multimode = 'sequential';
    settings.lookupProxy.retries = 1;
    const first = getProxy();
    reportProxyFailure(first!);
    const next = getProxy();
    expect(next).toEqual({ ipaddress: '2.2.2.2', port: 8080 });
  });

  test('allows proxy again after success report', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080'];
    settings.lookupProxy.multimode = 'sequential';
    settings.lookupProxy.retries = 1;
    const first = getProxy();
    reportProxyFailure(first!);
    const second = getProxy();
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080 });
    reportProxySuccess(first!);
    const third = getProxy();
    expect(third).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
  });

  test('cleans up expired failures', () => {
    jest.useFakeTimers();
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080'];
    settings.lookupProxy.multimode = 'sequential';
    settings.lookupProxy.retries = 1;
    const first = getProxy();
    reportProxyFailure(first!);
    const second = getProxy();
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080 });
    jest.advanceTimersByTime(5 * 60 * 1000 + 1);
    const third = getProxy();
    expect(third).toEqual({ ipaddress: '1.1.1.1', port: 8080 });
    jest.useRealTimers();
  });

  test('parses IPv6 proxy string', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'single';
    settings.lookupProxy.single = '[2001:db8::1]:1080';
    const proxy = getProxy();
    expect(proxy).toEqual({ ipaddress: '2001:db8::1', port: 1080 });
  });

  test('skips IPv6 proxies exceeding retry limit', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['[2001:db8::1]:8080', '[2001:db8::2]:8080'];
    settings.lookupProxy.retries = 1;
    const first = getProxy();
    reportProxyFailure(first!);
    const second = getProxy();
    const third = getProxy();
    expect(first).toEqual({ ipaddress: '2001:db8::1', port: 8080 });
    expect(second).toEqual({ ipaddress: '2001:db8::2', port: 8080 });
    expect(third).toEqual({ ipaddress: '2001:db8::2', port: 8080 });
  });
});
