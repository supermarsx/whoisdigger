import '../test/electronMock';
import { getUserDataPath } from '../app/ts/renderer/settings-renderer';
import DomainStatus from '../app/ts/common/status';
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
    history.addEntry('example.com', DomainStatus.Available);
    const items = history.getHistory(1);
    expect(items[0].domain).toBe('example.com');
    expect(items[0].status).toBe(DomainStatus.Available);
  });

  test('bulk insertion works', () => {
    history.clearHistory();
    history.addEntries([
      { domain: 'a.com', status: DomainStatus.Available },
      { domain: 'b.com', status: DomainStatus.Unavailable }
    ]);
    const items = history.getHistory(2);
    expect(items.length).toBe(2);
  });

  test('clearHistory removes all', () => {
    history.addEntry('c.com', DomainStatus.Error);
    history.clearHistory();
    expect(history.getHistory().length).toBe(0);
  });
});
