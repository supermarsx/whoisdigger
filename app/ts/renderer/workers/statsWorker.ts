import { parentPort, workerData } from 'worker_threads';
import { debugFactory } from '../../common/logger.js';

const debug = debugFactory('renderer.workers.statsWorker');
debug('loaded');

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
