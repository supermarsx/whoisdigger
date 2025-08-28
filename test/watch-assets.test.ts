import { EventEmitter } from 'events';
import path from 'path';
import { pathToFileURL } from 'url';

const mockEmitter = new EventEmitter();

const mockMkdir = jest.fn();
const mockCopyFile = jest.fn();
const mockPrecompile = jest.fn();

jest.mock('watchboy', () => {
  return jest.fn(() => mockEmitter);
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn((...args: any[]) => mockMkdir(...args)),
  copyFileSync: jest.fn((...args: any[]) => mockCopyFile(...args))
}));

jest.mock('../scripts/copyRecursive.js', () => ({
  copyRecursiveSync: jest.fn()
}));

jest.mock('../scripts/precompileTemplates.js', () => ({
  precompileTemplates: jest.fn((...args: any[]) => mockPrecompile(...args))
}));

describe('watch-assets', () => {
  beforeEach(() => {
    mockMkdir.mockClear();
    mockCopyFile.mockClear();
    mockPrecompile.mockClear();
  });

  test('copies changed files into dist/app', async () => {
    await import(require.resolve('../scripts/watch-assets.js'));

    const src = path.join(__dirname, '..', 'app', 'html', 'mainPanel.html');
    const dest = path.join(__dirname, '..', 'dist', 'app', 'html', 'mainPanel.html');

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockEmitter.emit('change', { path: src });
    logSpy.mockRestore();

    expect(mockMkdir).toHaveBeenCalledWith(path.dirname(dest), { recursive: true });
    expect(mockCopyFile).toHaveBeenCalledWith(src, dest);
  });

  test("doesn't recompile templates when a template changes", async () => {
    await import(require.resolve('../scripts/watch-assets.js'));

    mockPrecompile.mockClear();

    const src = path.join(__dirname, '..', 'app', 'html', 'templates', 'test.hbs');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockEmitter.emit('change', { path: src });
    logSpy.mockRestore();

    expect(mockPrecompile).not.toHaveBeenCalled();
  });
});
