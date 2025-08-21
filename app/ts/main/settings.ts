import path from 'path';
import fs from 'fs';
import chokidar from 'chokidar';
import { Worker } from 'worker_threads';
import { dirnameCompat } from '../utils/dirnameCompat.js';
import { IpcChannel } from '../common/ipcChannels.js';
import { handle } from './ipc.js';

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
  const workerPath = path.join(baseDir, 'workers', 'statsWorker.js');
  if (!fs.existsSync(workerPath)) {
    // Fall back to direct computation when the worker script is missing
    computeStats(state.configPath, state.dataDir).then((stats) => {
      state.sender.send('stats:update', stats);
    });
    return;
  }
  try {
    state.worker = new Worker(workerPath, {
      workerData: { configPath: state.configPath, dataDir: state.dataDir }
    });
    state.worker.on('message', (msg) => {
      state.sender.send('stats:update', msg);
    });
    state.watcher = chokidar.watch([state.configPath, state.dataDir], { ignoreInitial: true });
    const send = () => {
      state.worker?.postMessage('refresh');
    };
    state.watcher.on('all', send);
    send();
  } catch {
    state.watcher = chokidar.watch([state.configPath, state.dataDir], { ignoreInitial: true });
    const send = async () => {
      state.sender.send('stats:update', await computeStats(state.configPath, state.dataDir));
    };
    state.watcher.on('all', () => {
      void send();
    });
    void send();
  }
}

handle(IpcChannel.StatsStart, async (e, configPath: string, dataDir: string) => {
  const id = ++counter;
  const state: WatchState = { configPath, dataDir, sender: e.sender };
  states.set(id, state);
  launchWorker(state);
  return id;
});

handle(IpcChannel.StatsRefresh, async (e, id: number) => {
  const state = states.get(id);
  if (!state) return;
  if (state.worker) {
    state.worker.postMessage('refresh');
  } else {
    const stats = await computeStats(state.configPath, state.dataDir);
    e.sender.send('stats:update', stats);
  }
});

handle(IpcChannel.StatsStop, (_e, id: number) => {
  const state = states.get(id);
  if (!state) return;
  state.worker?.terminate();
  state.watcher?.close();
  states.delete(id);
});

handle(IpcChannel.StatsGet, async (_e, configPath: string, dataDir: string) => {
  return computeStats(configPath, dataDir);
});
