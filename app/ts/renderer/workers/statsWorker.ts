import { parentPort, workerData } from 'worker_threads';

interface WorkerData {
  configPath: string;
  dataDir: string;
}

const { configPath, dataDir } = workerData as WorkerData;

function requestStats(): void {
  parentPort?.postMessage({ type: 'get-stats', configPath, dataDir });
}

parentPort?.on('message', (msg) => {
  if (msg === 'refresh') {
    requestStats();
  } else if (msg && msg.type === 'stats') {
    parentPort?.postMessage(msg.data);
  }
});

requestStats();
