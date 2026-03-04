/**
 * Tests for FileStats interface (now inlined in tauriBridge.ts)
 */
import type { FileStats } from '../app/ts/common/tauriBridge.js';

describe('FileStats interface', () => {
  test('FileStats can be constructed with minimal fields', () => {
    const stat: FileStats = { size: 1024 };
    expect(stat.size).toBe(1024);
    expect(stat.mtimeMs).toBeUndefined();
  });

  test('FileStats can include all optional fields', () => {
    const stat: FileStats = {
      size: 2048,
      mtimeMs: Date.now(),
      mtime: '2025-01-01T00:00:00Z',
      atime: new Date(),
      isDirectory: false,
      isFile: true
    };
    expect(stat.size).toBe(2048);
    expect(stat.isFile).toBe(true);
  });

  test('FileStats extends with metadata fields', () => {
    const stat: FileStats = {
      size: 500,
      filename: 'test.txt',
      humansize: '500 B',
      linecount: 10,
      minestimate: '1m',
      maxestimate: '5m',
      filepreview: 'first line...',
      errors: undefined
    };
    expect(stat.filename).toBe('test.txt');
    expect(stat.linecount).toBe(10);
    expect(stat.errors).toBeUndefined();
  });

  test('FileStats with error', () => {
    const stat: FileStats = {
      size: 0,
      errors: 'File not found'
    };
    expect(stat.errors).toBe('File not found');
  });
});
