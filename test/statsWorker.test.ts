import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { Worker } from 'worker_threads';
import fsPromises from 'fs/promises';

jest.setTimeout(120000);

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await dirSize(full);
      } else {
        total += (await fsPromises.stat(full)).size;
      }
    } catch {
      /* ignore */
    }
  }
  return total;
}

async function computeStats(configPath: string, dataDir: string) {
  let mtime: number | null = null;
  let loaded = false;
  let cfgSize = 0;
  let readWrite = false;
  try {
    const st = await fsPromises.stat(configPath);
    mtime = st.mtimeMs;
    cfgSize = st.size;
    loaded = true;
    try {
      await fsPromises.access(configPath, fs.constants.R_OK | fs.constants.W_OK);
      readWrite = true;
    } catch {
      readWrite = false;
    }
  } catch {
    loaded = false;
    cfgSize = 0;
  }
  let size = 0;
  try {
    size = await dirSize(dataDir);
  } catch {
    size = 0;
  }
  return { mtime, loaded, size, configPath, configSize: cfgSize, readWrite, dataPath: dataDir };
}

const workerPath = fs.existsSync(
  path.join(process.cwd(), 'dist', 'renderer', 'workers', 'statsWorker.js')
)
  ? path.join(process.cwd(), 'dist', 'renderer', 'workers', 'statsWorker.js')
  : path.join(process.cwd(), 'dist', 'app', 'ts', 'renderer', 'workers', 'statsWorker.js');

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

  const worker = new Worker(workerPath, {
    workerData: { configPath, dataDir }
  });
  worker.on('message', async (msg) => {
    if (msg.type === 'get-stats') {
      const stats = await computeStats(configPath, dataDir);
      worker.postMessage({ type: 'stats', data: stats });
    }
  });

  const waitForStats = () =>
    new Promise<any>((resolve) => {
      const handler = (msg: any) => {
        if (msg.type !== 'get-stats') {
          worker.off('message', handler);
          resolve(msg);
        }
      };
      worker.on('message', handler);
    });

  const first: any = await waitForStats();

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
  worker.postMessage('refresh');
  const second: any = await waitForStats();
  expect(second.size).toBeGreaterThan(first.size);

  fs.writeFileSync(configPath, 'changed!!!!');
  await new Promise((r) => setTimeout(r, 10));
  worker.postMessage('refresh');
  const third: any = await waitForStats();
  expect(third.configSize).toBeGreaterThanOrEqual(first.configSize);

  await worker.terminate();
});
