/** @jest-environment jsdom */
import jQuery from 'jquery';

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

jest.mock('../app/ts/common/bridge/bulk.js', () => ({
  bulkWhoisPause: jest.fn(),
  bulkWhoisContinue: jest.fn(),
  bulkWhoisStop: jest.fn(),
}));

import { bindProcessingEvents } from '../app/ts/renderer/bulkwhois/event-bindings';
import { bulkWhoisPause, bulkWhoisContinue } from '../app/ts/common/bridge/bulk.js';

describe('event bindings', () => {
  test('pause button toggles state', () => {
    document.body.innerHTML = `
      <button id="bwProcessingButtonPause" class="is-success">
        <i id="bwProcessingButtonPauseicon" class="fa-pause"></i>
        <span id="bwProcessingButtonPauseSpanText">Pause</span>
      </button>
    `;
    (window as any).$ = (window as any).jQuery = jQuery;

    bindProcessingEvents();
    jQuery('#bwProcessingButtonPause').trigger('click');

    expect(bulkWhoisPause).toHaveBeenCalled();
    expect(jQuery('#bwProcessingButtonPauseSpanText').text()).toBe('Continue');

    (bulkWhoisPause as jest.Mock).mockClear();
    (bulkWhoisContinue as jest.Mock).mockClear();
    jQuery('#bwProcessingButtonPause').trigger('click');
    expect(bulkWhoisContinue).toHaveBeenCalled();
  });
});
