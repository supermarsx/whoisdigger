import { EventEmitter } from 'events';
import path from 'path';
import { pathToFileURL } from 'url';

const emitter = new EventEmitter();

const mkdirMock = jest.fn();
const copyFileMock = jest.fn();
const precompileMock = jest.fn();

jest.mock('watchboy', () => {
  return jest.fn(() => emitter);
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn((...args: any[]) => mkdirMock(...args)),
  copyFileSync: jest.fn((...args: any[]) => copyFileMock(...args))
}));

jest.mock('../scripts/copyRecursive.js', () => ({
  copyRecursiveSync: jest.fn()
}));

jest.mock('../scripts/precompileTemplates.js', () => ({
  precompileTemplates: jest.fn((...args: any[]) => precompileMock(...args))
}));

describe('watch-assets', () => {
  beforeEach(() => {
    mkdirMock.mockClear();
    copyFileMock.mockClear();
    precompileMock.mockClear();
  });

  test('copies changed files into dist/app', async () => {
    await import(pathToFileURL(require.resolve('../scripts/watch-assets.js')).href);

    const src = path.join(__dirname, '..', 'app', 'html', 'mainPanel.html');
    const dest = path.join(__dirname, '..', 'dist', 'app', 'html', 'mainPanel.html');

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    emitter.emit('change', { path: src });
    logSpy.mockRestore();

    expect(mkdirMock).toHaveBeenCalledWith(path.dirname(dest), { recursive: true });
    expect(copyFileMock).toHaveBeenCalledWith(src, dest);
  });

  test("doesn't recompile templates when a template changes", async () => {
    await import(pathToFileURL(require.resolve('../scripts/watch-assets.js')).href);

    precompileMock.mockClear();

    const src = path.join(__dirname, '..', 'app', 'html', 'templates', 'test.hbs');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    emitter.emit('change', { path: src });
    logSpy.mockRestore();

    expect(precompileMock).not.toHaveBeenCalled();
  });
});
