import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import { Worker } from 'worker_threads';
import { dirnameCompat } from '../utils/dirnameCompat.js';

interface WatchState {
  worker?: Worker;
  watcher?: chokidar.FSWatcher;
  configPath: string;
  dataDir: string;
  sender: Electron.WebContents;
}

const states = new Map<number, WatchState>();
let counter = 0;
const baseDir = dirnameCompat();

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

function launchWorker(state: WatchState) {
  const workerPath = path.join(baseDir, '..', 'renderer', 'workers', 'statsWorker.js');
  if (!fs.existsSync(workerPath)) {
    // Fall back to direct computation when the worker script is missing
    computeStats(state.configPath, state.dataDir).then((stats) => {
      state.sender.send('settings:stats', stats);
    });
    return;
  }
  try {
    state.worker = new Worker(workerPath, {
      workerData: { configPath: state.configPath, dataDir: state.dataDir }
    });
    state.worker.on('message', async (msg) => {
      if (msg && msg.type === 'get-stats') {
        const stats = await computeStats(state.configPath, state.dataDir);
        state.worker?.postMessage({ type: 'stats', data: stats });
        state.sender.send('settings:stats', stats);
      } else {
        state.sender.send('settings:stats', msg);
      }
    });
    state.watcher = chokidar.watch([state.configPath, state.dataDir], { ignoreInitial: true });
    const send = async () => {
      const stats = await computeStats(state.configPath, state.dataDir);
      state.worker?.postMessage({ type: 'stats', data: stats });
      state.sender.send('settings:stats', stats);
    };
    state.watcher.on('all', () => {
      void send();
    });
    void send();
  } catch {
    state.watcher = chokidar.watch([state.configPath, state.dataDir], { ignoreInitial: true });
    const send = async () => {
      state.sender.send('settings:stats', await computeStats(state.configPath, state.dataDir));
    };
    state.watcher.on('all', () => {
      void send();
    });
    void send();
  }
}

ipcMain.handle('settings:start-stats', async (e, configPath: string, dataDir: string) => {
  const id = ++counter;
  const state: WatchState = { configPath, dataDir, sender: e.sender };
  states.set(id, state);
  launchWorker(state);
  return id;
});

ipcMain.handle('settings:refresh-stats', async (e, id: number) => {
  const state = states.get(id);
  if (!state) return;
  if (state.worker) {
    state.worker.postMessage('refresh');
  } else {
    const stats = await computeStats(state.configPath, state.dataDir);
    e.sender.send('settings:stats', stats);
  }
});

ipcMain.handle('settings:stop-stats', (_e, id: number) => {
  const state = states.get(id);
  if (!state) return;
  state.worker?.terminate();
  state.watcher?.close();
  states.delete(id);
});

ipcMain.handle('settings:get-stats', async (_e, configPath: string, dataDir: string) => {
  return computeStats(configPath, dataDir);
});
