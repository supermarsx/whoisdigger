import express, { Request, Response } from 'express';
import { lookup } from '../common/lookup';
import { lookupDomains, CliOptions } from '../cli';
import { fileURLToPath } from 'url';

export function createServer() {
  const app = express();
  app.use(express.json());

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

let moduleUrl: string | undefined;
try {
  // Avoid syntax errors in CommonJS environments
  moduleUrl = eval('import.meta.url') as string;
} catch {
  moduleUrl = undefined;
}

if (moduleUrl && process.argv[1] === fileURLToPath(moduleUrl)) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
