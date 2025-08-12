import './electronMock';
import { settings } from '../app/ts/renderer/settings-renderer';
import { getProxy, resetProxyRotation } from '../app/ts/common/proxy';

describe('proxy helper', () => {
  afterEach(() => {
    resetProxyRotation();
    settings.lookupProxy.enable = false;
    settings.lookupProxy.single = '';
    settings.lookupProxy.list = [];
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
    expect(proxy).toEqual({ ipaddress: '1.2.3.4', port: 1080, type: 5 });
  });

  test('rotates proxies sequentially', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080'];
    settings.lookupProxy.multimode = 'sequential';
    const first = getProxy();
    const second = getProxy();
    const third = getProxy();
    expect(first).toEqual({ ipaddress: '1.1.1.1', port: 8080, type: 5 });
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080, type: 5 });
    expect(third).toEqual({ ipaddress: '1.1.1.1', port: 8080, type: 5 });
  });

  test('returns first proxy on first call in ascending mode', () => {
    settings.lookupProxy.enable = true;
    settings.lookupProxy.mode = 'multi';
    settings.lookupProxy.list = ['1.1.1.1:8080', '2.2.2.2:8080'];
    settings.lookupProxy.multimode = 'ascending';
    const first = getProxy();
    expect(first).toEqual({ ipaddress: '1.1.1.1', port: 8080, type: 5 });
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
    expect(first).toEqual({ ipaddress: '1.1.1.1', port: 8080, type: 5 });
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080, type: 5 });
    expect(third).toEqual({ ipaddress: '3.3.3.3', port: 8080, type: 5 });
    expect(fourth).toEqual({ ipaddress: '1.1.1.1', port: 8080, type: 5 });
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
    expect(first).toEqual({ ipaddress: '3.3.3.3', port: 8080, type: 5 });
    expect(second).toEqual({ ipaddress: '2.2.2.2', port: 8080, type: 5 });
    expect(third).toEqual({ ipaddress: '1.1.1.1', port: 8080, type: 5 });
    expect(fourth).toEqual({ ipaddress: '3.3.3.3', port: 8080, type: 5 });
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
});
