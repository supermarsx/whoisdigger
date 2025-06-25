import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import { parentPort, workerData } from 'worker_threads';

interface WorkerData {
  configPath: string;
  dataDir: string;
}

const { configPath, dataDir } = workerData as WorkerData;

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await dirSize(full);
      } else {
        total += (await fs.promises.stat(full)).size;
      }
    } catch {
      // ignore errors from deleted files
    }
  }
  return total;
}

async function sendStats(): Promise<void> {
  let mtime: number | null = null;
  let loaded = false;
  try {
    const st = await fs.promises.stat(configPath);
    mtime = st.mtimeMs;
    loaded = true;
  } catch {
    loaded = false;
  }
  let size = 0;
  try {
    size = await dirSize(dataDir);
  } catch {
    size = 0;
  }
  parentPort?.postMessage({ mtime, loaded, size, configPath });
}

void sendStats();

const watcher = chokidar.watch([configPath, dataDir], { ignoreInitial: true });
watcher.on('all', () => {
  void sendStats();
});

parentPort?.on('message', (msg) => {
  if (msg === 'refresh') {
    void sendStats();
  }
});
