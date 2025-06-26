import '../test/electronMock';
import { getUserDataPath } from '../app/ts/common/settings';
import * as fs from 'fs';
import * as path from 'path';

declare const afterAll: any; // for types

describe('history module', () => {
  const dbFile = 'test-history.sqlite';
  let history: typeof import('../app/ts/common/history');

  beforeAll(async () => {
    process.env.HISTORY_DB_PATH = dbFile;
    history = await import('../app/ts/common/history');
    history.clearHistory();
  });

  afterAll(() => {
    history.closeHistory();
    delete process.env.HISTORY_DB_PATH;
    const p = path.resolve(getUserDataPath(), dbFile);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  test('stores and retrieves an entry', () => {
    history.addEntry('example.com', 'available');
    const items = history.getHistory(1);
    expect(items[0].domain).toBe('example.com');
    expect(items[0].status).toBe('available');
  });

  test('bulk insertion works', () => {
    history.clearHistory();
    history.addEntries([
      { domain: 'a.com', status: 'available' },
      { domain: 'b.com', status: 'unavailable' }
    ]);
    const items = history.getHistory(2);
    expect(items.length).toBe(2);
  });

  test('clearHistory removes all', () => {
    history.addEntry('c.com', 'error');
    history.clearHistory();
    expect(history.getHistory().length).toBe(0);
  });
});
