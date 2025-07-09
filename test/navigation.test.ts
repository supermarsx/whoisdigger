/** @jest-environment jsdom */

import jQuery from 'jquery';

const debugMock = jest.fn();
jest.mock('../app/ts/common/logger.ts', () => ({
  debugFactory: () => debugMock
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

let sendMock: jest.Mock;
let invokeMock: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '<button id="navButtonDevtools"></button>';
  (window as any).$ = (window as any).jQuery = jQuery;
  sendMock = jest.fn();
  invokeMock = jest.fn();
  debugMock.mockClear();
  (window as any).electron = {
    getBaseDir: () => Promise.resolve(__dirname),
    send: sendMock,
    invoke: invokeMock,
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
  expect(debugMock).toHaveBeenCalledWith('Preventing drag and drop redirect');
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

  expect(invokeMock).toHaveBeenCalledWith('app:toggleDevtools');
  expect(debugMock).toHaveBeenCalledWith('#navButtonDevtools was clicked');
});
