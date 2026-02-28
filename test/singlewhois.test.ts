/**
 * Tests for singlewhois renderer (app/ts/renderer/singlewhois.ts)
 * @jest-environment jsdom
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

const mockWhoisLookup = jest.fn();
const mockAvailabilityCheck = jest.fn();
const mockDomainParameters = jest.fn();
const mockOpenPath = jest.fn();
const listenHandlers: Record<string, Function> = {};

jest.mock('../app/ts/common/tauriBridge.js', () => ({
  whoisLookup: mockWhoisLookup,
  availabilityCheck: mockAvailabilityCheck,
  domainParameters: mockDomainParameters,
  listen: jest.fn((event: string, cb: Function) => {
    listenHandlers[event] = cb;
  }),
  app: {
    openPath: mockOpenPath,
  },
}));

describe('singlewhois renderer', () => {
  function setupDOM(): void {
    document.body.innerHTML = `
      <input id="singlewhoisSearchInputDomain" type="text" value="example.com" />
      <button id="singlewhoisSearchButtonSearch"></button>
      <div id="singlewhoisMessageWhoisResults" class="is-hidden"></div>
      <div id="singlewhoisMessageUnavailable" class="is-hidden notification"></div>
      <div id="singlewhoisMessageAvailable" class="is-hidden notification"></div>
      <div id="singlewhoisMessageError" class="is-hidden notification"></div>
      <div id="singlewhoisTableWhoisinfo" class="is-hidden"></div>
      <span id="singlewhoisTdDomain" href="#"></span>
      <span id="singlewhoisTdUpdate"></span>
      <span id="singlewhoisTdRegistrar"></span>
      <span id="singlewhoisTdCreation"></span>
      <span id="singlewhoisTdCompany"></span>
      <span id="singlewhoisTdExpiry"></span>
      <div id="singlewhoisDomainCopied"></div>
      <div id="singlewhoisDomainCopiedClose"></div>
      <div id="singlewhoisMessageWhois" class="is-hidden"></div>
      <button class="singlewhoisMessageWhoisOpen"></button>
      <div id="singlewhoisMessageWhoisClose"></div>
    `;
  }

  beforeEach(() => {
    jest.resetModules();
    mockWhoisLookup.mockReset();
    mockAvailabilityCheck.mockReset();
    mockDomainParameters.mockReset();
    mockOpenPath.mockReset();
    Object.keys(listenHandlers).forEach(k => delete listenHandlers[k]);
    setupDOM();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function loadModule(): void {
    require('../app/ts/renderer/singlewhois.js');
  }

  it('loads without errors', () => {
    expect(() => loadModule()).not.toThrow();
  });

  it('registers singlewhois:copied handler', () => {
    loadModule();
    expect(listenHandlers['singlewhois:copied']).toBeDefined();
  });

  it('shows copied modal on singlewhois:copied event', () => {
    loadModule();
    listenHandlers['singlewhois:copied']();
    expect(document.getElementById('singlewhoisDomainCopied')!.classList.contains('is-active')).toBe(true);
  });

  it('triggers search on Enter key', () => {
    loadModule();
    const input = document.getElementById('singlewhoisSearchInputDomain')!;
    const btn = document.getElementById('singlewhoisSearchButtonSearch')!;
    const clickSpy = jest.spyOn(btn, 'dispatchEvent');

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('does not trigger search on non-Enter key', () => {
    loadModule();
    const input = document.getElementById('singlewhoisSearchInputDomain')!;
    const btn = document.getElementById('singlewhoisSearchButtonSearch')!;
    const clickSpy = jest.spyOn(btn, 'dispatchEvent');

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('sends openPath on domain click', () => {
    loadModule();
    const domain = document.getElementById('singlewhoisTdDomain')!;
    domain.setAttribute('url', 'http://example.com');
    domain.click();
    expect(mockOpenPath).toHaveBeenCalledWith('http://example.com');
  });

  it('opens whois reply modal on open click', () => {
    loadModule();
    document.querySelector('.singlewhoisMessageWhoisOpen')!.dispatchEvent(new Event('click'));
    expect(document.getElementById('singlewhoisMessageWhois')!.classList.contains('is-active')).toBe(true);
  });

  it('closes whois reply modal on close click', () => {
    loadModule();
    const modal = document.getElementById('singlewhoisMessageWhois')!;
    modal.classList.add('is-active');
    document.getElementById('singlewhoisMessageWhoisClose')!.click();
    expect(modal.classList.contains('is-active')).toBe(false);
  });

  it('closes copied modal on close click', () => {
    loadModule();
    const modal = document.getElementById('singlewhoisDomainCopied')!;
    modal.classList.add('is-active');
    document.getElementById('singlewhoisDomainCopiedClose')!.click();
    expect(modal.classList.contains('is-active')).toBe(false);
  });

  it('initiates lookup on search button click', async () => {
    mockWhoisLookup.mockResolvedValue('No match for domain example.com');
    mockAvailabilityCheck.mockResolvedValue('available');
    mockDomainParameters.mockResolvedValue({
      domain: 'example.com',
      registrar: null,
      company: null,
      creationDate: null,
      updateDate: null,
      expiryDate: null,
    });

    loadModule();
    const btn = document.getElementById('singlewhoisSearchButtonSearch')!;
    btn.click();

    expect(btn.classList.contains('is-loading')).toBe(true);

    // Wait for async
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  it('prevents double-click while loading', () => {
    loadModule();
    const btn = document.getElementById('singlewhoisSearchButtonSearch')!;
    btn.classList.add('is-loading');
    btn.click();
    // whoisLookup should not be called since already loading
    expect(mockWhoisLookup).not.toHaveBeenCalled();
  });
});
