import express, { Request, Response } from 'express';
import { lookup } from '../common/lookup.js';
import { lookupDomains, CliOptions } from '../cli.js';
import { debugFactory } from '../common/logger.js';

const debug = debugFactory('server');

export function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/lookup', async (req: Request, res: Response) => {
    const domain = req.body?.domain;
    if (!domain || typeof domain !== 'string') {
      res.status(400).json({ error: 'domain required' });
      return;
    }
    try {
      const result = await lookup(domain);
      res.json({ result });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/bulk-lookup', async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const opts: CliOptions = {
      domains: Array.isArray(body.domains) ? body.domains : [],
      tlds: Array.isArray(body.tlds) ? body.tlds : ['com'],
      proxy: typeof body.proxy === 'string' ? body.proxy : undefined,
      format: 'txt'
    };
    try {
      const result = await lookupDomains(opts);
      res.json({ result });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return app;
}

if (process.argv[1] && process.argv[1].endsWith('server/index.js')) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    debug(`Server listening on port ${port}`);
  });
}
