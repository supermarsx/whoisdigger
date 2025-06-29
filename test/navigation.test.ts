/** @jest-environment jsdom */

import jQuery from 'jquery';

let invokeMock: jest.Mock;
let sendMock: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = `
    <button id="navButtonDevtools"></button>
    <button id="navButtonExit"></button>
    <div id="appModalExit" class="modal"><button id="appModalExitButtonNo"></button></div>
  `;
  (window as any).$ = (window as any).jQuery = jQuery;
  invokeMock = jest.fn().mockResolvedValue(undefined);
  sendMock = jest.fn();
  (window as any).electron = {
    invoke: invokeMock,
    send: sendMock,
    on: jest.fn()
  };
});

afterEach(() => {
  delete (window as any).electron;
  delete (window as any).$;
  delete (window as any).jQuery;
});

function loadModule(confirmExit = true): { settings: any } {
  const settingsModule = require('../app/ts/common/settings');
  settingsModule.settings.ui = { ...(settingsModule.settings.ui || {}), confirmExit };
  require('../app/ts/renderer/navigation');
  jQuery.ready();
  return settingsModule;
}

test('clicking devtools invokes toggle IPC', () => {
  loadModule();
  jQuery('#navButtonDevtools').trigger('click');

  expect(invokeMock).toHaveBeenCalledWith('app:toggleDevtools');
  expect(sendMock).toHaveBeenCalledWith('app:debug', '#navButtonDevtools was clicked');
});

test('exit button invokes close when confirmExit disabled', () => {
  loadModule(false);
  jQuery('#navButtonExit').trigger('click');

  expect(invokeMock).toHaveBeenCalledWith('app:close');
});

test('exit button shows modal when confirmExit enabled', () => {
  loadModule(true);
  jQuery('#navButtonExit').trigger('click');

  expect(invokeMock).not.toHaveBeenCalled();
  expect(jQuery('#appModalExit').hasClass('is-active')).toBe(true);
});

test('ESC key hides exit modal', () => {
  loadModule(true);
  jQuery('#appModalExit').addClass('is-active');

  const esc = new KeyboardEvent('keyup', { keyCode: 27 });
  document.dispatchEvent(esc);

  expect(jQuery('#appModalExit').hasClass('is-active')).toBe(false);
  expect(sendMock).toHaveBeenCalledWith(
    'app:debug',
    expect.stringContaining('Hotkey, Used [ESC] key')
  );
  expect(sendMock).toHaveBeenCalledWith('app:debug', '#appModalExitButtonNo was clicked');
});
