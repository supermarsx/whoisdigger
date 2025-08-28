/** @jest-environment jsdom */

import jQuery from 'jquery';

const mockDebug = jest.fn();
jest.mock('../app/ts/common/logger.ts', () => ({
  debugFactory: () => mockDebug
}));

declare global {
  interface Window {
    electron: {
      send: jest.Mock;
      invoke: jest.Mock;
      on: jest.Mock;
    };
  }
}

let mockSend: jest.Mock;
let mockInvoke: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '<button id="navButtonDevtools"></button>';
  (window as any).$ = (window as any).jQuery = jQuery;
  mockSend = jest.fn();
  mockInvoke = jest.fn();
  mockDebug.mockClear();
  (window as any).electron = {
    getBaseDir: () => Promise.resolve(__dirname),
    send: mockSend,
    invoke: mockInvoke,
    on: jest.fn()
  };
});

afterEach(() => {
  jest.resetModules();
  delete (window as any).electron;
  delete (window as any).$;
  delete (window as any).jQuery;
});

function loadModule(): void {
  require('../app/ts/renderer/navigation');
}

test('drop event prevents default and logs debug', () => {
  loadModule();
  const dropEvent = new Event('drop');
  dropEvent.preventDefault = jest.fn();

  document.dispatchEvent(dropEvent);

  expect(dropEvent.preventDefault).toHaveBeenCalled();
  expect(mockDebug).toHaveBeenCalledWith('Preventing drag and drop redirect');
});

test('dragover event prevents default', () => {
  loadModule();
  const dragEvent = new Event('dragover');
  dragEvent.preventDefault = jest.fn();

  document.dispatchEvent(dragEvent);

  expect(dragEvent.preventDefault).toHaveBeenCalled();
});

test('devtools button triggers ipc calls', () => {
  loadModule();

  jQuery('#navButtonDevtools').trigger('click');

  expect(mockInvoke).toHaveBeenCalledWith('app:toggleDevtools');
  expect(mockDebug).toHaveBeenCalledWith('#navButtonDevtools was clicked');
});
