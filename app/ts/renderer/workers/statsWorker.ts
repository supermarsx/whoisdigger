import { parentPort, workerData } from 'worker_threads';

const electron = (global as any).electron ?? (global as any).window?.electron;

const useElectron = !!electron;

let fsPromises: {
  readdir: (p: string, opts?: any) => Promise<any>;
  stat: (p: string) => Promise<any>;
  access: (p: string, mode?: number) => Promise<any>;
};
let pathJoin: (...args: string[]) => string;
let watchFn: (p: string, opts: any, cb: (evt: string) => void) => Promise<{ close: () => void }>;
let rwMode = 6;

if (useElectron) {
  fsPromises = {
    readdir: electron.readdir,
    stat: electron.stat,
    access: electron.access
  };
  pathJoin = (...args: string[]) => electron.path.join(...args);
  watchFn = electron.watch;
} else {
  const fsMod = await import('fs');
  const pathMod = await import('path');
  fsPromises = fsMod.promises;
  pathJoin = (...args: string[]) => pathMod.join(...args);
  watchFn = async (p: string, opts: any, cb: (evt: string) => void) => {
    const watcher = fsMod.watch(p, opts, cb);
    return { close: () => watcher.close() };
  };
  rwMode = fsMod.constants.R_OK | fsMod.constants.W_OK;
}

interface WorkerData {
  configPath: string;
  dataDir: string;
}

const { configPath, dataDir } = workerData as WorkerData;

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  const entries = await fsPromises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = pathJoin(dir, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await dirSize(full);
      } else {
        const st = await fsPromises.stat(full);
        total += st.size;
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
  let cfgSize = 0;
  let readWrite = false;
  try {
    const st = await fsPromises.stat(configPath);
    mtime = st.mtimeMs;
    cfgSize = st.size;
    loaded = true;
    try {
      await fsPromises.access(configPath, rwMode);
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
  parentPort?.postMessage({
    mtime,
    loaded,
    size,
    configPath,
    configSize: cfgSize,
    readWrite,
    dataPath: dataDir
  });
}

void sendStats();

let watchers: { close: () => void }[] = [];
(async () => {
  watchers = [
    await watchFn(configPath, { persistent: false }, () => {
      void sendStats();
    }),
    await watchFn(dataDir, { persistent: false, recursive: true }, () => {
      void sendStats();
    })
  ];
})();

parentPort?.on('message', (msg) => {
  if (msg === 'refresh') {
    void sendStats();
  }
});
