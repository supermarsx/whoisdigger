/**
 * Tests for "to" (text operations) renderer (app/ts/renderer/to.ts)
 * @jest-environment jsdom
 */

jest.mock('../app/ts/common/logger.js', () => ({
  debugFactory: () => () => {},
  errorFactory: () => () => {},
}));

describe('to renderer', () => {
  let mockInvoke: jest.Mock;

  function setupDOM(): void {
    document.body.innerHTML = `
      <button id="toButtonSelect"></button>
      <button id="toButtonProcess"></button>
      <span id="toFileSelected"></span>
      <input id="toPrefix" type="text" value="" />
      <input id="toSuffix" type="text" value="" />
      <input id="toTrimSpaces" type="checkbox" />
      <input id="toDeleteBlank" type="checkbox" />
      <input id="toDedupe" type="checkbox" />
      <input type="radio" name="toSort" value="none" checked />
      <input type="radio" name="toSort" value="asc" />
      <input type="radio" name="toSort" value="desc" />
      <input type="radio" name="toSort" value="random" />
      <div id="toOutput"></div>
    `;
  }

  beforeEach(() => {
    jest.resetModules();
    mockInvoke = jest.fn();
    (window as any).electron = {
      invoke: mockInvoke,
      send: jest.fn(),
      on: jest.fn(),
    };
    setupDOM();
  });

  afterEach(() => {
    delete (window as any).electron;
    document.body.innerHTML = '';
  });

  function loadModule(): void {
    require('../app/ts/renderer/to.js');
  }

  it('loads without errors', () => {
    expect(() => loadModule()).not.toThrow();
  });

  it('opens file dialog on select button click', async () => {
    mockInvoke.mockResolvedValue('/path/to/file.txt');
    loadModule();

    const btn = document.getElementById('toButtonSelect')!;
    btn.click();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(mockInvoke).toHaveBeenCalledWith('to:input.file');
    expect(document.getElementById('toFileSelected')!.textContent).toBe('/path/to/file.txt');
  });

  it('handles array result from file dialog', async () => {
    mockInvoke.mockResolvedValue(['/path/to/file.txt']);
    loadModule();

    document.getElementById('toButtonSelect')!.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.getElementById('toFileSelected')!.textContent).toBe('/path/to/file.txt');
  });

  it('does nothing on process click if no file selected', async () => {
    loadModule();
    document.getElementById('toButtonProcess')!.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    // Only the potential file-select invoke; process should not fire
    const processCalls = mockInvoke.mock.calls.filter(
      (c: unknown[]) => c[0] === 'to:process'
    );
    expect(processCalls.length).toBe(0);
  });

  it('processes file with options when file selected', async () => {
    mockInvoke
      .mockResolvedValueOnce('/path/to/file.txt') // file dialog
      .mockResolvedValueOnce('processed text'); // process result

    loadModule();

    // Select file first
    document.getElementById('toButtonSelect')!.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Set some options
    (document.getElementById('toPrefix') as HTMLInputElement).value = 'www.';
    (document.getElementById('toTrimSpaces') as HTMLInputElement).checked = true;

    // Click process
    document.getElementById('toButtonProcess')!.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockInvoke).toHaveBeenCalledWith(
      'to:process',
      '/path/to/file.txt',
      expect.objectContaining({ prefix: 'www.', trimSpaces: true })
    );
    expect(document.getElementById('toOutput')!.textContent).toBe('processed text');
  });

  it('collects sort option correctly', async () => {
    mockInvoke
      .mockResolvedValueOnce('/file.txt')
      .mockResolvedValueOnce('sorted');

    loadModule();

    document.getElementById('toButtonSelect')!.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Select ascending sort
    const ascRadio = document.querySelector<HTMLInputElement>('input[value="asc"]')!;
    ascRadio.checked = true;

    document.getElementById('toButtonProcess')!.click();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(mockInvoke).toHaveBeenCalledWith(
      'to:process',
      '/file.txt',
      expect.objectContaining({ sort: 'asc' })
    );
  });
});
