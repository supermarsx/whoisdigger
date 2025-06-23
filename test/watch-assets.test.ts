import { EventEmitter } from 'events';
import path from 'path';

const emitter = new EventEmitter();

const mkdirMock = jest.fn();
const copyFileMock = jest.fn();

jest.mock('watchboy', () => {
  return jest.fn(() => emitter);
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn((...args: any[]) => mkdirMock(...args)),
  copyFileSync: jest.fn((...args: any[]) => copyFileMock(...args)),
}));

jest.mock('../scripts/copyRecursive', () => ({
  copyRecursiveSync: jest.fn(),
}));

describe('watch-assets', () => {
  beforeEach(() => {
    mkdirMock.mockClear();
    copyFileMock.mockClear();
  });

  test('copies changed files into dist/app', () => {
    jest.isolateModules(() => {
      require('../watch-assets');
    });

    const src = path.join(__dirname, '..', 'app', 'html', 'index.html');
    const dest = path.join(__dirname, '..', 'dist', 'app', 'html', 'index.html');

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    emitter.emit('change', { path: src });
    logSpy.mockRestore();

    expect(mkdirMock).toHaveBeenCalledWith(path.dirname(dest), { recursive: true });
    expect(copyFileMock).toHaveBeenCalledWith(src, dest);
  });
});
