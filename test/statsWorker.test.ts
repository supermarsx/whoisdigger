import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { Worker } from 'worker_threads';

jest.setTimeout(60000);

const workerPath = path.join(
  process.cwd(),
  'dist',
  'app',
  'ts',
  'renderer',
  'workers',
  'statsWorker.js'
);

beforeAll(() => {
  if (!fs.existsSync(workerPath)) {
    execSync('npx tsc', { stdio: 'inherit' });
  }
});

test('statsWorker reports stats and updates on file changes', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stats-'));
  const dataDir = path.join(tmpRoot, 'data');
  fs.mkdirSync(dataDir);
  const configPath = path.join(tmpRoot, 'config.json');
  fs.writeFileSync(configPath, 'initial');

  const workerPath = path.join(
    process.cwd(),
    'dist',
    'app',
    'ts',
    'renderer',
    'workers',
    'statsWorker.js'
  );
  const worker = new Worker(workerPath, {
    workerData: { configPath, dataDir }
  });

  const first: any = await new Promise((resolve) => worker.once('message', resolve));

  expect(first).toEqual(
    expect.objectContaining({
      loaded: true,
      configPath,
      dataPath: dataDir
    })
  );
  expect(typeof first.size).toBe('number');
  expect(typeof first.configSize).toBe('number');
  expect(typeof first.mtime).toBe('number');
  expect(first.readWrite).toBe(true);

  fs.writeFileSync(path.join(dataDir, 'file.txt'), 'hello');
  const second: any = await new Promise((resolve) => worker.once('message', resolve));
  expect(second.size).toBeGreaterThan(first.size);

  fs.writeFileSync(configPath, 'changed!!!!');
  const third: any = await new Promise((resolve) => worker.once('message', resolve));
  expect(third.configSize).toBeGreaterThan(first.configSize);

  await worker.terminate();
});
