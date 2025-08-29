import { parentPort, workerData } from 'worker_threads';
import whois from 'whois';
import dns from 'dns/promises';
import fetch from 'node-fetch';

type Task = {
  id: number;
  domain: string;
  type: 'whois' | 'dns' | 'rdap';
  options?: Record<string, unknown>;
};

function lookupPromise(domain: string, options: Record<string, unknown> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    (whois as any).lookup(domain, options, (err: unknown, data: string) => {
      if (err) return reject(err);
      resolve(data);
      return undefined;
    });
  });
}

async function run(task: Task) {
  const start = Date.now();
  try {
    if (task.type === 'whois') {
      const data = await lookupPromise(task.domain, task.options || {});
      parentPort?.postMessage({ ok: true, id: task.id, domain: task.domain, data, ms: Date.now() - start });
      return;
    }
    if (task.type === 'dns') {
      try {
        const servers = await dns.resolve(task.domain, 'NS');
        const has = Array.isArray(servers) && servers.length > 0;
        parentPort?.postMessage({ ok: true, id: task.id, domain: task.domain, has, ms: Date.now() - start });
      } catch (e) {
        parentPort?.postMessage({ ok: false, id: task.id, domain: task.domain, error: String((e as Error).message), ms: Date.now() - start });
      }
      return;
    }
    if (task.type === 'rdap') {
      const endpoints = (task.options?.endpoints as string[]) || ['https://rdap.org/domain/'];
      let lastErr: any = null;
      for (const base of endpoints) {
        try {
          const url = base.endsWith('/') ? `${base}${task.domain}` : `${base}/${task.domain}`;
          const res = await fetch(url);
          const body = await res.text();
          parentPort?.postMessage({ ok: true, id: task.id, domain: task.domain, statusCode: res.status, body, ms: Date.now() - start });
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      parentPort?.postMessage({ ok: false, id: task.id, domain: task.domain, error: String(lastErr || 'RDAP_FAILED'), ms: Date.now() - start });
      return;
    }
    // Unsupported type
    parentPort?.postMessage({ ok: false, id: task.id, domain: task.domain, error: 'UNSUPPORTED_TYPE', ms: Date.now() - start });
  } catch (e) {
    parentPort?.postMessage({ ok: false, id: task.id, domain: task.domain, error: String(e), ms: Date.now() - start });
  }
}

// Support both workerData and postMessage invocation patterns
if (workerData) {
  void run(workerData as Task);
} else {
  parentPort?.on('message', (task: Task) => void run(task));
}
