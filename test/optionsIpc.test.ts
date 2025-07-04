import './electronMainMock';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ipcMainHandlers } from './electronMainMock';

jest.isolateModules(() => {
  require('../app/ts/main/settings');
});

const getHandler = (c: string) => ipcMainHandlers[c];

describe('settings IPC handlers', () => {
  test('settings:get-stats returns file stats', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opt-'));
    const dataDir = path.join(root, 'data');
    fs.mkdirSync(dataDir);
    const cfg = path.join(root, 'config.json');
    fs.writeFileSync(cfg, 'cfg');

    const handler = getHandler('settings:get-stats');
    const stats = await handler({}, cfg, dataDir);

    expect(stats).toEqual(expect.objectContaining({ configPath: cfg, dataPath: dataDir }));
  });
});
