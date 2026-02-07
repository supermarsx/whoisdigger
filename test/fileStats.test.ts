/**
 * Tests for app/ts/common/fileStats.ts — BaseStats and FileStats interfaces
 */
import type { BaseStats, FileStats } from '../app/ts/common/fileStats.js';

describe('FileStats interface', () => {
  test('BaseStats can be constructed with minimal fields', () => {
    const stat: BaseStats = { size: 1024 };
    expect(stat.size).toBe(1024);
    expect(stat.mtimeMs).toBeUndefined();
  });

  test('BaseStats can include all optional fields', () => {
    const stat: BaseStats = {
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

  test('FileStats extends BaseStats with metadata fields', () => {
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
