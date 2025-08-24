import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';

interface WorkerData {
  configPath: string;
  dataDir: string;
}

const { configPath, dataDir } = workerData as WorkerData;

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      try {
        if (entry.isSymbolicLink()) {
          continue;
        }
        if (entry.isDirectory()) {
          total += await dirSize(full);
        } else {
          total += (await fs.promises.lstat(full)).size;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return total;
}

async function computeStats() {
  let mtime: number | null = null;
  let loaded = false;
  let cfgSize = 0;
  let readWrite = false;
  try {
    const st = await fs.promises.stat(configPath);
    mtime = st.mtimeMs;
    cfgSize = st.size;
    loaded = true;
    try {
      await fs.promises.access(configPath, fs.constants.R_OK | fs.constants.W_OK);
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
  return {
    mtime,
    loaded,
    size,
    configPath,
    configSize: cfgSize,
    readWrite,
    dataPath: dataDir
  };
}

async function sendStats() {
  const stats = await computeStats();
  parentPort?.postMessage(stats);
}

parentPort?.on('message', (msg) => {
  if (msg === 'refresh') {
    void sendStats();
  }
});

void sendStats();
