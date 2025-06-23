/** @jest-environment jsdom */

import jQuery from 'jquery';
const auxiliary = require('../app/ts/renderer/bw/auxiliary');
const { tableReset, getExportOptions, setExportOptions } = auxiliary;

beforeAll(() => {
  (window as any).$ = (window as any).jQuery = jQuery;
});

describe('bw auxiliary', () => {
  describe('tableReset', () => {
    test('clears counters and sets total', () => {
      document.body.innerHTML = `
        <span id="bwProcessingSpanProcessed">5</span>
        <span id="bwProcessingSpanWaiting">2</span>
        <span id="bwProcessingSpanTotal">1</span>
        <span id="bwProcessingSpanStatusavailable">3</span>
        <span id="bwProcessingSpanStatusunavailable">4</span>
        <span id="bwProcessingSpanStatuserror">1</span>
      `;

      tableReset(2, 3);

      expect(jQuery('#bwProcessingSpanProcessed').text()).toBe('0');
      expect(jQuery('#bwProcessingSpanWaiting').text()).toBe('0');
      expect(jQuery('#bwProcessingSpanTotal').text()).toBe('6');
      expect(jQuery('#bwProcessingSpanStatusavailable').text()).toBe('0');
      expect(jQuery('#bwProcessingSpanStatusunavailable').text()).toBe('0');
      expect(jQuery('#bwProcessingSpanStatuserror').text()).toBe('0');
    });
  });

  describe('getExportOptions', () => {
    test('reads options from DOM', () => {
      document.body.innerHTML = `
        <select id="bwExportSelectFiletype"><option value="csv">CSV</option><option value="txt">TXT</option></select>
        <select id="bwExportSelectDomains"><option value="available">A</option><option value="both">B</option></select>
        <select id="bwExportSelectErrors"><option value="yes">Y</option><option value="no">N</option></select>
        <select id="bwExportSelectInformation">
          <option value="domain">D</option>
          <option value="domain+basic">DB</option>
          <option value="domain+basic+debug">DBD</option>
        </select>
        <select id="bwExportSelectReply">
          <option value="no">N</option>
          <option value="yes">Y</option>
          <option value="yes+block">YB</option>
        </select>
      `;
      jQuery('#bwExportSelectFiletype').val('csv');
      jQuery('#bwExportSelectDomains').val('available');
      jQuery('#bwExportSelectErrors').val('yes');
      jQuery('#bwExportSelectInformation').val('domain');
      jQuery('#bwExportSelectReply').val('no');

      const opts = getExportOptions();
      expect(opts).toEqual({
        filetype: 'csv',
        domains: 'available',
        errors: 'yes',
        information: 'domain',
        whoisreply: 'no'
      });
    });
  });

  describe('setExportOptions presets', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <select id="bwExportSelectFiletype"><option value="csv">CSV</option><option value="txt">TXT</option></select>
        <select id="bwExportSelectDomains"><option value="available">A</option><option value="both">B</option></select>
        <select id="bwExportSelectErrors"><option value="yes">Y</option><option value="no">N</option></select>
        <select id="bwExportSelectInformation">
          <option value="domain">D</option>
          <option value="domain+basic">DB</option>
          <option value="domain+basic+debug">DBD</option>
        </select>
        <select id="bwExportSelectReply">
          <option value="no">N</option>
          <option value="yes">Y</option>
          <option value="yes+block">YB</option>
        </select>
      `;
      jQuery('select').prop('disabled', false);
      jQuery('#bwExportSelectFiletype').val('csv');
    });

    test('import preset locks fields and sets values', () => {
      setExportOptions('import');

      expect(jQuery('#bwExportSelectFiletype').val()).toBe('csv');
      expect(jQuery('#bwExportSelectDomains').val()).toBe('both');
      expect(jQuery('#bwExportSelectErrors').val()).toBe('yes');
      expect(jQuery('#bwExportSelectInformation').val()).toBe('domain+basic+debug');
      expect(jQuery('#bwExportSelectReply').val()).toBe('yes+block');
      jQuery('select').each((_: number, el: HTMLElement) => {
        expect(jQuery(el).prop('disabled')).toBe(true);
      });
    });

    test('none preset unlocks locked fields', () => {
      setExportOptions('import');
      setExportOptions('none');

      jQuery('select').each((_: number, el: HTMLElement) => {
        expect(jQuery(el).prop('disabled')).toBe(false);
      });
    });

    test('availableonly preset sets expected values', () => {
      setExportOptions('availableonly');

      expect(jQuery('#bwExportSelectDomains').val()).toBe('available');
      expect(jQuery('#bwExportSelectErrors').val()).toBe('no');
      expect(jQuery('#bwExportSelectInformation').val()).toBe('domain');
      expect(jQuery('#bwExportSelectReply').val()).toBe('no');
      jQuery('select').each((_: number, el: HTMLElement) => {
        expect(jQuery(el).prop('disabled')).toBe(false);
      });
    });

    test('allbutnoreply preset sets expected values', () => {
      setExportOptions('allbutnoreply');

      expect(jQuery('#bwExportSelectDomains').val()).toBe('both');
      expect(jQuery('#bwExportSelectErrors').val()).toBe('yes');
      expect(jQuery('#bwExportSelectInformation').val()).toBe('domain+basic');
      expect(jQuery('#bwExportSelectReply').val()).toBe('no');
      jQuery('select').each((_: number, el: HTMLElement) => {
        expect(jQuery(el).prop('disabled')).toBe(false);
      });
    });
  });
});

