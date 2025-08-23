/** @jest-environment jsdom */
import { on } from '../app/ts/utils/dom';

test('on returns cleanup function that removes listener', () => {
  document.body.innerHTML = '<button id="btn"></button>';
  const handler = jest.fn();
  const off = on('click', '#btn', handler);
  (document.getElementById('btn') as HTMLButtonElement).click();
  expect(handler).toHaveBeenCalledTimes(1);
  off();
  (document.getElementById('btn') as HTMLButtonElement).click();
  expect(handler).toHaveBeenCalledTimes(1);
});
