import path from 'path';
import { Worker } from 'worker_threads';
import { dirnameCompat } from '../../utils/dirnameCompat.js';
import { getSettings } from '../settings-main.js';

const baseDir = dirnameCompat();
const workerPath = path.join(baseDir, 'workers', 'domainWorker.js');

type Task = {
  id: number;
  domain: string;
  type: 'whois' | 'dns' | 'rdap';
  options?: Record<string, unknown>;
};

type Pending = {
  task: Task;
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

const queue: Pending[] = [];
let active = 0;

function limit(): number {
  const n = getSettings().lookupGeneral.concurrency as number | undefined;
  return typeof n === 'number' && n > 0 ? n : 4;
}

function startNext(): void {
  if (active >= limit()) return;
  const next = queue.shift();
  if (!next) return;
  active++;
  const w = new Worker(workerPath, { workerData: next.task });
  let settled = false;
  w.once('message', (msg) => {
    settled = true;
    active--;
    try { w.terminate(); } catch {}
    if (msg && msg.ok) next.resolve(msg);
    else next.resolve(msg); // resolve to allow caller to decide on fallback
    startNext();
  });
  w.once('error', (err) => {
    active--;
    try { w.terminate(); } catch {}
    next.resolve({ ok: false, id: next.task.id, domain: next.task.domain, error: String(err) });
    startNext();
  });
  w.once('exit', (code) => {
    if (!settled) {
      active--;
      next.resolve({ ok: false, id: next.task.id, domain: next.task.domain, error: `EXIT_${code}` });
      startNext();
    }
  });
}

export function runTask(task: Task): Promise<any> {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    startNext();
  });
}

