import path from 'path';
import { pathToFileURL } from 'url';

const mkdirMock = jest.fn();
const copyFileMock = jest.fn();
const writeFileMock = jest.fn();

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn((...args: any[]) => mkdirMock(...args)),
  copyFileSync: jest.fn((...args: any[]) => copyFileMock(...args)),
  writeFileSync: jest.fn((...args: any[]) => writeFileMock(...args))
}));

describe('regenerateVendor', () => {
  beforeEach(() => {
    mkdirMock.mockClear();
    copyFileMock.mockClear();
    writeFileMock.mockClear();
  });

  test('copies vendor assets from node_modules', async () => {
    const { regenerateVendor } = await import(
      pathToFileURL(require.resolve('../scripts/regenerateVendor.mjs')).href
    );
    regenerateVendor();

    const rootDir = path.join(__dirname, '..');
    expect(copyFileMock).toHaveBeenCalledWith(
      path.join(rootDir, 'node_modules', 'handlebars', 'dist', 'handlebars.runtime.js'),
      path.join(rootDir, 'app', 'vendor', 'handlebars.runtime.js')
    );
    expect(copyFileMock).toHaveBeenCalledWith(
      path.join(rootDir, 'node_modules', 'jquery', 'dist', 'jquery.js'),
      path.join(rootDir, 'app', 'vendor', 'jquery.js')
    );
    expect(copyFileMock).toHaveBeenCalledWith(
      path.join(rootDir, 'node_modules', '@fortawesome', 'fontawesome-free', 'js', 'all.js'),
      path.join(rootDir, 'app', 'vendor', 'fontawesome.js')
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      path.join(rootDir, 'app', 'vendor', 'handlebars.runtime.d.ts'),
      expect.any(String)
    );
  });
});
