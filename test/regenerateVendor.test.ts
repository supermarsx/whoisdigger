import path from 'path';
import { pathToFileURL } from 'url';

const mockMkdir = jest.fn();
const mockCopyFile = jest.fn();
const mockWriteFile = jest.fn();

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  mkdirSync: jest.fn((...args: any[]) => mockMkdir(...args)),
  copyFileSync: jest.fn((...args: any[]) => mockCopyFile(...args)),
  writeFileSync: jest.fn((...args: any[]) => mockWriteFile(...args))
}));

describe('regenerateVendor', () => {
  beforeEach(() => {
    mockMkdir.mockClear();
    mockCopyFile.mockClear();
    mockWriteFile.mockClear();
  });

  test('copies vendor assets from node_modules', async () => {
    const { regenerateVendor } = await import(require.resolve('../scripts/regenerateVendor.mjs'));
    regenerateVendor();

    const rootDir = path.join(__dirname, '..');
    expect(mockCopyFile).toHaveBeenCalledWith(
      path.join(rootDir, 'node_modules', 'handlebars', 'dist', 'handlebars.runtime.js'),
      path.join(rootDir, 'app', 'vendor', 'handlebars.runtime.js')
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      path.join(rootDir, 'node_modules', 'jquery', 'dist', 'jquery.js'),
      path.join(rootDir, 'app', 'vendor', 'jquery.js')
    );
    expect(mockCopyFile).toHaveBeenCalledWith(
      path.join(rootDir, 'node_modules', '@fortawesome', 'fontawesome-free', 'js', 'all.js'),
      path.join(rootDir, 'app', 'vendor', 'fontawesome.js')
    );
    expect(mockWriteFile).toHaveBeenCalledWith(
      path.join(rootDir, 'app', 'vendor', 'handlebars.runtime.d.ts'),
      expect.any(String)
    );
  });
});
